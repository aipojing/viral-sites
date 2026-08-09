import { describe, expect, it } from 'vitest'
import type { HoldButtonEnv } from './env'
import { handleHoldButtonApi } from './router'

const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext

describe('hold-button router', () => {
  it('未知玩法子路由返回 JSON 404，不回退 HTML', async () => {
    const response = await handleHoldButtonApi(
      new Request('https://example.com/api/hold-button/leaderboard'),
      {} as HoldButtonEnv,
      ctx,
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'not_found' })
  })

  it('非 /api/hold-button/ 前缀一律 JSON 404', async () => {
    const response = await handleHoldButtonApi(
      new Request('https://example.com/api/other/session'),
      {} as HoldButtonEnv,
      ctx,
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'not_found' })
  })

  it('错误 method 返回 405', async () => {
    const session = await handleHoldButtonApi(
      new Request('https://example.com/api/hold-button/session'),
      {} as HoldButtonEnv,
      ctx,
    )
    expect(session.status).toBe(405)
    expect(await session.json()).toEqual({ code: 'method_not_allowed' })

    const today = await handleHoldButtonApi(
      new Request('https://example.com/api/hold-button/today', { method: 'POST' }),
      {} as HoldButtonEnv,
      ctx,
    )
    expect(today.status).toBe(405)
    expect(await today.json()).toEqual({ code: 'method_not_allowed' })
  })

  it('disabled 开关：三个 endpoint 都返回 scores_disabled', async () => {
    const env = {} as HoldButtonEnv
    const session = await handleHoldButtonApi(
      new Request('https://example.com/api/hold-button/session', { method: 'POST' }),
      env,
      ctx,
    )
    expect(session.status).toBe(503)
    expect(await session.json()).toEqual({ code: 'scores_disabled' })

    const finish = await handleHoldButtonApi(
      new Request('https://example.com/api/hold-button/finish', { method: 'POST' }),
      env,
      ctx,
    )
    expect(finish.status).toBe(503)
    expect(await finish.json()).toEqual({ code: 'scores_disabled' })

    const today = await handleHoldButtonApi(
      new Request('https://example.com/api/hold-button/today'),
      env,
      ctx,
    )
    expect(today.status).toBe(503)
    expect(await today.json()).toEqual({ code: 'scores_disabled' })
  })

  it('开关打开但缺少绑定（开发态）仍返回 scores_disabled，不伪造成绩', async () => {
    const env = { HOLD_SCORES_ENABLED: 'true' } as HoldButtonEnv
    const session = await handleHoldButtonApi(
      new Request('https://example.com/api/hold-button/session', { method: 'POST' }),
      env,
      ctx,
    )
    expect(session.status).toBe(503)
    expect(await session.json()).toEqual({ code: 'scores_disabled' })
  })
})
