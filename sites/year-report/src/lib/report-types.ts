/** 题号：顺序与 docs/18-year-report.md §3 的十问一致 */
export type QuestionId =
  | 'keyword'
  | 'place'
  | 'song'
  | 'comfort-food'
  | 'important-person'
  | 'small-win'
  | 'hard-moment'
  | 'feeling-scale'
  | 'goal-and-release'
  | 'next-year-message'

/** 章节：轻松进入 → 生活细节 → 情绪加深 → 带着希望结束 */
export type ChapterId = 'opening' | 'life' | 'feeling' | 'forward'

export type QuestionKind = 'text' | 'keyword' | 'scale' | 'goal'

export interface Question {
  id: QuestionId
  chapter: ChapterId
  prompt: string
  example: string
  /** 自由文本上限，按 Unicode code points 计；量表题没有上限 */
  maxLength?: number
  optional: boolean
  kind: QuestionKind
  /** 关键词题的备选词，用户仍可自填 */
  presets?: readonly string[]
  /** 量表题的五档说明 */
  scaleLabels?: readonly string[]
  /** 目标题第二格的题面 */
  releasePrompt?: string
  hint?: string
}

/** 年初目标完成度 + 一件已经不再责怪自己的事 */
export interface GoalAnswer {
  completion: number
  release: string
}

export type AnswerValue = string | number | GoalAnswer

export type ReportAnswers = Partial<Record<QuestionId, AnswerValue>>

export function isGoalAnswer(value: unknown): value is GoalAnswer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.completion === 'number' && typeof candidate.release === 'string'
}
