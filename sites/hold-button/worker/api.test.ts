import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleFinish, handleSession, handleToday } from './api'
import { signSession } from './auth'
import { applyHoldMigrations, makeTestD1, type TestD1Database } from './d1-testkit'
import type { HoldButtonEnv } from './env'

const SECRET = 'test-secret'
const NOW = 1_000_000_000_000

interface FakeLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>
}

async function makeEnv(limiter?: FakeLimiter): Promise<{ env: HoldButtonEnv; db: TestD1Database }> {
  const db = makeTestD1()
  await applyHoldMigrations(db)
  const env = {
    HOLD_DB: db as unknown as D1Database,
    HOLD_SESSION_SECRET: SECRET,
    HOLD_SCORES_ENABLED: 'true',
    HOLD_SUBMIT_LIMITER: limiter as unknown as RateLimit,
  }
  return { env, db }
}

const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext

function sessionRequest(deviceType: unknown): Request {
  return new Request('https://example.com/api/hold-button/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7' },
    body: JSON.stringify({ deviceType }),
  })
}

describe('hold-button API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('POST session：创建 25 分钟会话并返回签名 token', async () => {
    const { env, db } = await makeEnv()
    const response = await handleSession(sessionRequest('touch'), env, ctx, NOW)
    const body = (await response.json()) as {
      token: string
      startedAt: number
      expiresAt: number
      todayCount: number
    }
    expect(response.status).toBe(200)
    expect(body.startedAt).toBe(NOW)
    expect(body.expiresAt).toBe(NOW + 25 * 60_000)
    expect(body.todayCount).toBe(0)
    expect(typeof body.token).toBe('string')

    const row = await db.prepare('SELECT * FROM sessions').first<{ nonce: string; device_type: string }>()
    expect(row?.device_type).toBe('touch')
  })

  it('POST session：非法 deviceType 与缺失 body 返回 400', async () => {
    const { env } = await makeEnv()
    expect((await handleSession(sessionRequest('vr'), env, ctx, NOW)).status).toBe(400)
    expect(
      (await handleSession(new Request('https://example.com/api/hold-button/session', { method: 'POST' }), env, ctx, NOW))
        .status,
    ).toBe(400)
  })

  it('POST session：限流命中返回 429 且不写库', async () => {
    const limiter: FakeLimiter = { limit: vi.fn(async () => ({ success: false })) }
    const { env, db } = await makeEnv(limiter)
    const response = await handleSession(sessionRequest('touch'), env, ctx, NOW)
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ code: 'rate_limited' })
    expect(limiter.limit).toHaveBeenCalledWith({ key: '203.0.113.7' })
    expect(await db.prepare('SELECT COUNT(*) AS c FROM sessions').first<{ c: number }>()).toEqual({ c: 0 })
  })

  it('POST finish：可信成绩返回服务端时长与桶，并删除会话', async () => {
    const { env, db } = await makeEnv()
    const startResponse = await handleSession(sessionRequest('touch'), env, ctx, NOW)
    const { token } = (await startResponse.json()) as { token: string }

    const finishAt = NOW + 19_999
    const response = await handleFinish(
      new Request('https://example.com/api/hold-button/finish', {
        method: 'POST',
        body: JSON.stringify({ token, clientDurationMs: 20_100 }),
      }),
      env,
      ctx,
      finishAt,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      durationMs: 19_999,
      durationBucket: 19,
      percentile: null,
      trusted: true,
    })
    expect(await db.prepare('SELECT COUNT(*) AS c FROM sessions').first<{ c: number }>()).toEqual({ c: 0 })
  })

  it('POST finish：客户端漂移超过 2.5 秒进入隔离桶（trusted=false）', async () => {
    const { env } = await makeEnv()
    const { token } = (await (await handleSession(sessionRequest('touch'), env, ctx, NOW)).json()) as {
      token: string
    }
    const response = await handleFinish(
      new Request('https://example.com/api/hold-button/finish', {
        method: 'POST',
        body: JSON.stringify({ token, clientDurationMs: 60_000 }),
      }),
      env,
      ctx,
      NOW + 20_000,
    )
    expect(response.status).toBe(200)
    expect((await response.json()) as { trusted: boolean }).toMatchObject({ trusted: false })
  })

  it('POST finish：服务端时长封顶 20 分钟', async () => {
    const { env } = await makeEnv()
    const { token } = (await (await handleSession(sessionRequest('desktop'), env, ctx, NOW)).json()) as {
      token: string
    }
    const response = await handleFinish(
      new Request('https://example.com/api/hold-button/finish', {
        method: 'POST',
        body: JSON.stringify({ token, clientDurationMs: 20 * 60_000 }),
      }),
      env,
      ctx,
      // 超过封顶 1 秒仍在 25 分钟会话有效期内
      NOW + 20 * 60_000 + 1_000,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ durationMs: 20 * 60_000, durationBucket: 1200, trusted: true })
  })

  it('POST finish：同 token 第二次提交返回 409', async () => {
    const { env } = await makeEnv()
    const { token } = (await (await handleSession(sessionRequest('touch'), env, ctx, NOW)).json()) as {
      token: string
    }
    const makeRequest = () =>
      new Request('https://example.com/api/hold-button/finish', {
        method: 'POST',
        body: JSON.stringify({ token, clientDurationMs: 10_000 }),
      })
    expect((await handleFinish(makeRequest(), env, ctx, NOW + 10_000)).status).toBe(200)
    const replay = await handleFinish(makeRequest(), env, ctx, NOW + 10_500)
    expect(replay.status).toBe(409)
    expect(await replay.json()).toEqual({ code: 'duplicate_submit' })
  })

  it('POST finish：篡改 token 返回 401 且不回显细节', async () => {
    const { env } = await makeEnv()
    const response = await handleFinish(
      new Request('https://example.com/api/hold-button/finish', {
        method: 'POST',
        body: JSON.stringify({ token: 'forged.token', clientDurationMs: 10_000 }),
      }),
      env,
      ctx,
      NOW,
    )
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ code: 'invalid_token' })
  })

  it('POST finish：clientDurationMs 非法返回 400', async () => {
    const { env } = await makeEnv()
    const { token } = (await (await handleSession(sessionRequest('touch'), env, ctx, NOW)).json()) as {
      token: string
    }
    const response = await handleFinish(
      new Request('https://example.com/api/hold-button/finish', {
        method: 'POST',
        body: JSON.stringify({ token, clientDurationMs: -5 }),
      }),
      env,
      ctx,
      NOW,
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ code: 'invalid_body' })
  })

  it('GET today：只统计可信成绩并暴露公开阈值人数', async () => {
    const { env, db } = await makeEnv()
    // 三条可信（30s/200s/400s）+ 一条隔离（900s）
    await db
      .prepare('INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('n1', '2026-08-09', 30, 'touch', 1, NOW)
      .run()
    await db
      .prepare('INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('n2', '2026-08-09', 200, 'touch', 1, NOW)
      .run()
    await db
      .prepare('INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('n3', '2026-08-09', 400, 'touch', 1, NOW)
      .run()
    await db
      .prepare('INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('n4', '2026-08-09', 900, 'touch', 0, NOW)
      .run()

    const response = await handleToday(
      new Request('https://example.com/api/hold-button/today?device=touch'),
      env,
      ctx,
      // 2026-08-08T16:00:00Z = 北京时间 2026-08-09 00:00
      Date.UTC(2026, 7, 8, 16, 0, 0),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      total: number
      above: { minSeconds: number; count: number }[]
    }
    expect(body.total).toBe(3)
    expect(body.above).toEqual([
      { minSeconds: 60, count: 2 },
      { minSeconds: 300, count: 1 },
      { minSeconds: 600, count: 0 },
    ])
  })

  it('GET today：非法 device 参数返回 400', async () => {
    const { env } = await makeEnv()
    const response = await handleToday(
      new Request('https://example.com/api/hold-button/today?device=console'),
      env,
      ctx,
      NOW,
    )
    expect(response.status).toBe(400)
  })

  it('finish 后百分位只统计同设备可信分布（超过 X%）', async () => {
    const { env, db } = await makeEnv()
    const dayKey = '2026-08-09'
    // 预置同天可信分布：桶 10 有 3 人、桶 50 有 1 人；桌面桶 10 有 99 人不参与
    for (const [nonce, bucket, device] of [
      ['p1', 10, 'touch'],
      ['p2', 10, 'touch'],
      ['p3', 10, 'touch'],
      ['p4', 50, 'touch'],
      ['p5', 10, 'desktop'],
    ] as const) {
      await db
        .prepare('INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(nonce, dayKey, bucket, device, 1, NOW)
        .run()
    }

    const finishNow = Date.UTC(2026, 7, 8, 17, 0, 0)
    const { token } = (await (
      await handleSession(sessionRequest('touch'), env, ctx, finishNow - 30_000)
    ).json()) as { token: string }
    const response = await handleFinish(
      new Request('https://example.com/api/hold-button/finish', {
        method: 'POST',
        body: JSON.stringify({ token, clientDurationMs: 30_000 }),
      }),
      env,
      ctx,
      finishNow,
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { percentile: number; durationBucket: number }
    expect(body.durationBucket).toBe(30)
    // 除自己外：桶 10×3 + 桶 50×1 = 4 人，严格低于桶 30 的有 3 → 75%
    expect(body.percentile).toBe(75)
  })
})

describe('cleanupHoldData', () => {
  it('删除过期会话、30 天前 runs 与 90 天前直方图', async () => {
    const { cleanupHoldData } = await import('./api')
    const db = makeTestD1()
    await applyHoldMigrations(db)
    const env = { HOLD_DB: db as unknown as D1Database } as HoldButtonEnv
    const CLEAN_NOW = Date.UTC(2026, 7, 9)

    await db
      .prepare('INSERT INTO sessions (nonce, started_at_ms, expires_at_ms, device_type) VALUES (?, ?, ?, ?)')
      .bind('fresh', CLEAN_NOW, CLEAN_NOW + 1_000, 'touch')
      .run()
    await db
      .prepare('INSERT INTO sessions (nonce, started_at_ms, expires_at_ms, device_type) VALUES (?, ?, ?, ?)')
      .bind('stale', CLEAN_NOW, CLEAN_NOW - 1_000, 'touch')
      .run()
    await db
      .prepare('INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('old-run', '2026-01-01', 10, 'touch', 1, CLEAN_NOW - 31 * 86_400_000)
      .run()
    await db
      .prepare('INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('new-run', '2026-08-09', 10, 'touch', 1, CLEAN_NOW)
      .run()
    // trigger 已为两条可信 run 各创建一行直方图，直接断言清理行为
    await cleanupHoldData(env, CLEAN_NOW)

    expect(await db.prepare("SELECT nonce FROM sessions WHERE nonce = 'fresh'").first()).toBeTruthy()
    expect(await db.prepare("SELECT nonce FROM sessions WHERE nonce = 'stale'").first()).toBeNull()
    expect(await db.prepare("SELECT nonce FROM runs WHERE nonce = 'old-run'").first()).toBeNull()
    expect(await db.prepare("SELECT nonce FROM runs WHERE nonce = 'new-run'").first()).toBeTruthy()
    expect(
      await db.prepare("SELECT * FROM daily_histogram WHERE day_key = '2026-01-01'").first(),
    ).toBeNull()
    expect(
      await db.prepare("SELECT * FROM daily_histogram WHERE day_key = '2026-08-09'").first(),
    ).toBeTruthy()
  })
})
