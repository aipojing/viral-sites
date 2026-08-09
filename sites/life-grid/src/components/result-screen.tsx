import type { ReactNode } from 'react'
import { computeStats, type LifeInput } from '../lib/life-math'
import { buildCopyLines } from '../lib/copy-lines'
import { LifeGridCanvas } from './life-grid-canvas'
import { TimeLedgerSection } from './time-ledger-section'

interface Props {
  input: LifeInput
  onRestart: () => void
  children?: ReactNode
}

export function ResultScreen({ input, onRestart, children }: Props) {
  const stats = computeStats(input)
  const lines = buildCopyLines(stats)
  const byId = new Map(lines.map((line) => [line.id, line.text]))
  const isBonus = stats.bonusWeeks > 0
  const secondaryIds = isBonus
    ? ([] as const)
    : (['weeks', 'workdays', 'blank'] as const)

  return (
    <section className="flex flex-col gap-7">
      <header data-testid="life-summary" className="flex flex-col gap-4">
        {isBonus ? (
          <div>
            <p className="text-sm text-[#6d675b]">你已经多赚了</p>
            <p className="mt-1 text-5xl font-semibold text-[#c8392b]">{stats.bonusWeeks} 周</p>
            <p className="mt-2 text-base text-[#6d675b]">接下来每一格都是奖励</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-[#6d675b]">你的人生已经走过</p>
              <p className="mt-1 text-6xl font-semibold text-[#c8392b]">{stats.percent}%</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm leading-relaxed">
              <p className="rounded-lg border border-[#d9d2c0] p-3">{byId.get('parents')}</p>
              <p className="rounded-lg border border-[#d9d2c0] p-3">{byId.get('festivals')}</p>
            </div>
          </>
        )}
      </header>

      <LifeGridCanvas weeksLived={stats.weeksLived} totalWeeks={stats.totalWeeks} />

      <ul className="flex flex-col gap-3">
        {secondaryIds.flatMap((id, index) => {
          const text = byId.get(id)
          return text ? [
            <li
              key={id}
              className="animate-[fade-in_0.6s_ease-out_both] text-base leading-relaxed"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {text}
            </li>,
          ] : []
        })}
      </ul>

      <div className="flex flex-col gap-3">
        {children}
        <TimeLedgerSection life={input} />
        <button type="button" onClick={onRestart} className="py-2 text-sm text-[#6d675b]">
          重新计算
        </button>
      </div>
    </section>
  )
}
