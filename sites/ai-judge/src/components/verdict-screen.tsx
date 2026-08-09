import type { ReactNode } from 'react'
import type { VerdictResult } from '../lib/verdict'

interface Props {
  result: VerdictResult
  onRestart: () => void
  /** Task 7 的保存按钮插槽 */
  children?: ReactNode
}

export function VerdictScreen({ result, onRestart, children }: Props) {
  const { verdict } = result

  return (
    <section className="flex flex-col gap-5">
      <article className="aj-card relative flex flex-col gap-5 p-6" aria-label="判词结果">
        <p className="text-xs font-bold tracking-[0.4em] text-[var(--aj-ink-soft)]">赛博衙门 · 判</p>

        <h1 className="text-4xl font-black leading-tight">{verdict.crime}</h1>

        <p className="border-y border-dashed border-[var(--aj-ink-soft)] py-4 text-base leading-8">{verdict.verdict}</p>

        <p className="text-lg font-bold">{verdict.sentence}</p>

        <div className="flex items-end justify-between">
          <span className="aj-seal text-sm">{verdict.seal}</span>
          {result.source === 'fallback' && (
            <span className="text-xs text-[var(--aj-ink-soft)]">衙门繁忙，此判由官印判词库出具</span>
          )}
        </div>
      </article>

      <div className="flex flex-col gap-3">
        {children}
        <button type="button" className="aj-btn aj-btn-ghost" onClick={onRestart}>
          再 审 一 案
        </button>
      </div>

      <p className="px-1 text-center text-xs leading-relaxed text-[var(--aj-ink-soft)]">
        判词由 AI 生成，纯属玩梗，不构成对任何人的评价。
      </p>
    </section>
  )
}
