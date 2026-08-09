import { wrapByLength, type DrawFn, type QuizResult, type TestConfig } from '@viral/shared'

const INK = '#111111'
const YELLOW = '#EFFF00'
const WHITE = '#ffffff'
const BRAND_TEXT = '班味浓度检测 · viral-sites'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const CHARS_PER_LINE = 22

function drawStamp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  text: string,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-Math.PI / 14)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.lineWidth = 8
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.font = `900 ${Math.round(r * 0.3)}px ${FONT}`
  ctx.fillText(text, 0, r * 0.12)
  ctx.restore()
}

export function makeReportCardDraw(_config: TestConfig, result: QuizResult): DrawFn {
  return (ctx, size) => {
    ctx.fillStyle = YELLOW
    ctx.fillRect(0, 0, size.width, size.height)

    const card = { x: 60, y: 80, w: size.width - 120, h: size.height - 260 }
    ctx.fillStyle = INK
    ctx.fillRect(card.x + 20, card.y + 20, card.w, card.h)
    ctx.fillStyle = WHITE
    ctx.fillRect(card.x, card.y, card.w, card.h)
    ctx.lineWidth = 10
    ctx.strokeStyle = INK
    ctx.strokeRect(card.x, card.y, card.w, card.h)

    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.font = `900 72px ${FONT}`
    ctx.fillText('精神状态检测报告', size.width / 2, card.y + 130)

    ctx.font = `900 210px ${FONT}`
    ctx.fillText(`${result.percent}%`, size.width / 2, card.y + 390)

    const badge = { w: 600, h: 96 }
    const badgeX = (size.width - badge.w) / 2
    const badgeY = card.y + 440
    ctx.fillStyle = YELLOW
    ctx.fillRect(badgeX, badgeY, badge.w, badge.h)
    ctx.lineWidth = 6
    ctx.strokeRect(badgeX, badgeY, badge.w, badge.h)
    ctx.fillStyle = INK
    ctx.font = `900 56px ${FONT}`
    ctx.fillText(result.tier.title, size.width / 2, badgeY + 66)

    ctx.textAlign = 'left'
    let y = badgeY + 190
    for (const comment of result.tier.comments) {
      ctx.font = `400 36px ${FONT}`
      for (const line of wrapByLength(comment, CHARS_PER_LINE)) {
        ctx.fillText(line, card.x + 60, y)
        y += 52
      }
      y += 14
    }
    y += 10
    ctx.font = `900 36px ${FONT}`
    for (const line of wrapByLength(result.tier.remedy, CHARS_PER_LINE)) {
      ctx.fillText(line, card.x + 60, y)
      y += 52
    }

    drawStamp(ctx, card.x + card.w - 200, card.y + card.h - 190, 130, '检测专用章')
    drawStamp(ctx, card.x, card.y + 320, 90, '骑缝')

    ctx.fillStyle = INK
    ctx.fillRect(0, size.height - 110, size.width, 110)
    ctx.fillStyle = YELLOW
    ctx.textAlign = 'center'
    ctx.font = `700 40px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 42)
  }
}
