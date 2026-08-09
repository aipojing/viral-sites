import type { Verdict } from './types'

export class VerdictSchemaError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'VerdictSchemaError'
    this.code = code
  }
}

export const CRIME_MAX_CODE_POINTS = 8
export const VERDICT_MIN_CODE_POINTS = 60
export const VERDICT_MAX_CODE_POINTS = 90
export const SENTENCE_MAX_CODE_POINTS = 24
export const SEAL_MAX_CODE_POINTS = 16

const FIELDS = ['crime', 'verdict', 'sentence', 'seal'] as const

export function codePointLength(value: string): number {
  let count = 0
  for (const _ of value) count += 1
  return count
}

/**
 * 解析并校验模型输出的判词 JSON。
 * 拒绝 fence 包裹、额外字段、非字符串、空白与越界长度；计数按 Unicode code point。
 */
export function parseVerdict(raw: string): Verdict {
  const text = raw.trim()
  if (text.length === 0) throw new VerdictSchemaError('empty')
  if (text.startsWith('`')) throw new VerdictSchemaError('markdown_fence')

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new VerdictSchemaError('invalid_json')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new VerdictSchemaError('invalid_shape')
  }

  const record = parsed as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!FIELDS.includes(key as (typeof FIELDS)[number])) {
      throw new VerdictSchemaError('extra_field')
    }
  }

  const values: Record<string, string> = {}
  for (const field of FIELDS) {
    const value = record[field]
    if (typeof value !== 'string') throw new VerdictSchemaError(`invalid_${field}`)
    const trimmed = value.trim().normalize('NFC')
    if (trimmed.length === 0) throw new VerdictSchemaError(`empty_${field}`)
    values[field] = trimmed
  }

  if (codePointLength(values.crime) > CRIME_MAX_CODE_POINTS) {
    throw new VerdictSchemaError('crime_too_long')
  }
  const verdictLength = codePointLength(values.verdict)
  if (verdictLength < VERDICT_MIN_CODE_POINTS) throw new VerdictSchemaError('verdict_too_short')
  if (verdictLength > VERDICT_MAX_CODE_POINTS) throw new VerdictSchemaError('verdict_too_long')
  if (codePointLength(values.sentence) > SENTENCE_MAX_CODE_POINTS) {
    throw new VerdictSchemaError('sentence_too_long')
  }
  if (codePointLength(values.seal) > SEAL_MAX_CODE_POINTS) {
    throw new VerdictSchemaError('seal_too_long')
  }

  return {
    crime: values.crime,
    verdict: values.verdict,
    sentence: values.sentence,
    seal: values.seal,
  }
}
