import { signSession, verifySession } from './auth'
import type { HoldButtonEnv } from './env'
import { jsonResponse } from './response'
import { MAX_HOLD_MS, dateKeyUTC8, durationBucket, type DeviceType } from './time'

const SESSION_TTL_MS = 25 * 60_000
const TRUST_DRIFT_MS = 2_500
const RUNS_RETENTION_MS = 30 * 86_400_000
const HISTOGRAM_RETENTION_MS = 90 * 86_400_000
// 公开阈值（秒）：只表达「今日有 X 人坚持超过 N」，不暴露个体成绩
const PUBLIC_THRESHOLDS_SECONDS = [60, 300, 600] as const

/**
 * 成本熔断开关：只有字符串 'true' 且绑定齐备时开放服务端成绩，
 * 否则前端进入纯本地模式。绝不伪造成绩。
 */
export function scoresEnabled(env: HoldButtonEnv): boolean {
  return env.HOLD_SCORES_ENABLED === 'true'
}

function scoresUnavailable(): Response {
  return jsonResponse(503, { code: 'scores_disabled' })
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function isDeviceType(value: unknown): value is DeviceType {
  return value === 'touch' || value === 'desktop'
}

function randomNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// IP 只用于边缘限流的瞬时 key，不写 D1、不进日志
async function rateLimited(request: Request, env: HoldButtonEnv): Promise<boolean> {
  if (!env.HOLD_SUBMIT_LIMITER) return false
  const key = request.headers.get('cf-connecting-ip') ?? 'unknown'
  try {
    const { success } = await env.HOLD_SUBMIT_LIMITER.limit({ key })
    return !success
  } catch {
    // 限流层异常不破坏业务：D1 唯一约束仍是最终防线
    return false
  }
}

export async function handleSession(
  request: Request,
  env: HoldButtonEnv,
  ctx: ExecutionContext,
  now: number = Date.now(),
): Promise<Response> {
  if (!scoresEnabled(env) || !env.HOLD_DB || !env.HOLD_SESSION_SECRET) return scoresUnavailable()
  if (await rateLimited(request, env)) return jsonResponse(429, { code: 'rate_limited' })

  const body = await readJson(request)
  const deviceType = (body as { deviceType?: unknown } | null)?.deviceType
  if (!isDeviceType(deviceType)) return jsonResponse(400, { code: 'invalid_body' })

  const nonce = randomNonce()
  const startedAt = now
  const expiresAt = now + SESSION_TTL_MS
  await env.HOLD_DB.prepare(
    'INSERT INTO sessions (nonce, started_at_ms, expires_at_ms, device_type) VALUES (?, ?, ?, ?)',
  )
    .bind(nonce, startedAt, expiresAt, deviceType)
    .run()

  const token = await signSession({ nonce, startedAt, expiresAt, deviceType }, env.HOLD_SESSION_SECRET)

  const dayKey = dateKeyUTC8(now)
  const total = await env.HOLD_DB.prepare(
    'SELECT COALESCE(SUM(run_count), 0) AS total FROM daily_histogram WHERE day_key = ? AND device_type = ?',
  )
    .bind(dayKey, deviceType)
    .first<{ total: number }>()

  return jsonResponse(200, {
    token,
    startedAt,
    expiresAt,
    todayCount: Number(total?.total ?? 0),
  })
}

export async function handleFinish(
  request: Request,
  env: HoldButtonEnv,
  ctx: ExecutionContext,
  now: number = Date.now(),
): Promise<Response> {
  if (!scoresEnabled(env) || !env.HOLD_DB || !env.HOLD_SESSION_SECRET) return scoresUnavailable()

  const body = await readJson(request)
  const token = (body as { token?: unknown } | null)?.token
  const clientDurationMs = (body as { clientDurationMs?: unknown } | null)?.clientDurationMs
  if (
    typeof token !== 'string' ||
    typeof clientDurationMs !== 'number' ||
    !Number.isFinite(clientDurationMs) ||
    clientDurationMs < 0 ||
    clientDurationMs > MAX_HOLD_MS
  ) {
    return jsonResponse(400, { code: 'invalid_body' })
  }

  let payload
  try {
    payload = await verifySession(token, env.HOLD_SESSION_SECRET, now)
  } catch {
    return jsonResponse(401, { code: 'invalid_token' })
  }

  const db = env.HOLD_DB
  const session = await db
    .prepare('SELECT nonce, started_at_ms, device_type FROM sessions WHERE nonce = ?')
    .bind(payload.nonce)
    .first<{ nonce: string; started_at_ms: number; device_type: DeviceType }>()
  // 会话不存在 = 已提交过（或已过期被清理），重放一律 409
  if (!session) return jsonResponse(409, { code: 'duplicate_submit' })

  const serverDuration = Math.max(0, Math.min(now - session.started_at_ms, MAX_HOLD_MS))
  const drift = Math.abs(serverDuration - clientDurationMs)
  const trusted = drift <= TRUST_DRIFT_MS
  const bucket = durationBucket(serverDuration)
  const dayKey = dateKeyUTC8(now)

  try {
    await db
      .prepare(
        'INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(payload.nonce, dayKey, bucket, session.device_type, trusted ? 1 : 0, now)
      .run()
  } catch {
    // 并发双提交：PRIMARY KEY 唯一约束保证只有一条进入 trigger
    return jsonResponse(409, { code: 'duplicate_submit' })
  }
  await db.prepare('DELETE FROM sessions WHERE nonce = ?').bind(payload.nonce).run()

  const percentile = await computePercentile(db, dayKey, session.device_type, bucket, trusted)

  return jsonResponse(200, {
    durationMs: serverDuration,
    durationBucket: bucket,
    percentile,
    trusted,
  })
}

/** 百分位 = 严格低于本桶的人数 / 除自己外的可信人数；不可信成绩不在直方图中。 */
async function computePercentile(
  db: NonNullable<HoldButtonEnv['HOLD_DB']>,
  dayKey: string,
  deviceType: DeviceType,
  bucket: number,
  trusted: boolean,
): Promise<number | null> {
  const row = await db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN duration_bucket < ?1 THEN run_count ELSE 0 END), 0) AS below,
        COALESCE(SUM(run_count), 0) AS total
      FROM daily_histogram
      WHERE day_key = ?2 AND device_type = ?3`,
    )
    .bind(bucket, dayKey, deviceType)
    .first<{ below: number; total: number }>()
  // 仅可信成绩由 trigger 写入直方图，因此只能在本次可信时去掉自己。
  const others = Number(row?.total ?? 0) - (trusted ? 1 : 0)
  if (others <= 0) return null
  return Math.round((Number(row?.below ?? 0) / others) * 100)
}

export async function handleToday(
  request: Request,
  env: HoldButtonEnv,
  ctx: ExecutionContext,
  now: number = Date.now(),
): Promise<Response> {
  if (!scoresEnabled(env) || !env.HOLD_DB) return scoresUnavailable()

  const url = new URL(request.url)
  const device = url.searchParams.get('device')
  if (!isDeviceType(device)) return jsonResponse(400, { code: 'invalid_body' })

  const db = env.HOLD_DB
  const dayKey = dateKeyUTC8(now)
  const total = await db
    .prepare(
      'SELECT COALESCE(SUM(run_count), 0) AS total FROM daily_histogram WHERE day_key = ? AND device_type = ?',
    )
    .bind(dayKey, device)
    .first<{ total: number }>()

  const above: { minSeconds: number; count: number }[] = []
  for (const minSeconds of PUBLIC_THRESHOLDS_SECONDS) {
    const row = await db
      .prepare(
        'SELECT COALESCE(SUM(run_count), 0) AS count FROM daily_histogram WHERE day_key = ? AND device_type = ? AND duration_bucket >= ?',
      )
      .bind(dayKey, device, minSeconds)
      .first<{ count: number }>()
    above.push({ minSeconds, count: Number(row?.count ?? 0) })
  }

  return jsonResponse(200, { total: Number(total?.total ?? 0), above })
}

/** scheduled 清理：先删 runs 再删 histogram，失败由调用方记录聚合错误 */
export async function cleanupHoldData(env: HoldButtonEnv, now: number): Promise<void> {
  const db = env.HOLD_DB
  if (!db) return
  await db.prepare('DELETE FROM sessions WHERE expires_at_ms < ?').bind(now).run()
  await db.prepare('DELETE FROM runs WHERE created_at_ms < ?').bind(now - RUNS_RETENTION_MS).run()
  const cutoffDay = dateKeyUTC8(now - HISTOGRAM_RETENTION_MS)
  await db.prepare('DELETE FROM daily_histogram WHERE day_key < ?').bind(cutoffDay).run()
}
