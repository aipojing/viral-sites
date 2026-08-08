import type { CloseChainInput, CreateChainInput, SubmitBatonInput } from './types'

export type InputErrorCode =
  | 'required'
  | 'too_long'
  | 'invalid_character'
  | 'contact_not_allowed'

// 只暴露稳定错误 code，绝不把用户原文写进错误信息。
export class InputError extends Error {
  constructor(public readonly code: InputErrorCode) {
    super(code)
  }
}

export const NICKNAME_MAX_CODE_POINTS = 8
export const QUESTION_MAX_CODE_POINTS = 60
export const ANSWER_MAX_CODE_POINTS = 200
export const ANSWER_MAX_LINES = 3

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
// C0（允许换行 0x0a）+ DEL + C1 控制字符一律拒绝
const CONTROL_PATTERN = /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f\u0080-\u009f]/
const URL_PATTERN = /https?:\/\//i
const WWW_PATTERN = /www\./i
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PHONE_PATTERN = /\d{11}/

export function codePointLength(value: string): number {
  let length = 0
  for (const _char of value) length += 1
  return length
}

function baseNormalize(raw: unknown): string {
  if (typeof raw !== 'string') throw new InputError('required')
  return raw.normalize('NFC').replace(/\r\n?/g, '\n').trim()
}

function assertCleanText(text: string): void {
  if (CONTROL_PATTERN.test(text)) throw new InputError('invalid_character')
  if (
    URL_PATTERN.test(text) ||
    WWW_PATTERN.test(text) ||
    EMAIL_PATTERN.test(text) ||
    PHONE_PATTERN.test(text)
  ) {
    throw new InputError('contact_not_allowed')
  }
}

export function normalizeNickname(raw: unknown): string {
  const text = baseNormalize(raw)
  if (text === '') throw new InputError('required')
  assertCleanText(text)
  if (text.includes('\n')) throw new InputError('invalid_character')
  if (codePointLength(text) > NICKNAME_MAX_CODE_POINTS) throw new InputError('too_long')
  return text
}

export function normalizeQuestion(raw: unknown): string {
  const text = baseNormalize(raw)
  if (text === '') throw new InputError('required')
  assertCleanText(text)
  if (text.includes('\n')) throw new InputError('invalid_character')
  if (codePointLength(text) > QUESTION_MAX_CODE_POINTS) throw new InputError('too_long')
  return text
}

export function normalizeAnswer(raw: unknown): string {
  const text = baseNormalize(raw)
  if (text === '') throw new InputError('required')
  assertCleanText(text)
  const joined = text.split('\n').slice(0, ANSWER_MAX_LINES).join('\n').trim()
  if (joined === '') throw new InputError('required')
  if (codePointLength(joined) > ANSWER_MAX_CODE_POINTS) throw new InputError('too_long')
  return joined
}

export function parseRequestId(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim() === '') throw new InputError('required')
  const id = raw.trim().toLowerCase()
  if (!REQUEST_ID_PATTERN.test(id)) throw new InputError('invalid_character')
  return id
}

export function parseCreateChainInput(raw: {
  requestId?: unknown
  installationId?: unknown
  nickname?: unknown
  question?: unknown
}): CreateChainInput {
  return {
    requestId: parseRequestId(raw.requestId),
    installationId: parseRequestId(raw.installationId),
    nickname: normalizeNickname(raw.nickname),
    question: normalizeQuestion(raw.question),
  }
}

export function parseSubmitBatonInput(raw: {
  requestId?: unknown
  nickname?: unknown
  answer?: unknown
  question?: unknown
}): SubmitBatonInput {
  return {
    requestId: parseRequestId(raw.requestId),
    nickname: normalizeNickname(raw.nickname),
    answer: normalizeAnswer(raw.answer),
    question: normalizeQuestion(raw.question),
  }
}

export function parseCloseChainInput(raw: {
  requestId?: unknown
  answer?: unknown
}): CloseChainInput {
  return {
    requestId: parseRequestId(raw.requestId),
    answer: normalizeAnswer(raw.answer),
  }
}
