import type { TestConfig } from '@viral/shared'

interface Props {
  config: TestConfig
  onStart: () => void
}

export function LandingScreen({ config, onStart }: Props) {
  return (
    <section className="flex flex-col gap-6 pop-in">
      <div className="nb-card relative p-6">
        <p className="text-xs font-bold tracking-[0.3em]">精神状态检测系列 · 第 1 号</p>
        <h1 className="mt-3 text-4xl font-black leading-tight">{config.meta.title}</h1>
        <p className="mt-2 text-lg font-bold">{config.meta.subtitle}</p>
        <span className="stamp absolute -right-2 -top-4 text-xs">检测专用章</span>
      </div>
      <div className="nb-card p-5 text-sm leading-relaxed">
        <p>8 道题 · 60 秒 · 出具一份可以甩到工作群里的检测报告。</p>
        <p className="mt-2 text-xs">检测机构：班味研究所（未在任何机构注册）</p>
      </div>
      <button type="button" onClick={onStart} className="nb-btn nb-btn-primary py-4 text-lg">
        开始检测
      </button>
    </section>
  )
}
