import { wrapByLength, type DrawFn } from '@viral/shared'
import { questionById } from '../content/questions'
import { isGoalAnswer, type ReportAnswers } from '../lib/report-types'

export interface SummaryCardData {
  year: number
  /** 已经按用户勾选过滤过的答案：卡片只画这里面有的字段 */
  answers: ReportAnswers
}

const BG = '#0b0a1f'
const AURORA_PURPLE = '#7b5cff'
const AURORA_CYAN = '#34d8d0'
const INK = '#f4f1ff'
const MUTED = '#a7a2cc'
const SANS = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

const SAFE_LEFT = 110
const SAFE_BOTTOM = 200

function feelingLabel(answers: ReportAnswers): string | undefined {
  const value = answers['feeling-scale']
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const labels = questionById('feeling-scale').scaleLabels ?? []
  return labels[Math.min(labels.length, Math.max(1, Math.round(value))) - 1]
}

/**
 * 1080×1440 极光总结卡。
 * 层级：年份与关键词第一层，小胜利与明年留言第二层，年度感受第三层。
 * 只画传进来的字段——敏感内容默认就不在 answers 里；
 * 年度感受标明是「凭感觉选的一档」，不伪装成精确统计。
 */
export function makeSummaryCardDraw(data: SummaryCardData): DrawFn {
  return (ctx, size) => {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, size.width, size.height)

    // 弥散极光：横向色带叠加，减少动态效果的用户看到的是同一张静态卡
    ctx.globalAlpha = 0.22
    ctx.fillStyle = AURORA_PURPLE
    ctx.fillRect(0, 120, size.width, 320)
    ctx.fillStyle = AURORA_CYAN
    ctx.fillRect(0, 380, size.width, 220)
    ctx.globalAlpha = 0.14
    ctx.fillStyle = AURORA_PURPLE
    ctx.fillRect(0, size.height - 520, size.width, 300)
    ctx.globalAlpha = 1

    ctx.textAlign = 'left'
    ctx.fillStyle = MUTED
    ctx.font = `400 34px ${SANS}`
    ctx.fillText(`${data.year} 年度报告`, SAFE_LEFT, 200)

    // 第一层：关键词是全卡最大的字；没填就只留年份，不编一个词
    const keyword = typeof data.answers.keyword === 'string' ? data.answers.keyword : undefined
    let y = 380
    if (keyword) {
      ctx.fillStyle = INK
      ctx.font = `800 150px ${SANS}`
      for (const line of wrapByLength(keyword, 4)) {
        ctx.fillText(line, SAFE_LEFT, y)
        y += 170
      }
    } else {
      ctx.fillStyle = INK
      ctx.font = `800 130px ${SANS}`
      ctx.fillText(`${data.year}`, SAFE_LEFT, y)
      y += 150
    }

    ctx.fillStyle = AURORA_CYAN
    ctx.fillRect(SAFE_LEFT, y - 40, 160, 6)
    y += 70

    // 第二层：做成的小事与写给明年的话
    const smallWin = typeof data.answers['small-win'] === 'string' ? data.answers['small-win'] : undefined
    if (smallWin) {
      y = drawBlock(ctx, '做成了', smallWin, y, size.height)
    }
    const message =
      typeof data.answers['next-year-message'] === 'string' ? data.answers['next-year-message'] : undefined
    if (message) {
      y = drawBlock(ctx, '写给明年', message, y, size.height)
    }

    // 第二层补充：其他被勾选的字段照样只复述答案
    const place = typeof data.answers.place === 'string' ? data.answers.place : undefined
    if (place) y = drawBlock(ctx, '走过的地方', place, y, size.height)
    const song = typeof data.answers.song === 'string' ? data.answers.song : undefined
    if (song) y = drawBlock(ctx, '反复听的', song, y, size.height)
    const food = typeof data.answers['comfort-food'] === 'string' ? data.answers['comfort-food'] : undefined
    if (food) y = drawBlock(ctx, '反复吃的', food, y, size.height)
    const person =
      typeof data.answers['important-person'] === 'string' ? data.answers['important-person'] : undefined
    if (person) y = drawBlock(ctx, '很重要的人', person, y, size.height)
    const hardMoment = typeof data.answers['hard-moment'] === 'string' ? data.answers['hard-moment'] : undefined
    if (hardMoment) y = drawBlock(ctx, '最难熬的一刻', hardMoment, y, size.height)
    const goal = data.answers['goal-and-release']
    if (isGoalAnswer(goal)) {
      const text = goal.release.trim() === ''
        ? `年初的目标走到 ${goal.completion}%`
        : `年初的目标走到 ${goal.completion}%，放下了${goal.release}`
      y = drawBlock(ctx, '账单', text, y, size.height)
    }

    // 第三层：年度感受是娱乐量表
    const feeling = feelingLabel(data.answers)
    if (feeling && y < size.height - SAFE_BOTTOM) {
      ctx.fillStyle = MUTED
      ctx.font = `400 32px ${SANS}`
      ctx.fillText(`年度感受：${feeling}（凭感觉选的一档，不是统计）`, SAFE_LEFT, y)
    }

    ctx.fillStyle = MUTED
    ctx.font = `400 30px ${SANS}`
    ctx.fillText('年度报告 · 怪好玩', SAFE_LEFT, size.height - 90)
  }
}

/** 画一段「小标题 + 内容」，超出安全区就整段不画，宁缺不越界 */
function drawBlock(
  ctx: CanvasRenderingContext2D,
  caption: string,
  text: string,
  top: number,
  cardHeight: number,
): number {
  const lines = wrapByLength(text, 13)
  const blockHeight = 44 + lines.length * 60
  if (top + blockHeight > cardHeight - SAFE_BOTTOM) return top

  ctx.fillStyle = MUTED
  ctx.font = `400 30px ${SANS}`
  ctx.fillText(caption, SAFE_LEFT, top)

  ctx.fillStyle = INK
  ctx.font = `600 50px ${SANS}`
  let y = top + 66
  for (const line of lines) {
    ctx.fillText(line, SAFE_LEFT, y)
    y += 60
  }
  return y + 40
}
