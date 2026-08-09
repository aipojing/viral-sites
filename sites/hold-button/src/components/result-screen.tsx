import { milestoneAt, titleAt } from '../content/milestones'
import { formatDuration } from '../lib/format'
import { CopyChallengeButton } from './copy-challenge-button'
import { SaveCardButton } from './save-card-button'

export interface ResultScreenProps {
  durationMs: number
  percentile: number | null
  localOnly: boolean
  todayCount: number
  isNewBest: boolean
  challengeTarget: number | null
  challengeUrl: string
  onRetry: () => void
}

export function ResultScreen({
  durationMs,
  percentile,
  localOnly,
  todayCount,
  isNewBest,
  challengeTarget,
  challengeUrl,
  onRetry,
}: ResultScreenProps) {
  const title = titleAt(durationMs)
  const milestone = milestoneAt(durationMs)

  return (
    <main className="hb-screen flex min-h-dvh flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <header className="hb-card w-full max-w-sm px-6 py-8">
        <p className="hb-pixel-tag">本轮成绩</p>
        <p className="hb-duration mt-4">{formatDuration(durationMs)}</p>
        <p className="mt-3 text-lg font-bold text-[var(--hb-accent)]">{title.title}</p>
        <p className="mt-2 text-sm text-[var(--hb-ink-soft)]">{milestone.text}</p>
        {isNewBest && <p className="mt-3 text-sm text-[var(--hb-accent)]">新的本机纪录！</p>}
      </header>

      {localOnly ? (
        <p className="max-w-sm text-sm text-[var(--hb-ink-soft)]" role="status">
          成绩保留在本机。本次没能连上计分服务，不影响你的本机纪录。
        </p>
      ) : percentile !== null ? (
        <div className="max-w-sm text-sm" role="status">
          <p>你超过今天 {percentile}% 的参与者</p>
          {todayCount > 0 && <p className="mt-1 text-[var(--hb-ink-soft)]">今天共 {todayCount} 人一起按住</p>}
        </div>
      ) : (
        <p className="max-w-sm text-sm text-[var(--hb-ink-soft)]" role="status">
          正在核对今天的成绩分布……
        </p>
      )}

      {challengeTarget !== null && (
        <p className="max-w-sm text-sm">
          {durationMs > challengeTarget
            ? `挑战成功：你比对方多按了 ${formatDuration(durationMs - challengeTarget)}`
            : '这次没能超过对方，再来一次？'}
        </p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-3">
        <SaveCardButton
          data={{ durationMs, percentile, title: title.title, challengeUrl }}
        />
        <CopyChallengeButton url={challengeUrl} />
        <button type="button" className="hb-button hb-button--ghost" onClick={onRetry}>
          再来一次
        </button>
      </div>
    </main>
  )
}
