import type { ReactNode } from 'react'
import type { TagsResult, TestConfig } from '@viral/shared'
import { CompositionBars } from './composition-bars'

interface Props {
  config: TestConfig
  result: TagsResult
  onRestart: () => void
  children?: ReactNode
}

export function ReportScreen({ result, onRestart, children }: Props) {
  return (
    <section className="slide-in flex flex-col gap-5">
      <div className="exam-paper p-6 text-center">
        <p className="text-sm font-bold">你的精神网龄</p>
        <p className="rainbow-text mt-1 text-8xl font-black tabular-nums leading-none">
          {result.mentalAge}
        </p>
        <p className="mt-4 inline-block rounded-full border-[3px] border-[#FF3E9D] px-4 py-1 text-lg font-black text-[#FF3E9D]">
          {result.dominant.title}
        </p>
      </div>
      <div className="exam-paper p-5">
        <p className="mb-3 text-sm font-black">你的互联网成分</p>
        <CompositionBars composition={result.composition} />
      </div>
      <div className="exam-paper p-5 text-base leading-relaxed">
        <p>{result.comment}</p>
        <p className="mars-text mt-3 text-xs" aria-hidden="true">
          ↘这卷子莪给沵批完孒↙
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {children}
        <button
          type="button"
          onClick={onRestart}
          className="py-2 text-sm font-bold text-white underline [text-shadow:0_1px_0_rgba(0,0,0,0.35)]"
        >
          再考一次
        </button>
      </div>
    </section>
  )
}
