import { wrapByLength, type CardSize, type DrawFn } from '@viral/shared'

export interface LetterCardData {
  typeLabel: string
  tone: 'wenyan' | 'fafeng'
  text: string
  includeAddressee: boolean
}

const LETTER_COLORS = {
  paper: '#f5eeda',
  fold: '#e6dcc2',
  ink: '#2b2620',
  subtle: '#6f6656',
  accent: '#b3352c',
  accentLoud: '#ff3d7f',
} as const

const BRAND_TEXT = '道歉与请假 · viral-sites'
const SERIF = '"Songti SC", "Noto Serif SC", "SimSun", serif'
const SANS = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

const BODY_START_Y = 430
const BODY_LINE_HEIGHT = 60
const BODY_CHARS_PER_LINE = 16

export function makeLetterCardDraw(data: LetterCardData): DrawFn {
  return (ctx, size: CardSize) => {
    const accent = data.tone === 'fafeng' ? LETTER_COLORS.accentLoud : LETTER_COLORS.accent

    // 信纸底与折痕
    ctx.fillStyle = LETTER_COLORS.paper
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.fillStyle = LETTER_COLORS.fold
    ctx.fillRect(0, size.height * 0.3, size.width, 6)

    // 边框
    ctx.fillStyle = LETTER_COLORS.ink
    ctx.fillRect(64, 64, size.width - 128, 4)
    ctx.fillRect(64, size.height - 184, size.width - 128, 4)
    ctx.fillRect(64, 64, 4, size.height - 244)
    ctx.fillRect(size.width - 68, 64, 4, size.height - 244)

    // 抬头色条与类型
    ctx.fillStyle = accent
    ctx.fillRect(size.width / 2 - 160, 150, 320, 10)
    ctx.textAlign = 'center'
    ctx.fillStyle = LETTER_COLORS.ink
    ctx.font = `600 64px ${SERIF}`
    ctx.fillText(data.typeLabel, size.width / 2, 260)

    if (data.includeAddressee) {
      ctx.fillStyle = LETTER_COLORS.subtle
      ctx.font = `400 36px ${SERIF}`
      ctx.fillText('致 · 见信如晤', size.width / 2, 330)
    }

    // 正文换行，固定行距不越界
    ctx.fillStyle = LETTER_COLORS.ink
    ctx.font = `400 44px ${SERIF}`
    const lines = wrapByLength(data.text, BODY_CHARS_PER_LINE)
    lines.forEach((line, index) => {
      ctx.fillText(line, size.width / 2, BODY_START_Y + index * BODY_LINE_HEIGHT)
    })

    // 品牌条
    ctx.fillStyle = LETTER_COLORS.subtle
    ctx.font = `400 30px ${SANS}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 110)
  }
}
