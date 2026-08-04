import type { ReactNode } from 'react'
import { computeStats, type LifeInput } from '../lib/life-math'
import { buildCopyLines } from '../lib/copy-lines'
import { LifeGridCanvas } from './life-grid-canvas'

interface Props {
  input: LifeInput
  onRestart: () => void
  children?: ReactNode
}

export function ResultScreen({ input, onRestart, children }: Props) {
  const stats = computeStats(input)
  const lines = buildCopyLines(stats)
  return (
    <section className="flex flex-col gap-8">
      <LifeGridCanvas weeksLived={stats.weeksLived} totalWeeks={stats.totalWeeks} />
      <ul className="flex flex-col gap-4">
        {lines.map((line, i) => (
          <li
            key={line.id}
            className="animate-[fade-in_0.6s_ease-out_both] text-lg leading-relaxed"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            {line.text}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        {children}
        <button type="button" onClick={onRestart} className="py-2 text-sm text-[#8c8678]">
          重新计算
        </button>
      </div>
    </section>
  )
}
