import { QUESTIONS } from '../content/questions'
import { validateAnswers } from './answers'
import type { ReportAnswers } from './report-types'

export const DRAFT_STORAGE_KEY = 'viral:year-report:draft:v1'

export interface DraftV1 {
  version: 1
  reportYear: number
  currentQuestion: number
  answers: ReportAnswers
  updatedAt: number
}

export type DraftLoadResult =
  | { status: 'found'; draft: DraftV1 }
  | { status: 'missing' | 'invalid' | 'disabled' }

/**
 * 草稿只落当前设备的 localStorage。
 * `storage` 传 null 表示用户选了「不保存草稿」，此时一行存储都不碰。
 */
export function loadDraft(storage: Storage | null, reportYear: number): DraftLoadResult {
  if (!storage) return { status: 'disabled' }

  let raw: string | null
  try {
    raw = storage.getItem(DRAFT_STORAGE_KEY)
  } catch {
    // 隐私模式或被策略拦截：当成读不到，不打断答题
    return { status: 'invalid' }
  }
  if (!raw) return { status: 'missing' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { status: 'invalid' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { status: 'invalid' }

  const candidate = parsed as Record<string, unknown>
  if (candidate.version !== 1) return { status: 'invalid' }
  if (typeof candidate.reportYear !== 'number' || !Number.isInteger(candidate.reportYear)) {
    return { status: 'invalid' }
  }
  // 只恢复同一年的草稿；去年的回顾不该混进今年
  if (candidate.reportYear !== reportYear) return { status: 'missing' }
  if (
    typeof candidate.currentQuestion !== 'number' ||
    !Number.isInteger(candidate.currentQuestion) ||
    candidate.currentQuestion < 0 ||
    candidate.currentQuestion >= QUESTIONS.length
  ) {
    return { status: 'invalid' }
  }
  if (!candidate.answers || typeof candidate.answers !== 'object' || Array.isArray(candidate.answers)) {
    return { status: 'invalid' }
  }
  const answers = candidate.answers as ReportAnswers
  if (validateAnswers(answers).length > 0) return { status: 'invalid' }

  return {
    status: 'found',
    draft: {
      version: 1,
      reportYear: candidate.reportYear,
      currentQuestion: candidate.currentQuestion,
      answers,
      updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : 0,
    },
  }
}

export function saveDraft(storage: Storage | null, draft: DraftV1): boolean {
  if (!storage) return false
  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    return true
  } catch {
    // 配额或隐私模式失败：答题继续，只是没有草稿
    return false
  }
}

export function clearDraft(storage: Storage | null): boolean {
  if (!storage) return false
  try {
    storage.removeItem(DRAFT_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

/** 读浏览器 localStorage；不可用时返回 null，调用方按「不保存草稿」处理 */
export function browserDraftStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
