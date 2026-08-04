import type { ReactNode } from 'react'
import { levelMeta } from '../content/pools'
import type { Fortune } from '../lib/fortune-math'
import { DEVOUT_STREAK } from '../lib/streak'

interface Props {
  fortune: Fortune
  streak: number
  isRepeat: boolean
  onRestart: () => void
  children?: ReactNode
}

export function FortuneView({ fortune, streak, isRepeat, onRestart, children }: Props) {
  const accent = levelMeta(fortune.level).accent
  return (
    <section className="flex flex-col items-center gap-6">
      {isRepeat && (
        <p className="text-sm font-medium" style={{ color: 'var(--cf-vermilion)' }}>
          心诚，一天一签
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--cf-ink-faded)' }}>
        {fortune.dateKey} · {fortune.nickname} 的今日签
      </p>
      <p className="font-serif-cn text-7xl font-bold" style={{ color: accent }}>
        {fortune.level}
      </p>
      <div className="vertical-text font-serif-cn h-56 text-xl leading-relaxed" aria-label="签诗">
        <p>{fortune.poem.lines[0]}</p>
        <p>{fortune.poem.lines[1]}</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-4 text-base">
        <div className="flex flex-col gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded font-serif-cn text-lg text-white"
            style={{ backgroundColor: 'var(--cf-vermilion)' }}
          >
            宜
          </span>
          <ul className="flex flex-col gap-1">
            {fortune.yi.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded font-serif-cn text-lg text-white"
            style={{ backgroundColor: 'var(--cf-ink)' }}
          >
            忌
          </span>
          <ul className="flex flex-col gap-1">
            {fortune.ji.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-sm">
        今日贵人：{fortune.guiren.text} · 今日小人：{fortune.xiaoren.text}
      </p>
      <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--cf-ink-faded)' }}>
        连续求签第 {streak} 天
        {streak >= DEVOUT_STREAK && <span className="cf-stamp font-serif-cn">虔诚</span>}
      </p>
      <div className="flex w-full flex-col gap-3">
        {children}
        <button
          type="button"
          onClick={onRestart}
          className="py-2 text-sm"
          style={{ color: 'var(--cf-ink-faded)' }}
        >
          回到签筒
        </button>
      </div>
    </section>
  )
}
