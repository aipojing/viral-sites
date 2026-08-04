import type { DrawFn } from '@viral/shared'
import { levelMeta } from '../content/pools'
import type { Fortune } from '../lib/fortune-math'
import { DEVOUT_STREAK } from '../lib/streak'

export const CARD_COLORS = {
  paper: '#f4e8cd',
  ink: '#2b2620',
  faded: '#6f6353',
  vermilion: '#bc3a23',
} as const

const BRAND_TEXT = '赛博求签 · 电子黄历'
const SERIF = '"Songti SC", "Noto Serif SC", "SimSun", serif'
const SANS = '-apple-system, "PingFang SC", sans-serif'

function drawVerticalLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  yStart: number,
  step: number,
): void {
  Array.from(text).forEach((ch, i) => ctx.fillText(ch, x, yStart + i * step))
}

function drawSeal(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  angle: number,
  fontPx: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.strokeStyle = CARD_COLORS.vermilion
  ctx.lineWidth = Math.max(4, Math.floor(size / 18))
  ctx.strokeRect(-size / 2, -size / 2, size, size)
  ctx.fillStyle = CARD_COLORS.vermilion
  ctx.font = `700 ${fontPx}px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.fillText(text, 0, fontPx / 3)
  ctx.restore()
}

function drawLabelBox(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  bg: string,
): void {
  ctx.fillStyle = bg
  ctx.fillRect(x, y, 72, 72)
  ctx.fillStyle = CARD_COLORS.paper
  ctx.font = `700 48px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.fillText(label, x + 36, y + 52)
}

export function makeFortuneCardDraw(fortune: Fortune, streak: number): DrawFn {
  return (ctx, size) => {
    const accent = levelMeta(fortune.level).accent

    ctx.fillStyle = CARD_COLORS.paper
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.strokeStyle = CARD_COLORS.vermilion
    ctx.lineWidth = 6
    ctx.strokeRect(28, 28, size.width - 56, size.height - 56)
    ctx.lineWidth = 2
    ctx.strokeRect(48, 48, size.width - 96, size.height - 96)

    ctx.textAlign = 'center'
    ctx.fillStyle = CARD_COLORS.faded
    ctx.font = `400 34px ${SANS}`
    ctx.fillText(`${fortune.dateKey} · 打工人黄历`, size.width / 2, 130)

    drawSeal(ctx, '签', size.width - 150, 170, 110, Math.PI / 24, 52)

    ctx.fillStyle = accent
    ctx.font = `700 220px ${SERIF}`
    ctx.textAlign = 'center'
    ctx.fillText(fortune.level, size.width / 2, 400)

    ctx.fillStyle = CARD_COLORS.ink
    ctx.font = `400 44px ${SANS}`
    ctx.fillText(`${fortune.nickname} 的今日签`, size.width / 2, 490)

    ctx.font = `400 60px ${SERIF}`
    ctx.fillStyle = CARD_COLORS.ink
    drawVerticalLine(ctx, fortune.poem.lines[0], size.width / 2 + 80, 580, 64)
    drawVerticalLine(ctx, fortune.poem.lines[1], size.width / 2 - 80, 580, 64)

    drawLabelBox(ctx, '宜', 200, 1120, CARD_COLORS.vermilion)
    drawLabelBox(ctx, '忌', 620, 1120, CARD_COLORS.ink)
    ctx.fillStyle = CARD_COLORS.ink
    ctx.font = `400 38px ${SANS}`
    ctx.textAlign = 'left'
    ctx.fillText(fortune.yi[0].text, 300, 1150)
    ctx.fillText(fortune.yi[1].text, 300, 1200)
    ctx.fillText(fortune.ji[0].text, 720, 1150)
    ctx.fillText(fortune.ji[1].text, 720, 1200)

    ctx.textAlign = 'center'
    ctx.font = `400 36px ${SANS}`
    ctx.fillText(
      `贵人：${fortune.guiren.text} · 小人：${fortune.xiaoren.text}`,
      size.width / 2,
      1280,
    )

    ctx.fillStyle = CARD_COLORS.faded
    ctx.font = `400 32px ${SANS}`
    ctx.fillText(`连续求签第 ${streak} 天`, size.width / 2, 1340)
    if (streak >= DEVOUT_STREAK) {
      drawSeal(ctx, '虔诚', 880, 1300, 150, -Math.PI / 14, 52)
    }

    ctx.fillStyle = CARD_COLORS.faded
    ctx.font = `400 30px ${SANS}`
    ctx.textAlign = 'center'
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 70)
  }
}
