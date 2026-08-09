import type { ReactNode } from 'react'
import type { QuizResult, TestConfig } from '@viral/shared'

interface Props {
  config: TestConfig
  result: QuizResult
  onRestart: () => void
  children?: ReactNode
}

export function ReportScreen({ result, onRestart, children }: Props) {
  return (
    <section className="pop-in flex flex-col gap-5">
      <header className="nb-card relative p-5">
        <p className="text-sm font-black tracking-[0.2em]">精神状态检测报告</p>
        <span className="stamp absolute -right-2 -top-4 text-xs">检测完毕</span>
      </header>
      <div className="nb-card p-6 text-center">
        <p className="text-sm font-bold">你的班味浓度</p>
        <p className="mt-1 text-7xl font-black tabular-nums">{result.percent}%</p>
        <p className="mt-4 inline-block border-[3px] border-[#111111] bg-[#EFFF00] px-4 py-1 text-2xl font-black">
          {result.tier.title}
        </p>
      </div>
      <ul className="nb-card flex flex-col gap-3 p-5 text-base leading-relaxed">
        {result.tier.comments.map((comment) => (
          <li key={comment}>{comment}</li>
        ))}
      </ul>
      <div className="nb-card p-5 text-base leading-relaxed">
        <p>{result.tier.remedy}</p>
      </div>
      <div className="flex flex-col gap-3">
        {children}
        <button type="button" onClick={onRestart} className="py-2 text-sm font-bold underline">
          再测一次
        </button>
      </div>
    </section>
  )
}
