import { OPTION_COUNT, QUESTION_COUNT, type QuizId } from './questions'

export const NICKNAME_MAX = 8

export interface ChallengePayload {
  v: 1
  q: QuizId
  n: string
  a: readonly number[]
}

export function clampNickname(raw: string): string {
  return Array.from(raw.trim()).slice(0, NICKNAME_MAX).join('')
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array | null {
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function isValidAnswers(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === QUESTION_COUNT &&
    value.every((x) => Number.isInteger(x) && x >= 0 && x < OPTION_COUNT)
  )
}

export function encodeChallenge(
  quiz: QuizId,
  nickname: string,
  answers: readonly number[],
): string {
  if (!isValidAnswers([...answers])) throw new Error('answers must be 10 integers in 0~3')
  const payload: ChallengePayload = { v: 1, q: quiz, n: clampNickname(nickname), a: [...answers] }
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

export function decodeChallenge(d: string): ChallengePayload | null {
  const bytes = fromBase64Url(d)
  if (!bytes) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>
  if (obj.v !== 1) return null
  if (obj.q !== 'friend' && obj.q !== 'couple') return null
  if (typeof obj.n !== 'string') return null
  if (!isValidAnswers(obj.a)) return null
  return { v: 1, q: obj.q, n: clampNickname(obj.n), a: [...obj.a] }
}

export function buildChallengeUrl(origin: string, d: string): string {
  return `${origin}/c?d=${d}`
}
