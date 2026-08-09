/** 与 worker/types.ts 保持一致；前端不直接 import worker 代码，避免打包进浏览器 bundle */
export interface Verdict {
  crime: string
  verdict: string
  sentence: string
  seal: string
}

export type VerdictSource = 'model' | 'cache' | 'fallback'

export interface VerdictResult {
  verdict: Verdict
  source: VerdictSource
}

export function codePoints(value: string): number {
  let count = 0
  for (const _ of value) count += 1
  return count
}

/** 前端不信任 Worker JSON：按同一 schema 复查一遍，越界视为无效 */
export function isValidVerdict(value: unknown): value is Verdict {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  const fields = ['crime', 'verdict', 'sentence', 'seal'] as const
  for (const field of fields) {
    if (typeof candidate[field] !== 'string' || (candidate[field] as string).trim().length === 0) return false
  }
  const verdict = candidate as unknown as Verdict
  return (
    codePoints(verdict.crime) <= 8 &&
    codePoints(verdict.verdict) >= 60 &&
    codePoints(verdict.verdict) <= 90 &&
    codePoints(verdict.sentence) <= 24 &&
    codePoints(verdict.seal) <= 16
  )
}
