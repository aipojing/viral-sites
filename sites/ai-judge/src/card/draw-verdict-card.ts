import { wrapByLength, type DrawFn } from '@viral/shared'
import type { Verdict } from '../lib/verdict'

/** 米黄纸 / 墨黑 / 印泥红，与页面主题一致 */
const PAPER = '#f3e8ca'
const PAPER_DEEP = '#eaddb5'
const INK = '#26200f'
const SEAL = '#b3261e'
const BRAND_TEXT = 'AI 赛博判官 · 怪好玩'
const FONT = '"Songti SC", "STSong", "SimSun", "Noto Serif SC", serif'
const CHARS_PER_LINE = 17
/** 正文最大 90 字 → 最多 6 行，版式按最坏情况预留 */
const MAX_VERDICT_LINES = Math.ceil(90 / CHARS_PER_LINE)

function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, seal: string): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-Math.PI / 16)

  const half = 130
  ctx.lineWidth = 10
  ctx.strokeStyle = SEAL
  ctx.strokeRect(-half, -half, half * 2, half * 2)

  // 印章小字 ≤16 字：四字一格竖排，最多四列
  const chars = Array.from(seal)
  const cols = Math.ceil(chars.length / 4)
  ctx.fillStyle = SEAL
  ctx.textAlign = 'center'
  ctx.font = `700 56px ${FONT}`
  for (let col = 0; col < cols; col += 1) {
    const colChars = chars.slice(col * 4, col * 4 + 4)
    const x = half - 42 - col * 66
    colChars.forEach((char, row) => {
      ctx.fillText(char, x, -half + 62 + row * 64)
    })
  }
  ctx.restore()
}

export function makeVerdictCardDraw(verdict: Verdict): DrawFn {
  return (ctx, size) => {
    // 米黄纸底
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, size.width, size.height)

    // 判牍边框（双层墨线）
    const margin = 64
    ctx.lineWidth = 8
    ctx.strokeStyle = INK
    ctx.strokeRect(margin, margin, size.width - margin * 2, size.height - margin * 2 - 110)
    ctx.lineWidth = 2
    ctx.strokeRect(margin + 18, margin + 18, size.width - (margin + 18) * 2, size.height - (margin + 18) * 2 - 110)

    // 抬头
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.font = `700 40px ${FONT}`
    ctx.fillText('赛博衙门 · 判', size.width / 2, margin + 96)

    // 罪名大字：最长 8 字，按字数缩放保证不越界、缩略图可读
    const crimeChars = Array.from(verdict.crime).length
    const crimeFont = crimeChars <= 5 ? 148 : 118
    ctx.font = `900 ${crimeFont}px ${FONT}`
    ctx.fillText(verdict.crime, size.width / 2, margin + 96 + crimeFont + 30)

    // 朱红分隔线
    const ruleY = margin + 96 + crimeFont + 78
    ctx.fillStyle = SEAL
    ctx.fillRect(margin + 90, ruleY, size.width - (margin + 90) * 2, 6)

    // 判词正文（60～90 字，固定行宽换行）
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.font = `400 42px ${FONT}`
    let y = ruleY + 78
    for (const line of wrapByLength(verdict.verdict, CHARS_PER_LINE)) {
      ctx.fillText(line, margin + 76, y)
      y += 66
    }

    // 刑期梗：最长 24 字，换行保证不越界
    y = ruleY + 78 + MAX_VERDICT_LINES * 66 + 24
    ctx.font = `900 44px ${FONT}`
    for (const line of wrapByLength(verdict.sentence, 16)) {
      ctx.fillText(line, margin + 76, y)
      y += 60
    }

    // 朱红大印：签名元素
    drawSeal(ctx, size.width - margin - 210, size.height - 110 - 240, verdict.seal)

    // 赛博扫描线：低透明度横向纹理
    ctx.save()
    ctx.globalAlpha = 0.05
    ctx.fillStyle = INK
    for (let sy = 0; sy < size.height; sy += 8) {
      ctx.fillRect(0, sy, size.width, 2)
    }
    ctx.restore()

    // 品牌条
    ctx.fillStyle = INK
    ctx.fillRect(0, size.height - 110, size.width, 110)
    ctx.fillStyle = PAPER_DEEP
    ctx.textAlign = 'center'
    ctx.font = `700 40px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 42)
  }
}
