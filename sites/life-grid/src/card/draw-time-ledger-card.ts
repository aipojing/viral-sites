import type { DrawFn } from '@viral/shared'
import { roundDisplayYears, formatHours, type LedgerCategory, type TimeLedgerResult } from '../lib/time-ledger'

const BRAND_TEXT = '人生进度条 · viral-sites'

export interface TimeLedgerCardData {
  freeYears: number
  weekly: TimeLedgerResult['weekly']
  remainingYears: TimeLedgerResult['remainingYears']
  screenYears: number | null
}

const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  sleep: '睡眠',
  work: '工作/上课',
  commute: '通勤',
  necessary: '家务与必要事务',
  free: '自由时间',
}

const CATEGORY_COLORS: Record<LedgerCategory, string> = {
  sleep: '#5b7a8c',
  work: '#8a8474',
  commute: '#b0a58c',
  necessary: '#7d8a6d',
  free: '#c8b98c',
}

// 五类全覆盖，顺序即展示顺序
const CATEGORY_ROWS: LedgerCategory[] = ['free', 'sleep', 'work', 'commute', 'necessary']

function observationLine(data: TimeLedgerCardData): string {
  if (data.screenYears !== null && data.screenYears >= data.freeYears) {
    return '屏幕时间比自由时间还长，它们可能互相重叠。'
  }
  return '余下的自由时间，值得记下来。'
}

export function makeTimeLedgerCardDraw(data: TimeLedgerCardData): DrawFn {
  return (ctx, size) => {
    // 方格作业本纸面：纸白底 + 浅青蓝格线
    ctx.fillStyle = '#f7f4ec'
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.fillStyle = 'rgba(185, 205, 212, 0.35)'
    for (let x = 24; x < size.width; x += 24) ctx.fillRect(x, 0, 1, size.height)
    for (let y = 24; y < size.height; y += 24) ctx.fillRect(0, y, size.width, 1)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#3a3833'
    ctx.font = '600 56px "Songti SC", "Noto Serif SC", serif'
    ctx.fillText('余生时间账单', size.width / 2, 110)

    ctx.fillStyle = '#6d675b'
    ctx.font = '400 30px -apple-system, sans-serif'
    ctx.fillText('按现在的作息，一周 168 小时怎么分', size.width / 2, 168)

    // 自由时间大数字（第一视觉层）
    ctx.fillStyle = '#c8392b'
    ctx.font = '700 140px -apple-system, sans-serif'
    ctx.fillText(`${roundDisplayYears(data.freeYears)} 年`, size.width / 2, 330)
    ctx.fillStyle = '#3a3833'
    ctx.font = '400 36px -apple-system, sans-serif'
    ctx.fillText('余生属于自由时间', size.width / 2, 398)

    // 五类账本：色块 + 名称在左，年数与每周小时在右
    const startY = 490
    const rowGap = 76
    CATEGORY_ROWS.forEach((category, index) => {
      const y = startY + index * rowGap
      ctx.fillStyle = CATEGORY_COLORS[category]
      ctx.fillRect(90, y - 24, 24, 24)
      ctx.textAlign = 'left'
      ctx.fillStyle = '#3a3833'
      ctx.font = '400 34px -apple-system, sans-serif'
      ctx.fillText(CATEGORY_LABELS[category], 134, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#6d675b'
      ctx.font = '400 30px -apple-system, sans-serif'
      ctx.fillText(
        `${roundDisplayYears(data.remainingYears[category])} 年 · 每周 ${formatHours(data.weekly[category])} 小时`,
        990,
        y,
      )
    })
    ctx.textAlign = 'center'

    let noteY = startY + CATEGORY_ROWS.length * rowGap + 30
    if (data.screenYears !== null) {
      ctx.fillStyle = 'rgba(176, 165, 140, 0.16)'
      ctx.fillRect(90, noteY - 44, 900, 88)
      ctx.fillStyle = '#6d675b'
      ctx.font = '400 28px -apple-system, sans-serif'
      ctx.fillText(
        `屏幕时间相当于余生约 ${roundDisplayYears(data.screenYears)} 年（可能与各项重叠，不扣自由时间）`,
        size.width / 2,
        noteY + 8,
      )
      noteY += 130
    }

    ctx.fillStyle = '#3a3833'
    ctx.font = '400 34px -apple-system, sans-serif'
    ctx.fillText(observationLine(data), size.width / 2, noteY + 20)

    ctx.fillStyle = '#6d675b'
    ctx.font = '400 26px -apple-system, sans-serif'
    ctx.fillText('按当前习惯估算 · 只是时间尺度投影，不是预测也不是建议', size.width / 2, noteY + 88)

    ctx.fillStyle = '#6d675b'
    ctx.font = '400 30px -apple-system, sans-serif'
    ctx.fillText(BRAND_TEXT, size.width / 2, 1380)
  }
}
