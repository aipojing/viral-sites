import type { PortalEnv } from './env'
import { jsonResponse, methodNotAllowed } from './response'

const MAX_BODY_BYTES = 4096

const ALLOWED_EVENTS = new Set([
  'page_view',
  'generate',
  'save_image',
  'export_error',
  'share',
  'copy',
  'copy_link',
  'q_answered',
  'streak_day',
  'scene_selected',
  'tone_selected',
  'custom_scene_opened',
  'custom_scene_submitted',
  'challenge_opened',
  'challenge_completed',
  'challenge_create',
  'challenge_complete',
  'question_chain_create',
  'question_open',
  'question_submit',
  'question_chain_complete',
])

type EventData = Record<string, unknown>

interface ProductEventPayload {
  event: string
  data: EventData
  path: string
  referrerHost: string
  sessionId: string
}

function invalidEvent(): Response {
  return jsonResponse(400, { code: 'invalid_event' })
}

function normalizePath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 256 || !value.startsWith('/') || value.startsWith('//')) {
    return null
  }
  return value.split(/[?#]/, 1)[0] || '/'
}

function normalizeReferrerHost(value: unknown): string {
  if (typeof value !== 'string' || value === '' || value.length > 512) return ''
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.hostname.slice(0, 253)
  } catch {
    return ''
  }
}

function normalizeSessionId(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(value)) return null
  return value
}

function normalizePayload(value: unknown): ProductEventPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (typeof input.event !== 'string' || !ALLOWED_EVENTS.has(input.event)) return null
  const path = normalizePath(input.path)
  const sessionId = normalizeSessionId(input.sessionId)
  if (!path || !sessionId) return null
  const data = input.data && typeof input.data === 'object' && !Array.isArray(input.data)
    ? (input.data as EventData)
    : {}
  return {
    event: input.event,
    data,
    path,
    referrerHost: normalizeReferrerHost(input.referrer),
    sessionId,
  }
}

function stringDimension(data: EventData, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value.slice(0, 80) : ''
}

function numberMetric(data: EventData, key: string): number {
  const value = data[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function writeProductEvent(env: PortalEnv, payload: ProductEventPayload): void {
  const { data } = payload
  env.PRODUCT_ANALYTICS.writeDataPoint({
    indexes: [payload.sessionId],
    blobs: [
      payload.event,
      payload.path,
      payload.referrerHost,
      stringDimension(data, 'slug'),
      stringDimension(data, 'mode'),
      stringDimension(data, 'quiz'),
      stringDimension(data, 'level'),
      stringDimension(data, 'scene'),
      stringDimension(data, 'tone'),
      stringDimension(data, 'card'),
      stringDimension(data, 'id'),
    ],
    doubles: [
      1,
      numberMetric(data, 'q'),
      numberMetric(data, 'score'),
      numberMetric(data, 'duration_seconds'),
      numberMetric(data, 'age'),
      numberMetric(data, 'streak'),
    ],
  })
}

export async function collectProductEvent(request: Request, env: PortalEnv): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return invalidEvent()

  let text: string
  try {
    text = await request.text()
  } catch {
    return invalidEvent()
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return invalidEvent()

  let payload: ProductEventPayload | null
  try {
    payload = normalizePayload(JSON.parse(text))
  } catch {
    return invalidEvent()
  }
  if (!payload) return invalidEvent()

  try {
    writeProductEvent(env, payload)
  } catch (error) {
    console.error('product analytics write failed', error)
  }
  return new Response(null, { status: 202 })
}
