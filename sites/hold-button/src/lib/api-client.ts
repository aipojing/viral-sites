/**
 * 成绩 API 客户端：只调用 /api/hold-button/session 与 /api/hold-button/finish。
 * 所有非 2xx 都映射为稳定的 HoldApiError；响应一律经过手写类型守卫，不信任任意 JSON。
 */

export type DeviceType = 'touch' | 'desktop'

export interface StartResponse {
  token: string
  startedAt: number
  expiresAt: number
  todayCount: number
}

export interface FinishResponse {
  durationMs: number
  durationBucket: number
  percentile: number | null
  trusted: boolean
}

export class HoldApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(`hold api ${status}:${code}`)
    this.name = 'HoldApiError'
  }
}

export interface HoldApi {
  start(deviceType: DeviceType, signal?: AbortSignal): Promise<StartResponse>
  finish(token: string, durationMs: number, signal?: AbortSignal): Promise<FinishResponse>
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStartResponse(body: unknown): body is StartResponse {
  if (!body || typeof body !== 'object') return false
  const candidate = body as Record<string, unknown>
  return (
    typeof candidate.token === 'string' &&
    isFiniteNumber(candidate.startedAt) &&
    isFiniteNumber(candidate.expiresAt) &&
    isFiniteNumber(candidate.todayCount)
  )
}

function isFinishResponse(body: unknown): body is FinishResponse {
  if (!body || typeof body !== 'object') return false
  const candidate = body as Record<string, unknown>
  return (
    isFiniteNumber(candidate.durationMs) &&
    isFiniteNumber(candidate.durationBucket) &&
    (candidate.percentile === null || isFiniteNumber(candidate.percentile)) &&
    typeof candidate.trusted === 'boolean'
  )
}

async function request<T>(path: string, body: unknown, guard: (value: unknown) => value is T, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new HoldApiError(0, 'aborted')
    throw new HoldApiError(0, 'error')
  }

  if (response.status === 200) {
    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new HoldApiError(200, 'error')
    }
    if (guard(parsed)) return parsed
    throw new HoldApiError(200, 'error')
  }

  let code = 'error'
  try {
    const parsed = (await response.json()) as { code?: unknown }
    if (parsed && typeof parsed.code === 'string') code = parsed.code
  } catch {
    // 非 JSON 错误体保持 'error'
  }
  throw new HoldApiError(response.status, code)
}

export function createHoldApi(): HoldApi {
  return {
    start(deviceType, signal) {
      return request('/api/hold-button/session', { deviceType }, isStartResponse, signal)
    },
    finish(token, durationMs, signal) {
      return request('/api/hold-button/finish', { token, clientDurationMs: durationMs }, isFinishResponse, signal)
    },
  }
}
