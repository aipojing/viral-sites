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
  // 道歉与请假（refusal-generator 文书模式）：只记录枚举，不携带称呼/事由/正文，命中词不上报
  'mode_selected',
  'edited_before_copy',
  'safety_mode',
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
  // 按住不放：属性只允许 bucket/reason/device/channel，禁止携带精确时长与 token
  'challenge_started',
  'challenge_finished',
  'challenge_shared',
  // 一秒钟世界：属性只允许章节 id、事实 id 与时长桶，禁止携带精确秒数与滚动轨迹
  'chapter_viewed',
  'source_opened',
  'engaged_time_bucket',
  'snapshot_generated',
  // 亲戚称呼：属性只允许枚举 token、entry id、地区 id 与方式枚举，
  // 禁止携带关系链原文、反查输入原文与用户姓名
  'query_started',
  'query_resolved',
  'query_unresolved',
  'relation_step_added',
  'reverse_used',
  'region_pack_used',
  'correction_submitted',
  // 年度报告：属性只允许题号、answered|skipped 枚举、开启方式与公开字段数量，
  // 绝不携带任何答案原文、分享 fragment 或草稿内容
  'report_started',
  'question_completed',
  'draft_resumed',
  'draft_cleared',
  'share_link_created',
  'share_report_opened',
])

type EventData = Record<string, unknown>

type DataRule = 'identifier' | 'bucket' | 'binary' | 'smallInteger' | 'relationToken' | 'reportQuestion'

const RELATION_TOKENS = new Set([
  'father', 'mother', 'husband', 'wife', 'older-brother', 'younger-brother', 'older-sister', 'younger-sister', 'son', 'daughter',
])
const REPORT_QUESTION_IDS = new Set([
  'keyword', 'place', 'song', 'comfort-food', 'important-person', 'small-win', 'hard-moment', 'feeling-scale', 'goal-and-release', 'next-year-message',
])

/** 逐事件字段白名单：未知字段不落库；无合法属性的敏感事件携带 data 时直接拒绝。 */
const EVENT_DATA_RULES: Record<string, Partial<Record<string, DataRule>>> = {
  page_view: {},
  generate: { slug: 'identifier', mode: 'identifier', scene: 'identifier', tone: 'identifier', kind: 'identifier', quiz: 'identifier', level: 'identifier', bucket: 'smallInteger', reason: 'identifier', device: 'identifier', score: 'smallInteger', age: 'smallInteger' },
  save_image: { slug: 'identifier', card: 'identifier', scene: 'identifier', tone: 'identifier', type: 'identifier', field_count: 'smallInteger' },
  export_error: { slug: 'identifier', card: 'identifier' }, fallback_used: { slug: 'identifier' }, rate_limited: { slug: 'identifier' }, budget_paused: { slug: 'identifier' },
  setup_completed: { slug: 'identifier' }, scene_started: { slug: 'identifier', scene: 'identifier' }, scene_finished: { slug: 'identifier', scene: 'identifier', duration_bucket: 'bucket' }, privacy_mode_used: { slug: 'identifier', enabled: 'binary' }, daily_summary_viewed: { slug: 'identifier' },
  time_ledger_opened: {}, time_ledger_generated: {}, habit_adjusted: {}, return_visit: { slug: 'identifier', day: 'smallInteger' }, share: { mode: 'identifier' }, copy: { mode: 'identifier', scene: 'identifier', tone: 'identifier', type: 'identifier', audience: 'identifier', kind: 'identifier' }, copy_link: {}, q_answered: { slug: 'identifier', q: 'smallInteger', mode: 'identifier' }, streak_day: { streak: 'smallInteger' },
  scene_selected: { scene: 'identifier' }, tone_selected: { tone: 'identifier' }, custom_scene_opened: { mode: 'identifier' }, custom_scene_submitted: { mode: 'identifier' }, mode_selected: { mode: 'identifier' }, edited_before_copy: { type: 'identifier', tone: 'identifier' }, safety_mode: { mode: 'identifier' },
  challenge_opened: { bucket: 'smallInteger' }, challenge_completed: { quiz: 'identifier', score: 'smallInteger' }, link_invalid: {}, challenge_create: {}, challenge_complete: {}, question_chain_create: {}, question_open: {}, question_submit: {}, question_chain_complete: {},
  next_question_created: {}, next_question_baton_opened: { q: 'smallInteger' }, next_question_baton_submitted: { q: 'smallInteger' }, next_question_baton_shared: { q: 'smallInteger', mode: 'identifier' }, next_question_returned: {}, next_question_completed: {}, next_question_result_saved: {}, next_question_redacted: {},
  challenge_started: { bucket: 'smallInteger', device: 'identifier' }, challenge_finished: { bucket: 'smallInteger', reason: 'identifier', device: 'identifier' }, challenge_shared: { channel: 'identifier' },
  chapter_viewed: { chapter: 'identifier' }, source_opened: { source: 'identifier' }, engaged_time_bucket: { bucket: 'bucket' }, snapshot_generated: { duration_bucket: 'bucket' },
  query_started: { mode: 'identifier' }, query_resolved: {}, query_unresolved: { reason: 'identifier' }, relation_step_added: { relation: 'relationToken' }, reverse_used: { method: 'identifier' }, region_pack_used: { region: 'identifier' }, correction_submitted: { method: 'identifier' },
  report_started: { mode: 'identifier' }, question_completed: { question: 'reportQuestion', skipped: 'identifier' }, draft_resumed: {}, draft_cleared: {}, share_link_created: { version: 'smallInteger', field_count: 'smallInteger' }, share_report_opened: { version: 'smallInteger', field_count: 'smallInteger' },
}

function dataValueMatches(value: unknown, rule: DataRule): boolean {
  if (rule === 'identifier') return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
  if (rule === 'bucket') return typeof value === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(value)
  if (rule === 'binary') return value === 0 || value === 1
  if (rule === 'relationToken') return typeof value === 'string' && RELATION_TOKENS.has(value)
  if (rule === 'reportQuestion') return typeof value === 'string' && REPORT_QUESTION_IDS.has(value)
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_000
}

function normalizeEventData(event: string, value: unknown): EventData | null {
  if (!value) return {}
  if (typeof value !== 'object' || Array.isArray(value)) return null
  const rules = EVENT_DATA_RULES[event]
  const data = value as EventData
  const normalized: EventData = {}
  for (const [key, fieldValue] of Object.entries(data)) {
    const rule = rules[key]
    if (!rule) {
      // query_resolved 没有任何合法属性：携带内容意味着可能在尝试上报关系答案，直接拒绝。
      if (event === 'query_resolved') return null
      continue
    }
    if (!dataValueMatches(fieldValue, rule)) return null
    normalized[key] = fieldValue
  }
  return normalized
}

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
  const data = normalizeEventData(input.event, input.data)
  if (!data) return null
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
      // 按住不放：结束原因 / 设备类型 / 分享渠道枚举，精确时长只进 bucket double
      stringDimension(data, 'reason'),
      stringDimension(data, 'device'),
      stringDimension(data, 'channel'),
      // 一秒钟世界：章节 id / 事实 id / 停留时长桶枚举，不携带精确秒数
      stringDimension(data, 'chapter'),
      stringDimension(data, 'source'),
      stringDimension(data, 'bucket'),
      // 亲戚称呼：关系 token 枚举 / 地区包 id / 方式枚举（hit|miss、form|copy）
      stringDimension(data, 'relation'),
      stringDimension(data, 'region'),
      stringDimension(data, 'method'),
      // 年度报告：题号与 answered|skipped 枚举，答案原文没有对应列
      stringDimension(data, 'question'),
      stringDimension(data, 'skipped'),
    ],
    doubles: [
      1,
      numberMetric(data, 'q'),
      numberMetric(data, 'score'),
      numberMetric(data, 'duration_seconds'),
      numberMetric(data, 'age'),
      numberMetric(data, 'streak'),
      // 按住不放：秒级时长桶（0～1200），不是精确毫秒
      numberMetric(data, 'bucket'),
      // 年度报告：公开字段数量（0～10）与分享格式版本号
      numberMetric(data, 'field_count'),
      numberMetric(data, 'version'),
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
