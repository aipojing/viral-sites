import { formatDuration } from '../lib/format'

interface Props {
  personalBest: number
  challengeTarget: number | null
  onStart: () => void
}

export function LandingScreen({ personalBest, challengeTarget, onStart }: Props) {
  return (
    <main className="hb-screen flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <header className="hb-card w-full max-w-sm px-6 py-8">
        <p className="hb-pixel-tag">HOLD · 挑战</p>
        <h1 className="mt-3 text-3xl font-black leading-tight">按住不放挑战</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--hb-ink-soft)]">
          按住屏幕别松手，看你能坚持多久。松手即结束，手机切走也算。
        </p>
      </header>

      {challengeTarget !== null && (
        <p className="hb-card w-full max-w-sm px-5 py-4 text-sm" role="status">
          有人按了 <strong className="text-[var(--hb-accent)]">{formatDuration(challengeTarget)}</strong>
          ，向你发来挑战：「你能按得比我久吗？」
        </p>
      )}

      {personalBest > 0 && (
        <p className="text-sm text-[var(--hb-ink-soft)]">
          本机纪录 <strong className="text-[var(--hb-ink)]">{formatDuration(personalBest)}</strong>
        </p>
      )}

      <button type="button" className="hb-button" onClick={onStart}>
        按住开始
      </button>
      <p className="text-xs text-[var(--hb-ink-soft)]">官方计分上限 20 分钟，纯匿名，不留 IP。</p>
    </main>
  )
}
