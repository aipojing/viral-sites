import type { TestConfig } from '@viral/shared'

interface Props {
  config: TestConfig
  onStart: () => void
}

export function LandingScreen({ config, onStart }: Props) {
  return (
    <section className="slide-in flex flex-col gap-6">
      <div className="exam-paper p-6">
        <p className="text-center text-xs font-bold tracking-[0.3em] text-[#FF3E9D]">
          互联网网感统一测试卷
        </p>
        <h1 className="rainbow-text mt-3 text-center text-4xl font-black leading-tight">
          {config.meta.title}
        </h1>
        <p className="mt-2 text-center text-base font-bold">{config.meta.subtitle}</p>
        <p className="mars-text mt-3 text-center text-xs" aria-hidden="true">
          ↘莂问硪湜谁↙请到硪的空间踩一踩
        </p>
      </div>
      <div className="exam-paper p-5 text-sm leading-relaxed">
        <p>你的精神网龄，可能比身份证大 20 岁。</p>
        <p className="mt-2">
          8 道梗题 · 60 秒 · 出具成分报告：几成贴吧遗老、几成 QQ 空间贵族、几成小红书新贵。
        </p>
        <p className="mt-2 text-xs text-[#888888]">（满分 100 · 不设及格线 · 禁止代考）</p>
      </div>
      <button type="button" onClick={onStart} className="y2k-btn py-4 text-lg">
        开始答卷
      </button>
    </section>
  )
}
