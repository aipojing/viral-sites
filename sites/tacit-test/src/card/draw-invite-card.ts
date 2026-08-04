import type { DrawFn } from '@viral/shared'
import { PALETTE } from '../lib/palette'
import { QUIZZES, type QuizId } from '../lib/questions'
import { styleRemark } from '../lib/style-remark'
import { fillWrappedText, mulberry32, wobblyLine, wobblyRect } from './doodle'

export const CARD_SEED = 42
export const BRAND_TEXT = '默契度测试 · viral-sites'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

export function makeInviteCardDraw(
  quiz: QuizId,
  nickname: string,
  answers: readonly number[],
): DrawFn {
  return (ctx, size) => {
    const rand = mulberry32(CARD_SEED)
    ctx.fillStyle = PALETTE.paper
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.strokeStyle = PALETTE.bluePen
    ctx.lineWidth = 6
    wobblyRect(ctx, 60, 60, size.width - 120, size.height - 120, rand)

    ctx.textAlign = 'center'
    ctx.fillStyle = PALETTE.ink
    ctx.font = `700 76px ${FONT}`
    ctx.fillText('默契度挑战书', size.width / 2, 240)

    ctx.fillStyle = PALETTE.bluePen
    ctx.font = `700 104px ${FONT}`
    ctx.fillText(nickname, size.width / 2, 430)

    ctx.fillStyle = PALETTE.ink
    ctx.font = `400 44px ${FONT}`
    fillWrappedText(ctx, QUIZZES[quiz].declaration, size.width / 2, 560, 20, 64)
    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 38px ${FONT}`
    ctx.fillText(`—— ${QUIZZES[quiz].name} · 10 题`, size.width / 2, 740)

    ctx.strokeStyle = PALETTE.redPen
    ctx.lineWidth = 4
    wobblyLine(ctx, size.width / 2 - 300, 820, size.width / 2 + 300, 820, rand)

    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 36px ${FONT}`
    ctx.fillText('出题人的答题风格', size.width / 2, 920)
    ctx.fillStyle = PALETTE.ink
    ctx.font = `400 44px ${FONT}`
    fillWrappedText(ctx, styleRemark(answers), size.width / 2, 1000, 18, 66)

    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 32px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 100)
  }
}
