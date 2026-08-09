import { fnv1a } from '@viral/shared'
import { QUESTION_IDS } from '../content/questions'
import { validateAnswers } from './answers'
import type { PublicReportPayload } from './public-fields'
import type { AnswerValue, ReportAnswers } from './report-types'

/** fragment 长度上限：超过就不生成链接，回退图片分享 */
export const MAX_REPORT_FRAGMENT_LENGTH = 1800
export const REPORT_FRAGMENT_PREFIX = 'report='

const MIN_YEAR = 1900
const MAX_YEAR = 2200

interface CanonicalPayload {
  v: number
  y: number
  /** [题号, 答案] 有序数组，比对象更紧凑也更好算校验位 */
  f: [string, AnswerValue][]
  c: string
}

function canonicalFields(answers: ReportAnswers): [string, AnswerValue][] {
  const known = new Set<string>(QUESTION_IDS)
  const fields: [string, AnswerValue][] = []
  for (const id of QUESTION_IDS) {
    const value = answers[id]
    if (value !== undefined) fields.push([id, value])
  }
  // 未知字段照样编码，好让解码端按白名单明确拒绝，而不是被静默丢掉
  for (const key of Object.keys(answers).sort()) {
    if (!known.has(key)) fields.push([key, (answers as Record<string, AnswerValue>)[key]!])
  }
  return fields
}

/** 只用于检错，不是加密：链接内容对任何拿到它的人都是可读的 */
function checksumOf(version: number, year: number, fields: readonly [string, AnswerValue][]): string {
  return fnv1a(JSON.stringify({ v: version, y: year, f: fields })).toString(36)
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('报告链接格式不对')
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodePublicReport(payload: PublicReportPayload): string {
  const fields = canonicalFields(payload.answers)
  const canonical: CanonicalPayload = {
    v: payload.version,
    y: payload.year,
    f: fields,
    c: checksumOf(payload.version, payload.year, fields),
  }
  return toBase64Url(JSON.stringify(canonical))
}

/**
 * 解码分享链接。版本、年份、字段白名单、答案校验与校验位任一不过就抛错，
 * 由上层显示「这份报告链接无法读取」。
 */
export function decodePublicReport(raw: string): PublicReportPayload {
  if (!raw) throw new Error('报告链接是空的')
  const json = fromBase64Url(raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('报告链接内容读不出来')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('报告链接内容读不出来')

  const candidate = parsed as Partial<CanonicalPayload>
  if (candidate.v !== 1) throw new Error('报告链接版本不支持')
  if (
    typeof candidate.y !== 'number' ||
    !Number.isInteger(candidate.y) ||
    candidate.y < MIN_YEAR ||
    candidate.y > MAX_YEAR
  ) {
    throw new Error('报告链接年份不对')
  }
  if (!Array.isArray(candidate.f)) throw new Error('报告链接内容读不出来')
  if (typeof candidate.c !== 'string') throw new Error('报告链接缺少校验位')
  if (checksumOf(candidate.v, candidate.y, candidate.f) !== candidate.c) {
    throw new Error('报告链接被改动过')
  }

  const known = new Set<string>(QUESTION_IDS)
  const answers: ReportAnswers = {}
  for (const entry of candidate.f) {
    if (!Array.isArray(entry) || entry.length !== 2) throw new Error('报告链接内容读不出来')
    const [id, value] = entry as [unknown, AnswerValue]
    if (typeof id !== 'string' || !known.has(id)) throw new Error('报告链接含未知字段')
    ;(answers as Record<string, AnswerValue>)[id] = value
  }

  const issues = validateAnswers(answers)
  if (issues.length > 0) throw new Error('报告链接里的答案不合法')

  return { version: 1, year: candidate.y, answers }
}

/** 生成分享链接；过长返回 null。答案只进 fragment，绝不进 query */
export function buildPublicReportUrl(base: URL, payload: PublicReportPayload): string | null {
  const encoded = encodePublicReport(payload)
  if (encoded.length > MAX_REPORT_FRAGMENT_LENGTH) return null
  return `${base.origin}${base.pathname}#${REPORT_FRAGMENT_PREFIX}${encoded}`
}

/**
 * 从 hash 读取分享 payload。
 * 返回 null 表示这不是一个分享链接；'invalid' 表示是分享链接但读不出来。
 */
export function readReportFragment(hash: string): PublicReportPayload | 'invalid' | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw.startsWith(REPORT_FRAGMENT_PREFIX)) return null
  const encoded = raw.slice(REPORT_FRAGMENT_PREFIX.length)
  try {
    return decodePublicReport(encoded)
  } catch {
    return 'invalid'
  }
}
