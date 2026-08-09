import type { PortalEnv } from './env'
import { jsonResponse, methodNotAllowed } from './response'

const MAX_BODY_BYTES = 4096

const ALLOWED_EVENTS = new Set([
  'page_view',
  'generate',
  'save_image',
  'export_error',
  'fallback_used',
  'rate_limited',
  'budget_paused',
  // 上班回本：属性只允许功能枚举与时长桶，禁止金额/时薪/作息/自定义文本
  'setup_completed',
  'scene_started',
  'scene_finished',
  'privacy_mode_used',
  'daily_summary_viewed',
  // 睡眠银行（life-grid 二期模块）：只记录是否打开/生成/调整，不携带任何作息数值
  'time_ledger_opened',
  'time_ledger_generated',
  'habit_adjusted',
  'return_visit',
  'share',
  'copy',
  'copy_link',
  'q_answered',
  'streak_day',
  'scene_selected',
  'tone_selected',
  'custom_scene_opened',
  'custom_scene_submitted',
  // 道歉与请假（refusal-generator 文书模式）：只记录枚举，不携带称呼/事由/正文
  'mode_selected',
  'edited_before_copy',
  'challenge_opened',
  'challenge_completed',
  'link_invalid',
  'challenge_create',
  'challenge_complete',
  'question_chain_create',
  'question_open',
  'question_submit',
  'question_chain_complete',
  // 下一问：属性只允许 slot（记为 q）与 method（记为 mode），禁止携带内容与 token
  'next_question_created',
  'next_question_baton_opened',
  'next_question_baton_submitted',
  'next_question_baton_shared',
  'next_question_returned',
  'next_question_completed',
  'next_question_result_saved',
  'next_question_redacted',
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
      // 道歉与请假：文书类型 / 对象 / 内容档（usable|joke）枚举
      stringDimension(data, 'type'),
      stringDimension(data, 'audience'),
      stringDimension(data, 'kind'),
      stringDimension(data, 'card'),
      stringDimension(data, 'id'),
      // 上班回本：scene_finished 的时长桶，只允许枚举值
      stringDimension(data, 'duration_bucket'),
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
