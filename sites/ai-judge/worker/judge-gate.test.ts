import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiJudgeEnv } from './env'
import {
  authorizeIdentity,
  budgetRatio,
  cancelReservation,
  cleanExpiredReservations,
  dateKeyUTC8,
  DAILY_IDENTITY_LIMIT,
  emptyGateState,
  JudgeGate,
  parseBudgetFen,
  reserveBudget,
  RESERVATION_TTL_MS,
  settleReservation,
  type GateState,
} from './judge-gate'

/** 内存版 DurableObjectState：storage 持久、blockConcurrencyWhile 直执行。 */
function fakeCtx(storage = new Map<string, unknown>()) {
  return {
    storage: {
      get: async <T>(key: string): Promise<T | undefined> =>
        storage.has(key) ? (structuredClone(storage.get(key)) as T) : undefined,
      put: async (key: string, value: unknown): Promise<void> => {
        storage.set(key, structuredClone(value))
      },
    },
    blockConcurrencyWhile: async <T>(callback: () => T | Promise<T>): Promise<T> => callback(),
    waitUntil: () => {},
  } as unknown as DurableObjectState
}

function makeGate(env: Partial<AiJudgeEnv> = {}, storage = new Map<string, unknown>()) {
  return new JudgeGate(fakeCtx(storage), env as AiJudgeEnv, )
}

// 构造器签名：shim 的 DurableObject 只接收 (ctx, env)
const NOW = Date.parse('2026-08-09T04:00:00Z') // 北京时间 2026-08-09 12:00

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('纯状态逻辑', () => {
  it('同一身份每日只允许 3 次', () => {
    const state = emptyGateState()
    for (let i = 0; i < DAILY_IDENTITY_LIMIT; i += 1) {
      expect(authorizeIdentity(state, 'identity-a')).toEqual({ ok: true })
    }
    expect(authorizeIdentity(state, 'identity-a')).toEqual({ ok: false, reason: 'rate_limited' })
    // 不同身份互不影响
    expect(authorizeIdentity(state, 'identity-b')).toEqual({ ok: true })
    // 被拒的请求也计入请求总数
    expect(state.requestCount).toBe(DAILY_IDENTITY_LIMIT + 2)
  })

  it('并发预留不超预算上限', () => {
    const state = emptyGateState()
    const first = reserveBudget(state, 60, 100, NOW, 'r1')
    const second = reserveBudget(state, 50, 100, NOW, 'r2')
    expect(first.ok).toBe(true)
    expect(second).toMatchObject({ ok: false, reason: 'budget_paused' })
    // 边界相等允许：60 + 40 = 100
    expect(reserveBudget(state, 40, 100, NOW, 'r3').ok).toBe(true)
    expect(reserveBudget(state, 1, 100, NOW, 'r4')).toMatchObject({ reason: 'budget_paused' })
  })

  it('settle 以实际成本替换预留', () => {
    const state = emptyGateState()
    const reserve = reserveBudget(state, 60, 100, NOW, 'r1')
    expect(reserve.ok).toBe(true)
    expect(state.reservedFen).toBe(60)
    settleReservation(state, 'r1', 25)
    expect(state.reservedFen).toBe(0)
    expect(state.spentFen).toBe(25)
    // 结算后可再预留剩余额度
    expect(reserveBudget(state, 75, 100, NOW, 'r2').ok).toBe(true)
    expect(reserveBudget(state, 1, 100, NOW, 'r3')).toMatchObject({ reason: 'budget_paused' })
  })

  it('cancel 只释放预算、不回退身份次数', () => {
    const state = emptyGateState()
    for (let i = 0; i < DAILY_IDENTITY_LIMIT; i += 1) authorizeIdentity(state, 'identity-a')
    const reserve = reserveBudget(state, 80, 100, NOW, 'r1')
    expect(reserve.ok).toBe(true)
    cancelReservation(state, 'r1')
    expect(state.reservedFen).toBe(0)
    expect(state.spentFen).toBe(0)
    expect(authorizeIdentity(state, 'identity-a')).toEqual({ ok: false, reason: 'rate_limited' })
  })

  it('超过 15 分钟的预留在下一次清理时释放', () => {
    const state = emptyGateState()
    expect(reserveBudget(state, 90, 100, NOW, 'r1').ok).toBe(true)
    expect(reserveBudget(state, 20, 100, NOW, 'r2')).toMatchObject({ reason: 'budget_paused' })
    cleanExpiredReservations(state, NOW + RESERVATION_TTL_MS + 1)
    expect(state.reservedFen).toBe(0)
    expect(reserveBudget(state, 20, 100, NOW + RESERVATION_TTL_MS + 1, 'r3').ok).toBe(true)
  })

  it('budgetRatio 反映已花与预留之和', () => {
    const state = emptyGateState()
    state.spentFen = 30
    state.reservedFen = 50
    expect(budgetRatio(state, 100)).toBe(0.8)
    expect(budgetRatio(state, 0)).toBe(1)
  })

  it('dateKeyUTC8 按北京时间切日', () => {
    // UTC 2026-08-08 15:59 → 北京 2026-08-08 23:59
    expect(dateKeyUTC8(Date.parse('2026-08-08T15:59:00Z'))).toBe('2026-08-08')
    // UTC 2026-08-08 16:01 → 北京 2026-08-09 00:01
    expect(dateKeyUTC8(Date.parse('2026-08-08T16:01:00Z'))).toBe('2026-08-09')
  })

  it('parseBudgetFen 拒绝非法值并回退默认预算', () => {
    expect(parseBudgetFen('5000')).toBe(5000)
    expect(parseBudgetFen(undefined)).toBe(5000)
    expect(parseBudgetFen('abc')).toBe(5000)
    expect(parseBudgetFen('-1')).toBe(5000)
  })
})

describe('JudgeGate DO', () => {
  it('storage 重启后状态保留', async () => {
    const storage = new Map<string, unknown>()
    const env = { AI_DAILY_BUDGET_FEN: '100' } as AiJudgeEnv

    const first = new JudgeGate(fakeCtx(storage), env)
    for (let i = 0; i < DAILY_IDENTITY_LIMIT; i += 1) {
      expect(await first.authorize('identity-a')).toEqual({ ok: true })
    }
    // 模拟 DO 重启：新实例共享同一 storage
    const second = new JudgeGate(fakeCtx(storage), env)
    expect(await second.authorize('identity-a')).toEqual({ ok: false, reason: 'rate_limited' })
  })

  it('预算预留与熔断全流程', async () => {
    const gate = makeGate({ AI_DAILY_BUDGET_FEN: '100' })
    const reserve = await gate.reserveBudget(80)
    expect(reserve).toMatchObject({ ok: true, budgetRatio: 0.8 })

    const refused = await gate.reserveBudget(30)
    expect(refused).toMatchObject({ ok: false, reason: 'budget_paused' })

    if (!reserve.ok) throw new Error('expected ok')
    await gate.settle(reserve.reservationId, 40)
    const again = await gate.reserveBudget(60)
    expect(again.ok).toBe(true)
  })

  it('cancel 后可再预留', async () => {
    const gate = makeGate({ AI_DAILY_BUDGET_FEN: '100' })
    const reserve = await gate.reserveBudget(90)
    expect(reserve.ok).toBe(true)
    if (!reserve.ok) throw new Error('expected ok')
    await gate.cancel(reserve.reservationId)
    expect((await gate.reserveBudget(90)).ok).toBe(true)
  })

  it('80% 告警只发一次，且只携带运营信号', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const gate = makeGate({ AI_DAILY_BUDGET_FEN: '100', AI_ALERT_WEBHOOK_URL: 'https://alert.example/hook' })
    await gate.authorize('identity-a')
    await gate.reserveBudget(80)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toHaveProperty('date')
    expect(body.budgetRatio).toBe(0.8)
    expect(body.requestCount).toBe(1)
    expect(JSON.stringify(body)).not.toContain('identity-a')

    // 再次越过阈值不重复告警
    await gate.settle('whatever', 0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('webhook 失败时保持可重试', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const gate = makeGate({ AI_DAILY_BUDGET_FEN: '100', AI_ALERT_WEBHOOK_URL: 'https://alert.example/hook' })
    await gate.reserveBudget(80)
    await gate.settle('whatever', 0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
