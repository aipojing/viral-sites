import type { DrawFn } from '@viral/shared'
import { PALETTE } from '../lib/palette'
import { QUIZZES, type QuizId } from '../lib/questions'
import { fillWrappedText, mulberry32, wobblyLine, wobblyRect } from './doodle'
import { createQrMatrix } from './qr-matrix'

export const CARD_SEED = 42
export const BRAND_TEXT = '默契度测试 · viral-sites'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

function drawQr(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  boxSize: number,
) {
  const qr = createQrMatrix(value)
  const quiet = 4
  const moduleSize = Math.floor(boxSize / (qr.size + quiet * 2))
  const actual = moduleSize * (qr.size + quiet * 2)
  const startX = x + (boxSize - actual) / 2 + quiet * moduleSize
  const startY = y + (boxSize - actual) / 2 + quiet * moduleSize

  ctx.fillStyle = PALETTE.paper
  ctx.fillRect(x, y, boxSize, boxSize)
  ctx.fillStyle = PALETTE.ink
  for (const [row, col] of qr.darkModules) {
    ctx.fillRect(
      startX + col * moduleSize,
      startY + row * moduleSize,
      moduleSize,
      moduleSize,
    )
  }
}

export function makeInviteCardDraw(
  quiz: QuizId,
  nickname: string,
  url: string,
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

    ctx.strokeStyle = PALETTE.redPen
    ctx.lineWidth = 4
    wobblyLine(ctx, size.width / 2 - 300, 700, size.width / 2 + 300, 700, rand)

    ctx.fillStyle = PALETTE.redPen
    ctx.font = `700 48px ${FONT}`
    ctx.fillText('扫码答题，看看我们到底多默契', size.width / 2, 800)

    const qrBox = 360
    drawQr(ctx, url, (size.width - qrBox) / 2, 860, qrBox)

    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 38px ${FONT}`
    ctx.fillText(`—— ${QUIZZES[quiz].name} · 10 题`, size.width / 2, 1280)

    ctx.font = `400 32px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 100)
  }
}
