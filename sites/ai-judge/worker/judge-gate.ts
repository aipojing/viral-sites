import { DurableObject } from 'cloudflare:workers'
import type { AiJudgeEnv } from './env'

export type AuthorizeResult = { ok: true } | { ok: false; reason: 'rate_limited' }

export type ReserveResult =
  | { ok: true; reservationId: string; budgetRatio: number }
  | { ok: false; reason: 'budget_paused'; budgetRatio: number }

/** 每个身份每日最多 3 次（cache 命中也占次数，见 api 编排）。 */
export const DAILY_IDENTITY_LIMIT = 3
/** 预留 15 分钟未结算视为过期，下一次请求时清理。 */
export const RESERVATION_TTL_MS = 15 * 60 * 1000
/** 未显式配置预算时的默认日预算：¥50 = 5000 分。 */
export const DEFAULT_DAILY_BUDGET_FEN = 5000

export interface GateReservation {
  reservedFen: number
  expiresAt: number
}

export interface GateState {
  spentFen: number
  reservedFen: number
  requestCount: number
  identityCounts: Record<string, number>
  reservations: Record<string, GateReservation>
  alerted80: boolean
}

export function emptyGateState(): GateState {
  return {
    spentFen: 0,
    reservedFen: 0,
    requestCount: 0,
    identityCounts: {},
    reservations: {},
    alerted80: false,
  }
}

/** 北京时间（UTC+8）日期键，跨日即换 DO 实例，身份次数自然失效。 */
export function dateKeyUTC8(now: number): string {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function parseBudgetFen(raw: string | undefined): number {
  const value = Number(raw ?? '')
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_DAILY_BUDGET_FEN
  return Math.floor(value)
}

export function budgetRatio(state: GateState, budgetFen: number): number {
  if (budgetFen <= 0) return 1
  return Math.min((state.spentFen + state.reservedFen) / budgetFen, 1)
}

/** 过期预留只释放预算，不回退身份次数。 */
export function cleanExpiredReservations(state: GateState, now: number): void {
  for (const [id, reservation] of Object.entries(state.reservations)) {
    if (reservation.expiresAt <= now) {
      state.reservedFen = Math.max(0, state.reservedFen - reservation.reservedFen)
      delete state.reservations[id]
    }
  }
}

export function authorizeIdentity(state: GateState, identityHash: string): AuthorizeResult {
  state.requestCount += 1
  const used = state.identityCounts[identityHash] ?? 0
  if (used >= DAILY_IDENTITY_LIMIT) return { ok: false, reason: 'rate_limited' }
  state.identityCounts[identityHash] = used + 1
  return { ok: true }
}

export function reserveBudget(
  state: GateState,
  maxCostFen: number,
  budgetFen: number,
  now: number,
  reservationId: string,
): ReserveResult {
  cleanExpiredReservations(state, now)
  const ratio = budgetRatio(state, budgetFen)
  if (state.spentFen + state.reservedFen + maxCostFen > budgetFen) {
    return { ok: false, reason: 'budget_paused', budgetRatio: ratio }
  }
  state.reservedFen += maxCostFen
  state.reservations[reservationId] = {
    reservedFen: maxCostFen,
    expiresAt: now + RESERVATION_TTL_MS,
  }
  return { ok: true, reservationId, budgetRatio: budgetRatio(state, budgetFen) }
}

/** 以实际成本替换预留：释放预留额度，计入实际支出。 */
export function settleReservation(state: GateState, reservationId: string, actualCostFen: number): void {
  const reservation = state.reservations[reservationId]
  if (!reservation) return
  state.reservedFen = Math.max(0, state.reservedFen - reservation.reservedFen)
  delete state.reservations[reservationId]
  state.spentFen += Math.max(0, Math.floor(actualCostFen))
}

/** 取消只释放预算，不影响身份次数。 */
export function cancelReservation(state: GateState, reservationId: string): void {
  const reservation = state.reservations[reservationId]
  if (!reservation) return
  state.reservedFen = Math.max(0, state.reservedFen - reservation.reservedFen)
  delete state.reservations[reservationId]
}

const STATE_KEY = 'gate-state'

/**
 * 每日一个实例（idFromName(dateKeyUTC8)），原子管理当日预算预留与身份次数。
 * 所有读写经 blockConcurrencyWith 串行化，storage 持久化保证重启不丢状态。
 */
export class JudgeGate extends DurableObject<AiJudgeEnv> {
  async authorize(identityHash: string): Promise<AuthorizeResult> {
    return this.withState((state) => authorizeIdentity(state, identityHash))
  }

  async reserveBudget(maxCostFen: number): Promise<ReserveResult> {
    const result = await this.withState((state) =>
      reserveBudget(state, maxCostFen, this.budgetFen(), Date.now(), crypto.randomUUID()),
    )
    if (result.ok) await this.maybeAlert()
    return result
  }

  async settle(reservationId: string, actualCostFen: number): Promise<void> {
    await this.withState((state) => settleReservation(state, reservationId, actualCostFen))
    await this.maybeAlert()
  }

  async cancel(reservationId: string): Promise<void> {
    await this.withState((state) => cancelReservation(state, reservationId))
  }

  private budgetFen(): number {
    return parseBudgetFen(this.env.AI_DAILY_BUDGET_FEN)
  }

  private async withState<T>(mutate: (state: GateState) => T): Promise<T> {
    const run = async (): Promise<T> => {
      const stored = (await this.ctx.storage.get<GateState>(STATE_KEY)) ?? emptyGateState()
      const result = mutate(stored)
      await this.ctx.storage.put(STATE_KEY, stored)
      return result
    }
    if (typeof this.ctx.blockConcurrencyWhile === 'function') {
      return this.ctx.blockConcurrencyWhile(run)
    }
    return run()
  }

  /** 80% 告警只发一次；webhook 失败保持 alerted80=false 以便下次重试。 */
  private async maybeAlert(): Promise<void> {
    const webhookUrl = this.env.AI_ALERT_WEBHOOK_URL
    if (!webhookUrl) return
    const state = (await this.ctx.storage.get<GateState>(STATE_KEY)) ?? emptyGateState()
    if (state.alerted80) return
    if (budgetRatio(state, this.budgetFen()) < 0.8) return

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // 只发运营信号：日期、预算比例、请求计数；不发输入、identity hash 或判词
        body: JSON.stringify({
          date: dateKeyUTC8(Date.now()),
          budgetRatio: budgetRatio(state, this.budgetFen()),
          requestCount: state.requestCount,
        }),
      })
      if (!response.ok) return
      state.alerted80 = true
      await this.ctx.storage.put(STATE_KEY, state)
    } catch {
      // webhook 失败不回滚已完成请求，保持可重试
    }
  }
}
