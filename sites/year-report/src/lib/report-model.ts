import { questionById } from '../content/questions'
import { REPORT_LEADS } from '../content/transitions'
import { isAnswered } from './answers'
import { isGoalAnswer, type ReportAnswers } from './report-types'

export type ReportSlideKind = 'cover' | 'place' | 'senses' | 'person' | 'weather' | 'growth' | 'ending'

export interface ReportSlide {
  id: string
  kind: ReportSlideKind
  title: string
  lines: readonly string[]
}

function textAnswer(answers: ReportAnswers, id: Parameters<typeof isAnswered>[1]): string | undefined {
  const value = answers[id]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function scaleLabel(answers: ReportAnswers): string | undefined {
  const value = answers['feeling-scale']
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const labels = questionById('feeling-scale').scaleLabels ?? []
  return labels[Math.min(labels.length, Math.max(1, Math.round(value))) - 1]
}

/**
 * 报告是纯函数：页面只由用户填过的答案决定。
 * 页型顺序固定，缺答案就整页省略——绝不用「暂无数据」占位，也不从答案推断心理状态、
 * 人格或关系质量。文案里除了中性引导词，其余内容都直接来自答案原文。
 * 满答案 7 页；跳得越多报告越短，短报告也是诚实的报告。
 */
export function buildReportSlides(year: number, answers: ReportAnswers): readonly ReportSlide[] {
  const slides: ReportSlide[] = []

  const keyword = textAnswer(answers, 'keyword')
  slides.push({
    id: 'cover',
    kind: 'cover',
    title: `${year} 年`,
    // 阅读器已经把 REPORT_LEADS.cover 渲染成引导词，正文里不再重复一遍
    lines: keyword ? [keyword] : [],
  })

  const place = textAnswer(answers, 'place')
  if (place) {
    slides.push({ id: 'place', kind: 'place', title: REPORT_LEADS.place, lines: [place] })
  }

  const song = textAnswer(answers, 'song')
  const food = textAnswer(answers, 'comfort-food')
  if (song || food) {
    const lines: string[] = []
    if (song) lines.push(`反复听的：${song}`)
    if (food) lines.push(`反复吃的：${food}`)
    slides.push({ id: 'senses', kind: 'senses', title: REPORT_LEADS.senses, lines })
  }

  const person = textAnswer(answers, 'important-person')
  if (person) {
    slides.push({ id: 'person', kind: 'person', title: REPORT_LEADS.person, lines: [person] })
  }

  const feeling = scaleLabel(answers)
  const hardMoment = textAnswer(answers, 'hard-moment')
  if (feeling || hardMoment) {
    const lines: string[] = []
    if (feeling) lines.push(feeling)
    if (hardMoment) lines.push(`最难的一刻：${hardMoment}`)
    slides.push({ id: 'weather', kind: 'weather', title: REPORT_LEADS.weather, lines })
  }

  const smallWin = textAnswer(answers, 'small-win')
  const goal = answers['goal-and-release']
  if (smallWin || isGoalAnswer(goal)) {
    const lines: string[] = []
    if (smallWin) lines.push(`做成了：${smallWin}`)
    if (isGoalAnswer(goal)) {
      lines.push(`年初的目标走到 ${goal.completion}%`)
      if (goal.release.trim() !== '') lines.push(`已经放下：${goal.release}`)
    }
    slides.push({ id: 'growth', kind: 'growth', title: REPORT_LEADS.growth, lines })
  }

  const message = textAnswer(answers, 'next-year-message')
  slides.push({
    id: 'ending',
    kind: 'ending',
    title: REPORT_LEADS.ending,
    lines: message ? [message] : [`${year} 年就记到这里。`],
  })

  return slides
}
