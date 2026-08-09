import type { LedgerCategory, TimeLedgerResult } from '../lib/time-ledger'
import { formatHours } from '../lib/time-ledger'

export interface TimeLedgerChartProps {
  weekly: TimeLedgerResult['weekly']
  screenHoursPerWeek: number | null
}

const CATEGORY_ORDER: LedgerCategory[] = ['sleep', 'work', 'commute', 'necessary', 'free']

export const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  sleep: '睡眠',
  work: '工作/上课',
  commute: '通勤',
  necessary: '家务与必要事务',
  free: '自由时间',
}

// 方格作业本配色：颜色只是辅助，图例同时给出文字与数值
const CATEGORY_COLORS: Record<LedgerCategory, string> = {
  sleep: '#5b7a8c',
  work: '#8a8474',
  commute: '#b0a58c',
  necessary: '#7d8a6d',
  free: '#efe9da',
}

/** 最大余数法：四舍五入后仍恰好 168 格 */
export function allocateWeekCells(
  weekly: Record<LedgerCategory, number>,
): Record<LedgerCategory, number> {
  const entries = Object.entries(weekly) as [LedgerCategory, number][]
  const floors = entries.map(([id, hours]) => ({ id, value: Math.floor(hours), rem: hours % 1 }))
  let left = 168 - floors.reduce((sum, item) => sum + item.value, 0)
  for (const item of [...floors].sort((a, b) => b.rem - a.rem)) {
    if (left-- <= 0) break
    item.value += 1
  }
  return Object.fromEntries(floors.map(({ id, value }) => [id, value])) as Record<
    LedgerCategory,
    number
  >
}

export function TimeLedgerChart({ weekly, screenHoursPerWeek }: TimeLedgerChartProps) {
  const cells = allocateWeekCells(weekly)
  const cellList = CATEGORY_ORDER.flatMap((category) =>
    Array.from({ length: cells[category] }, (_, i) => ({ category, index: i })),
  )

  return (
    <figure
      data-testid="ledger-chart"
      data-overlay={screenHoursPerWeek !== null ? 'true' : 'false'}
      className={
        screenHoursPerWeek !== null
          ? 'tl-screen-overlay rounded-lg border border-[#d9d2c0] p-3'
          : 'rounded-lg border border-[#d9d2c0] p-3'
      }
    >
      <div
        className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]"
        role="img"
        aria-label={`一周 168 小时时间账本：${CATEGORY_ORDER.map(
          (c) => `${CATEGORY_LABELS[c]} ${formatHours(weekly[c])} 小时`,
        ).join('，')}`}
      >
        {cellList.map(({ category, index }) => (
          <span
            key={`${category}-${index}`}
            data-testid="ledger-cell"
            aria-label={`${CATEGORY_LABELS[category]}第 ${index + 1} 小时`}
            className="aspect-square rounded-[2px]"
            style={{ backgroundColor: CATEGORY_COLORS[category] }}
          />
        ))}
      </div>
      <figcaption className="mt-3 flex flex-col gap-1 text-xs text-[#6d675b]">
        {CATEGORY_ORDER.map((category) => (
          <p key={category} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-[2px]"
              style={{ backgroundColor: CATEGORY_COLORS[category] }}
            />
            {CATEGORY_LABELS[category]}
            <span className="tabular-nums">{formatHours(weekly[category])} 小时/周</span>
          </p>
        ))}
        {screenHoursPerWeek !== null && (
          <p>屏幕时间 {formatHours(screenHoursPerWeek)} 小时/周（旁账，以斜纹底示意，可能与以上各项重叠）</p>
        )}
      </figcaption>
    </figure>
  )
}
