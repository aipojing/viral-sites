import { wrapByLength, type DrawFn } from '@viral/shared'
import { SCENE_LABELS, type SceneId } from '../lib/fragment'
import { formatDuration, formatMoney } from '../lib/pay-math'

const PAPER = '#f6f3ec'
const RECEIPT = '#fdfcf8'
const INK = '#1c1b18'
const INK_SOFT = '#6f6a5e'
const LINE = '#d8d2c4'
const MONO = '"SF Mono", "Menlo", "Consolas", monospace'
const BRAND_TEXT = '上班回本计算器 · 怪好玩'

const SCENE_ORDER: readonly SceneId[] = ['meeting', 'toilet', 'idle', 'queue', 'custom']

export interface DailyReceiptData {
  dateLabel: string
  sceneDurations: Readonly<Record<SceneId, number>>
  /** 默认 undefined：日报卡只展示时间分布，避免反推薪资 */
  totalEquivalent?: number
  customLabel?: string
}

export function makeDailyReceiptDraw(data: DailyReceiptData): DrawFn {
  return (ctx, size) => {
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, size.width, size.height)
    const left = 90
    const width = size.width - left * 2
    const top = 120
    const bottom = size.height - 120
    ctx.fillStyle = RECEIPT
    ctx.fillRect(left, top, width, bottom - top)

    ctx.textAlign = 'center'

    // 抬头与日期
    ctx.fillStyle = INK_SOFT
    ctx.font = `700 34px ${MONO}`
    ctx.fillText('D A I L Y   R E C E I P T', size.width / 2, top + 110)
    ctx.fillStyle = INK
    ctx.font = `900 88px ${MONO}`
    ctx.fillText(data.dateLabel, size.width / 2, top + 240)

    // 虚线分隔
    ctx.strokeStyle = LINE
    ctx.lineWidth = 4
    ctx.beginPath()
    const dash = 26
    for (let dx = 0; dx < width - 140; dx += dash * 2) {
      ctx.moveTo(left + 70 + dx, top + 310)
      ctx.lineTo(left + 70 + Math.min(dx + dash, width - 140), top + 310)
    }
    ctx.stroke()

    // 时间分布：只汇总带薪时长，不汇总金额
    let y = top + 420
    ctx.font = `400 48px ${MONO}`
    for (const scene of SCENE_ORDER) {
      const durationMs = data.sceneDurations[scene]
      if (durationMs <= 0) continue
      const label = scene === 'custom' && data.customLabel ? data.customLabel : SCENE_LABELS[scene]
      ctx.fillStyle = INK_SOFT
      ctx.textAlign = 'left'
      for (const line of wrapByLength(label, 12).slice(0, 1)) {
        ctx.fillText(line, left + 90, y)
      }
      ctx.fillStyle = INK
      ctx.textAlign = 'right'
      ctx.fillText(formatDuration(durationMs), left + width - 90, y)
      y += 88
    }

    // 总等值默认缺省；显示时只呈现最终数字
    if (typeof data.totalEquivalent === 'number') {
      y += 24
      ctx.strokeStyle = LINE
      ctx.beginPath()
      for (let dx = 0; dx < width - 140; dx += dash * 2) {
        ctx.moveTo(left + 70 + dx, y)
        ctx.lineTo(left + 70 + Math.min(dx + dash, width - 140), y)
      }
      ctx.stroke()
      y += 108
      ctx.fillStyle = INK_SOFT
      ctx.textAlign = 'left'
      ctx.fillText('今日总等值', left + 90, y)
      ctx.fillStyle = INK
      ctx.textAlign = 'right'
      ctx.font = `900 64px ${MONO}`
      ctx.fillText(formatMoney(data.totalEquivalent), left + width - 90, y + 8)
    }

    // 隐私承诺与免责
    ctx.fillStyle = INK_SOFT
    ctx.textAlign = 'center'
    ctx.font = `400 28px ${MONO}`
    const note =
      typeof data.totalEquivalent === 'number'
        ? '总等值为时间换算，不是工资单'
        : '本卡只有时间分布，不含任何金额'
    ctx.fillText(note, size.width / 2, bottom - 60)

    // 品牌条
    ctx.fillStyle = INK
    ctx.fillRect(0, size.height - 96, size.width, 96)
    ctx.fillStyle = RECEIPT
    ctx.font = `700 40px ${MONO}`
    ctx.textAlign = 'center'
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 34)
  }
}
