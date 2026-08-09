export const NICKNAME_MAX_CODE_POINTS = 12
export const INTRO_MAX_CODE_POINTS = 40

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class JudgeInputError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'JudgeInputError'
    this.code = code
  }
}

export interface JudgeInput {
  nickname: string
  intro?: string
  dailyId: string
}

export interface NormalizedJudgeInput {
  nickname: string
  intro: string
  dailyId: string
}

function codePointLength(value: string): number {
  let count = 0
  for (const _ of value) count += 1
  return count
}

function normalizeText(value: string): string {
  return value.trim().normalize('NFC')
}

/**
 * 校验并归一化判官输入。只拒绝结构非法与越界内容，敏感词由 safety 分类器负责。
 * 所有字段按 NFC + trim 归一化；计数一律按 Unicode code point。
 */
export function normalizeJudgeInput(raw: unknown): NormalizedJudgeInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new JudgeInputError('invalid_body')
  }
  const body = raw as Record<string, unknown>

  if (typeof body.nickname !== 'string') throw new JudgeInputError('invalid_nickname')
  const nickname = normalizeText(body.nickname)
  if (nickname.length === 0) throw new JudgeInputError('empty_nickname')
  if (codePointLength(nickname) > NICKNAME_MAX_CODE_POINTS) {
    throw new JudgeInputError('nickname_too_long')
  }

  let intro = ''
  if (body.intro !== undefined) {
    if (typeof body.intro !== 'string') throw new JudgeInputError('invalid_intro')
    intro = normalizeText(body.intro)
    if (codePointLength(intro) > INTRO_MAX_CODE_POINTS) {
      throw new JudgeInputError('intro_too_long')
    }
  }

  if (typeof body.dailyId !== 'string' || !UUID_PATTERN.test(body.dailyId.trim())) {
    throw new JudgeInputError('invalid_daily_id')
  }

  return { nickname, intro, dailyId: body.dailyId.trim() }
}
