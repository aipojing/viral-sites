import { wrapByLength, type DrawFn } from '@viral/shared'
import { formatDuration, formatMoney } from '../lib/pay-math'

/** 热敏小票：小票白 / 热敏灰 / 数字黑，与页面主题一致 */
const PAPER = '#f6f3ec'
const RECEIPT = '#fdfcf8'
const INK = '#1c1b18'
const INK_SOFT = '#6f6a5e'
const LINE = '#d8d2c4'
const MONO = '"SF Mono", "Menlo", "Consolas", monospace'
const BRAND_TEXT = '上班回本计算器 · 怪好玩'

export interface FragmentReceiptData {
  sceneLabel: string
  durationMs: number
  equivalent: number
  includeDate: boolean
  dateLabel?: string
  quip?: string
}

// 锯齿边：热敏小票的签名元素，用三角形齿实现。
function drawJaggedEdge(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, pointing: 'up' | 'down'): void {
  const tooth = 36
  const depth = 22
  ctx.fillStyle = RECEIPT
  ctx.beginPath()
  ctx.moveTo(x, y)
  const count = Math.floor(width / tooth)
  for (let i = 0; i < count; i += 1) {
    const tx = x + i * tooth
    const tipY = pointing === 'down' ? y + depth : y - depth
    ctx.lineTo(tx + tooth / 2, tipY)
    ctx.lineTo(tx + tooth, y)
  }
  ctx.lineTo(x + width, y)
  ctx.closePath()
  ctx.fill()
}

function drawDashedLine(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  ctx.strokeStyle = LINE
  ctx.lineWidth = 4
  ctx.beginPath()
  const dash = 26
  for (let dx = 0; dx < width; dx += dash * 2) {
    ctx.moveTo(x + dx, y)
    ctx.lineTo(x + Math.min(dx + dash, width), y)
  }
  ctx.stroke()
}

// 场景名最长 12 code points，按字数缩放保证不越界、缩略图可读。
function sceneFontSize(label: string): number {
  const chars = Array.from(label).length
  if (chars <= 5) return 132
  if (chars <= 8) return 96
  return 72
}

export function makeFragmentReceiptDraw(data: FragmentReceiptData): DrawFn {
  return (ctx, size) => {
    // 纸底与票据主体
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, size.width, size.height)
    const left = 90
    const width = size.width - left * 2
    const top = 120
    const bottom = size.height - 120
    ctx.fillStyle = RECEIPT
    ctx.fillRect(left, top, width, bottom - top)
    drawJaggedEdge(ctx, left, top, width, 'up')
    drawJaggedEdge(ctx, left, bottom, width, 'down')

    ctx.textAlign = 'center'

    // 抬头
    ctx.fillStyle = INK_SOFT
    ctx.font = `700 34px ${MONO}`
    ctx.fillText('F R A G M E N T   R E C E I P T', size.width / 2, top + 110)

    // 场景名大字
    let y = top + 110
    const sceneFont = sceneFontSize(data.sceneLabel)
    ctx.fillStyle = INK
    ctx.font = `900 ${sceneFont}px ${MONO}`
    y += sceneFont + 30
    for (const line of wrapByLength(data.sceneLabel, 8)) {
      ctx.fillText(line, size.width / 2, y)
      y += sceneFont + 12
    }

    if (data.includeDate && data.dateLabel) {
      ctx.fillStyle = INK_SOFT
      ctx.font = `400 36px ${MONO}`
      y += 24
      ctx.fillText(data.dateLabel, size.width / 2, y)
    }

    y += 48
    drawDashedLine(ctx, left + 70, y, width - 140)

    // 时长与等值：等宽数字
    y += 96
    ctx.font = `400 48px ${MONO}`
    ctx.fillStyle = INK_SOFT
    ctx.textAlign = 'left'
    ctx.fillText('持续时间', left + 90, y)
    ctx.fillStyle = INK
    ctx.textAlign = 'right'
    ctx.fillText(formatDuration(data.durationMs), left + width - 90, y)

    y += 96
    ctx.fillStyle = INK_SOFT
    ctx.textAlign = 'left'
    ctx.fillText('片段等值', left + 90, y)
    ctx.fillStyle = INK
    ctx.textAlign = 'right'
    ctx.font = `900 64px ${MONO}`
    ctx.fillText(formatMoney(data.equivalent), left + width - 90, y + 8)

    y += 72
    drawDashedLine(ctx, left + 70, y, width - 140)

    // 克制锐评：固定行宽换行
    if (data.quip) {
      ctx.fillStyle = INK_SOFT
      ctx.textAlign = 'center'
      ctx.font = `400 40px ${MONO}`
      y += 84
      for (const line of wrapByLength(data.quip, 15)) {
        ctx.fillText(line, size.width / 2, y)
        y += 60
      }
    }

    // 隐私承诺与免责
    ctx.fillStyle = INK_SOFT
    ctx.textAlign = 'center'
    ctx.font = `400 28px ${MONO}`
    ctx.fillText('小票不含月薪与时薪 · 时间等值不是工资单', size.width / 2, bottom - 60)

    // 品牌条
    ctx.fillStyle = INK
    ctx.fillRect(0, size.height - 96, size.width, 96)
    ctx.fillStyle = RECEIPT
    ctx.font = `700 40px ${MONO}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 34)
  }
}
