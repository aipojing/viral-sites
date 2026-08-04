import type { CardSize, DrawFn } from '@viral/shared'

export interface QuoteCardData {
  text: string
  sceneId: string
  sceneLabel: string
  sceneColor: string
  sceneIndex: number
  allSceneColors: readonly string[]
  toneId: string
  toneLabel: string
}

export const CARD_COLORS = {
  bentoBg: '#f2f3f5',
  bentoCard: '#ffffff',
  ink: '#1f2937',
  subtle: '#6b7280',
  paperBg: '#f5eeda',
  paperInk: '#2b2620',
  sealRed: '#b3352c',
  memeBg: '#ffe600',
  memeInk: '#111111',
  memePink: '#ff3d7f',
} as const

const BRAND_TEXT = '拒绝话术生成器 · 好好说不'
const SANS = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const SERIF = '"Songti SC", "Noto Serif SC", "SimSun", serif'

export function wrapByLength(text: string, charsPerLine: number): string[] {
  if (charsPerLine <= 0) return [text]
  const chars = [...text]
  if (chars.length === 0) return ['']
  const lines: string[] = []
  for (let i = 0; i < chars.length; i += charsPerLine) {
    lines.push(chars.slice(i, i + charsPerLine).join(''))
  }
  return lines
}

function drawBrandStrip(
  ctx: CanvasRenderingContext2D,
  size: CardSize,
  data: QuoteCardData,
  textColor: string,
) {
  const tile = 28
  const gap = 10
  const colors = [...data.allSceneColors, CARD_COLORS.ink]
  const totalWidth = colors.length * (tile + gap) - gap
  const x0 = (size.width - totalWidth) / 2
  const y = size.height - 150
  colors.forEach((color, i) => {
    const active = i === data.sceneIndex
    ctx.globalAlpha = active ? 1 : 0.3
    ctx.fillStyle = color
    const h = active ? tile + 10 : tile
    ctx.fillRect(x0 + i * (tile + gap), y - (h - tile), tile, h)
  })
  ctx.globalAlpha = 1
  ctx.fillStyle = textColor
  ctx.font = `400 30px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 60)
}

function drawStandardSkin(ctx: CanvasRenderingContext2D, size: CardSize, data: QuoteCardData) {
  ctx.fillStyle = CARD_COLORS.bentoBg
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.fillStyle = CARD_COLORS.bentoCard
  ctx.fillRect(80, 160, size.width - 160, size.height - 420)
  ctx.fillStyle = data.sceneColor
  ctx.fillRect(80, 160, 24, size.height - 420)
  ctx.textAlign = 'left'
  ctx.fillStyle = CARD_COLORS.subtle
  ctx.font = `400 36px ${SANS}`
  ctx.fillText(`${data.sceneLabel} · ${data.toneLabel}`, 150, 260)
  ctx.fillStyle = CARD_COLORS.ink
  ctx.font = `700 64px ${SANS}`
  ctx.fillText('今日拒绝语录', 150, 380)
  ctx.font = `500 56px ${SANS}`
  wrapByLength(data.text, 13).forEach((line, i) => {
    ctx.fillText(line, 150, 520 + i * 88)
  })
  drawBrandStrip(ctx, size, data, CARD_COLORS.subtle)
}

function drawClassicalSkin(ctx: CanvasRenderingContext2D, size: CardSize, data: QuoteCardData) {
  ctx.fillStyle = CARD_COLORS.paperBg
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.fillStyle = CARD_COLORS.paperInk
  ctx.fillRect(60, 60, size.width - 120, 4)
  ctx.fillRect(60, size.height - 224, size.width - 120, 4)
  ctx.fillRect(60, 60, 4, size.height - 280)
  ctx.fillRect(size.width - 64, 60, 4, size.height - 280)
  ctx.textAlign = 'center'
  ctx.font = `500 60px ${SERIF}`
  const columns = wrapByLength(data.text, 12)
  columns.forEach((column, colIndex) => {
    const x = size.width - 200 - colIndex * 96
    ;[...column].forEach((char, rowIndex) => {
      ctx.fillStyle = CARD_COLORS.paperInk
      ctx.fillText(char, x, 240 + rowIndex * 72)
    })
  })
  ctx.fillStyle = CARD_COLORS.sealRed
  ctx.fillRect(150, size.height - 440, 120, 120)
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 72px ${SERIF}`
  ctx.fillText('拒', 210, size.height - 352)
  ctx.fillStyle = CARD_COLORS.paperInk
  ctx.font = `400 34px ${SERIF}`
  ctx.fillText(`${data.sceneLabel} · ${data.toneLabel}`, size.width / 2, size.height - 190)
  drawBrandStrip(ctx, size, data, CARD_COLORS.paperInk)
}

function drawUnhingedSkin(ctx: CanvasRenderingContext2D, size: CardSize, data: QuoteCardData) {
  ctx.fillStyle = CARD_COLORS.memeBg
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.fillStyle = CARD_COLORS.memePink
  ctx.fillRect(0, 120, size.width, 130)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 72px ${SANS}`
  ctx.fillText('今日拒绝语录!!!', size.width / 2, 210)
  ctx.font = `900 68px ${SANS}`
  wrapByLength(data.text, 13).forEach((line, i) => {
    const y = 430 + i * 96
    ctx.fillStyle = CARD_COLORS.memePink
    ctx.fillText(line, size.width / 2 + 6, y + 6)
    ctx.fillStyle = CARD_COLORS.memeInk
    ctx.fillText(line, size.width / 2, y)
  })
  ctx.fillStyle = CARD_COLORS.memeInk
  ctx.fillRect(80, size.height - 270, 460, 70)
  ctx.textAlign = 'left'
  ctx.fillStyle = CARD_COLORS.memeBg
  ctx.font = `700 40px ${SANS}`
  ctx.fillText(`${data.sceneLabel} × ${data.toneLabel}`, 100, size.height - 222)
  drawBrandStrip(ctx, size, data, CARD_COLORS.memeInk)
}

export function makeQuoteCardDraw(data: QuoteCardData): DrawFn {
  return (ctx, size) => {
    if (data.toneId === 'wenyan') {
      drawClassicalSkin(ctx, size, data)
    } else if (data.toneId === 'fafeng') {
      drawUnhingedSkin(ctx, size, data)
    } else {
      drawStandardSkin(ctx, size, data)
    }
  }
}
