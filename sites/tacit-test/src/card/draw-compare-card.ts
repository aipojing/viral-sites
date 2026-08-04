import type { DrawFn } from '@viral/shared'
import { PALETTE } from '../lib/palette'
import type { QuizId } from '../lib/questions'
import type { ComparisonRow, Tier } from '../lib/scoring'
import { BRAND_TEXT, CARD_SEED } from './draw-invite-card'
import { fillWrappedText, mulberry32, wobblyLine, wobblyRect } from './doodle'

const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

export interface CompareCardData {
  quiz: QuizId
  initiatorName: string
  challengerName: string
  score: number
  tier: Tier
  highlight: ComparisonRow
}

export function makeCompareCardDraw(data: CompareCardData): DrawFn {
  return (ctx, size) => {
    const rand = mulberry32(CARD_SEED)
    ctx.fillStyle = PALETTE.paper
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.strokeStyle = data.tier.accent
    ctx.lineWidth = 6
    wobblyRect(ctx, 60, 60, size.width - 120, size.height - 120, rand)

    // 双人名字：蓝笔 ×（墨色）红笔 —— 签名元素「两种笔迹」
    ctx.font = `700 64px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillStyle = PALETTE.bluePen
    ctx.fillText(data.initiatorName, size.width / 2 - 70, 230)
    ctx.textAlign = 'center'
    ctx.fillStyle = PALETTE.ink
    ctx.fillText('×', size.width / 2, 230)
    ctx.textAlign = 'left'
    ctx.fillStyle = PALETTE.redPen
    ctx.fillText(data.challengerName, size.width / 2 + 70, 230)

    ctx.textAlign = 'center'
    ctx.fillStyle = data.tier.accent
    ctx.font = `800 250px ${FONT}`
    ctx.fillText(`${data.score}%`, size.width / 2, 560)

    ctx.fillStyle = PALETTE.ink
    ctx.font = `700 76px ${FONT}`
    ctx.fillText(data.tier.title, size.width / 2, 690)
    ctx.font = `400 42px ${FONT}`
    fillWrappedText(ctx, data.tier.remark, size.width / 2, 780, 22, 60)

    ctx.strokeStyle = data.tier.accent
    ctx.lineWidth = 4
    wobblyLine(ctx, size.width / 2 - 320, 920, size.width / 2 + 320, 920, rand)

    // 最有梗的一条逐题对比
    const label = data.highlight.matched
      ? `第 ${data.highlight.index + 1} 题你们想到一起了`
      : `第 ${data.highlight.index + 1} 题你们就分道扬镳`
    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 36px ${FONT}`
    ctx.fillText(label, size.width / 2, 1000)
    ctx.fillStyle = PALETTE.ink
    ctx.font = `400 40px ${FONT}`
    const afterQuestion = fillWrappedText(ctx, data.highlight.question, size.width / 2, 1060, 22, 56)
    ctx.fillStyle = PALETTE.bluePen
    ctx.fillText(
      `${data.initiatorName}：${data.highlight.initiatorOption}`,
      size.width / 2,
      afterQuestion + 30,
    )
    ctx.fillStyle = PALETTE.redPen
    ctx.fillText(
      `${data.challengerName}：${data.highlight.challengerOption}`,
      size.width / 2,
      afterQuestion + 96,
    )

    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 32px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 100)
  }
}
