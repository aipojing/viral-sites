import { questionById } from '../content/questions'
import { isGoalAnswer, type AnswerValue, type QuestionId } from './report-types'

/**
 * 把一个答案渲染成一行可读文字：只复述用户写的内容，
 * 量表复述档位文案，目标题拼「走到 X% / 已经放下」，未作答返回 undefined。
 */
export function formatAnswer(id: QuestionId, value: AnswerValue | undefined): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'string') return value.trim() === '' ? undefined : value
  if (typeof value === 'number') {
    const labels = questionById(id).scaleLabels ?? []
    return labels[Math.min(labels.length, Math.max(1, Math.round(value))) - 1]
  }
  if (isGoalAnswer(value)) {
    const head = `走到 ${value.completion}%`
    return value.release.trim() === '' ? head : `${head}；已经放下：${value.release}`
  }
  return undefined
}
