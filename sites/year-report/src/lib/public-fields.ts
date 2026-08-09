import { QUESTION_IDS } from '../content/questions'
import { isAnswered } from './answers'
import type { QuestionId, ReportAnswers } from './report-types'

export type PublicFieldId = QuestionId

/** 默认公开：只有这四项，其余需要用户自己打开 */
export const DEFAULT_PUBLIC_FIELDS: readonly PublicFieldId[] = [
  'keyword',
  'small-win',
  'feeling-scale',
  'next-year-message',
]

/** 默认关闭且在界面上单独提示的敏感字段 */
export const SENSITIVE_PUBLIC_FIELDS: readonly PublicFieldId[] = ['place', 'important-person', 'hard-moment']

export const PUBLIC_FIELD_LABELS: Record<PublicFieldId, string> = {
  keyword: '年度关键词',
  place: '去过的地方',
  song: '重复听的歌',
  'comfort-food': '安慰自己的一口',
  'important-person': '很重要的人',
  'small-win': '做成的小事',
  'hard-moment': '最难熬的一刻',
  'feeling-scale': '年度感受',
  'goal-and-release': '目标与放下的事',
  'next-year-message': '写给明年的话',
}

export interface PublicReportPayload {
  version: 1
  year: number
  answers: ReportAnswers
}

/**
 * 只挑出「用户勾选 且 确实作答」的字段。
 * 分享图和完整链接共用这一个函数，保证预览与实际公开内容一致。
 */
export function selectPublicAnswers(answers: ReportAnswers, fields: readonly PublicFieldId[]): ReportAnswers {
  const allowed = new Set(fields)
  const result: ReportAnswers = {}
  for (const id of QUESTION_IDS) {
    if (!allowed.has(id) || !isAnswered(answers, id)) continue
    result[id] = answers[id]
  }
  return result
}

/** 勾选/取消一个字段，结果按题号顺序排列，便于稳定比较 */
export function togglePublicField(
  fields: readonly PublicFieldId[],
  id: PublicFieldId,
): readonly PublicFieldId[] {
  const next = new Set(fields)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return QUESTION_IDS.filter((questionId) => next.has(questionId))
}

/** 会真正公开出去的字段数量：埋点只上报这个数字 */
export function publicFieldCount(answers: ReportAnswers, fields: readonly PublicFieldId[]): number {
  return Object.keys(selectPublicAnswers(answers, fields)).length
}
