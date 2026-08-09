import { QUESTION_IDS, questionById } from '../content/questions'
import { isGoalAnswer, type AnswerValue, type Question, type QuestionId, type ReportAnswers } from './report-types'

export const FEELING_SCALE_MIN = 1
export const FEELING_SCALE_MAX = 5
export const GOAL_RELEASE_MAX_LENGTH = 50

/** 按 Unicode code points 截断，避免把 emoji 或组合字符切成半个 */
export function truncateCodePoints(value: string, max: number): string {
  const points = [...value]
  return points.length <= max ? value : points.slice(0, max).join('')
}

function normalizeText(value: string, max: number): string {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  return truncateCodePoints(collapsed, max)
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

/**
 * 把用户输入归一为可存储的答案；空白、类型不符与非法数值统一变成「跳过」。
 * 归一只做截断与夹紧，绝不补内容。
 */
export function normalizeAnswer(question: Question, raw: AnswerValue | undefined): AnswerValue | undefined {
  if (raw === undefined || raw === null) return undefined

  if (question.kind === 'scale') {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined
    return clampInteger(raw, FEELING_SCALE_MIN, FEELING_SCALE_MAX)
  }

  if (question.kind === 'goal') {
    if (!isGoalAnswer(raw) || !Number.isFinite(raw.completion)) return undefined
    return {
      completion: Math.min(100, Math.max(0, Math.round(raw.completion))),
      release: normalizeText(raw.release, question.maxLength ?? GOAL_RELEASE_MAX_LENGTH),
    }
  }

  if (typeof raw !== 'string') return undefined
  const text = normalizeText(raw, question.maxLength ?? 0)
  return text === '' ? undefined : text
}

/** 整份答案归一：丢掉未知题号与归一后为空的答案 */
export function normalizeAnswers(answers: ReportAnswers): ReportAnswers {
  const result: ReportAnswers = {}
  for (const id of QUESTION_IDS) {
    const normalized = normalizeAnswer(questionById(id), answers[id])
    if (normalized !== undefined) result[id] = normalized
  }
  return result
}

/**
 * 校验答案，返回人类可读的问题清单。
 * 问题描述只带题号与原因，不带答案原文，便于安全地打日志。
 */
export function validateAnswers(answers: ReportAnswers): readonly string[] {
  const issues: string[] = []
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return ['答案不是一个对象']
  }

  const known = new Set<string>(QUESTION_IDS)
  for (const key of Object.keys(answers)) {
    if (!known.has(key)) issues.push(`${key}：未知题号`)
  }

  for (const id of QUESTION_IDS) {
    const value = answers[id]
    if (value === undefined) continue
    const question = questionById(id)

    if (question.kind === 'scale') {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        issues.push(`${id}：量表必须是整数`)
      } else if (value < FEELING_SCALE_MIN || value > FEELING_SCALE_MAX) {
        issues.push(`${id}：量表超出 ${FEELING_SCALE_MIN}～${FEELING_SCALE_MAX}`)
      }
      continue
    }

    if (question.kind === 'goal') {
      if (!isGoalAnswer(value)) {
        issues.push(`${id}：必须是完成度与放下的事`)
        continue
      }
      if (!Number.isInteger(value.completion) || value.completion < 0 || value.completion > 100) {
        issues.push(`${id}：完成度超出 0～100`)
      }
      if ([...value.release].length > (question.maxLength ?? GOAL_RELEASE_MAX_LENGTH)) {
        issues.push(`${id}：放下的事超过 ${question.maxLength ?? GOAL_RELEASE_MAX_LENGTH} 字`)
      }
      continue
    }

    if (typeof value !== 'string') {
      issues.push(`${id}：必须是文本`)
      continue
    }
    const max = question.maxLength ?? 0
    if ([...value].length > max) issues.push(`${id}：超过 ${max} 字`)
  }

  return issues
}

export function isAnsweredValue(value: AnswerValue | undefined): boolean {
  if (value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'number') return Number.isFinite(value)
  return isGoalAnswer(value)
}

export function isAnswered(answers: ReportAnswers, id: QuestionId): boolean {
  return isAnsweredValue(answers[id])
}

/** 已作答题数：用于进度与分享字段计数 */
export function answeredCount(answers: ReportAnswers): number {
  return QUESTION_IDS.filter((id) => isAnswered(answers, id)).length
}
