import { useMemo } from 'react'
import {
  computeTimeLedger,
  formatHours,
  roundDisplayYears,
  type HabitInput,
  type LedgerCategory,
} from '../lib/time-ledger'
import type { LifeInput } from '../lib/life-math'
import { CATEGORY_LABELS, TimeLedgerChart } from './time-ledger-chart'
import { SaveTimeLedgerButton } from './save-time-ledger-button'

interface Props {
  life: LifeInput
  habits: HabitInput
  onEdit: () => void
}

const CATEGORY_ORDER: LedgerCategory[] = ['free', 'sleep', 'work', 'commute', 'necessary']

export function TimeLedgerResult({ life, habits, onEdit }: Props) {
  const result = useMemo(() => computeTimeLedger(life, habits), [life, habits])
  const freeYears = roundDisplayYears(result.remainingYears.free)
  const screenHoursPerWeek =
    habits.screenHoursPerDay === undefined ? null : habits.screenHoursPerDay * 7

  return (
    <section className="flex flex-col gap-5" aria-label="余生时间账本">
      <div>
        <p className="text-sm text-[#6d675b]">按现在的作息，余生约有</p>
        <p className="mt-1 text-5xl font-semibold text-[#c8392b]">{freeYears} 年</p>
        <p className="mt-2 text-base text-[#6d675b]">属于自由时间</p>
      </div>

      <TimeLedgerChart weekly={result.weekly} screenHoursPerWeek={screenHoursPerWeek} />

      <ul className="flex flex-col gap-2 text-sm">
        {CATEGORY_ORDER.map((category) => (
          <li key={category} className="flex items-baseline justify-between gap-2">
            <span>{CATEGORY_LABELS[category]}</span>
            <span className="tabular-nums text-[#6d675b]">
              {roundDisplayYears(result.remainingYears[category])} 年 · 每周{' '}
              {formatHours(result.weekly[category])} 小时
            </span>
          </li>
        ))}
      </ul>

      {result.screenYears !== null && (
        <div className="rounded-lg border border-dashed border-[#d9d2c0] p-3 text-sm">
          <p className="font-medium">注意力旁账</p>
          <p className="mt-1 text-[#6d675b]">
            屏幕时间相当于余生约 {roundDisplayYears(result.screenYears)} 年。
            它可能与上面的时间重叠（比如边通勤边刷手机），不从自由时间里扣。
          </p>
        </div>
      )}

      <p className="text-xs leading-relaxed text-[#6d675b]">
        以下结果假设你保持现在的作息，只用来帮你看见时间尺度，不是医学建议，也不是对人生的预测。
        工作与通勤按退休年龄后停止计算；睡眠与必要事务投影到全部剩余时间。
      </p>
      <SaveTimeLedgerButton
        data={{
          freeYears: result.remainingYears.free,
          weekly: result.weekly,
          remainingYears: result.remainingYears,
          screenYears: result.screenYears,
        }}
      />
      <button
        type="button"
        onClick={onEdit}
        className="self-start rounded-md border border-[#d9d2c0] px-3 py-2 text-sm text-[#6d675b]"
      >
        调整口径
      </button>
    </section>
  )
}
