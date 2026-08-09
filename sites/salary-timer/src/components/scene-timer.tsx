import { useState } from 'react'
import {
  CUSTOM_LABEL_MAX_CODE_POINTS,
  SCENE_LABELS,
  sceneLabel,
  type ActiveFragment,
  type SceneId,
} from '../lib/fragment'
import { formatDuration, formatMoney } from '../lib/pay-math'
import { overlapMs } from '../lib/work-schedule'

const BUILT_IN_SCENES: readonly SceneId[] = ['meeting', 'toilet', 'idle', 'queue']

export interface SceneTimerProps {
  now: Date
  active: ActiveFragment | null
  privacyMode: boolean
  onStart: (scene: SceneId, customLabel?: string) => void
  onFinish: () => void
}

// 片段进行中按 now 与开始时的带薪区间交集推导，不累加状态。
export function liveEquivalent(active: ActiveFragment, now: Date): number {
  const paidMs = overlapMs(
    { startMs: active.startedAtMs, endMs: now.getTime() },
    active.paidIntervalsAtStart,
  )
  return (paidMs / 3_600_000) * active.rateAtStart
}

export function SceneTimer({ now, active, privacyMode, onStart, onFinish }: SceneTimerProps) {
  const [customLabel, setCustomLabel] = useState('')
  const amountClass = privacyMode ? 'st-privacy-blur' : ''

  if (active) {
    return (
      <section className="mt-6 text-center" aria-label="片段计价">
        <p className="st-mono text-xs tracking-[0.25em] text-[var(--st-ink-soft)]">计价中</p>
        <h3 className="mt-1 text-lg font-black">{sceneLabel(active)}</h3>
        <p className="st-mono mt-2 text-2xl font-black" aria-label="片段持续时间">
          {formatDuration(now.getTime() - active.startedAtMs)}
        </p>
        <p className="mt-1 text-sm">
          片段等值{' '}
          <span className={`st-mono font-bold ${amountClass}`} aria-label="片段工资等值">
            {formatMoney(liveEquivalent(active, now))}
          </span>
        </p>
        <button type="button" className="st-btn mt-4 w-full" onClick={onFinish}>
          结束并出小票
        </button>
        <p className="mt-2 text-xs text-[var(--st-ink-soft)]">
          片段等值是今日金额的切片，不会重复加总。
        </p>
      </section>
    )
  }

  return (
    <section className="mt-6" aria-label="快捷计价">
      <div className="st-dashed mb-4" aria-hidden="true" />
      <h3 className="st-mono text-xs tracking-[0.25em] text-[var(--st-ink-soft)]">快捷计价</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {BUILT_IN_SCENES.map((scene) => (
          <button
            key={scene}
            type="button"
            className="st-btn"
            onClick={() => onStart(scene)}
          >
            {SCENE_LABELS[scene]}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          const label = customLabel.trim()
          if (label.length === 0) return
          onStart('custom', label)
          setCustomLabel('')
        }}
      >
        <input
          className="st-mono min-w-0 flex-1 rounded border border-[var(--st-line)] bg-white px-3 py-2 text-sm"
          value={customLabel}
          onChange={(event) => setCustomLabel(event.target.value)}
          placeholder="自定义场景，例如等外卖"
          aria-label="自定义场景名"
          maxLength={CUSTOM_LABEL_MAX_CODE_POINTS * 4}
        />
        <button
          type="submit"
          className="st-btn"
          disabled={customLabel.trim().length === 0}
          aria-label="开始自定义计价"
        >
          开始
        </button>
      </form>
      <p className="mt-2 text-xs text-[var(--st-ink-soft)]">
        同一时间只能计一个片段；自定义名最多 {CUSTOM_LABEL_MAX_CODE_POINTS} 个字。
      </p>
    </section>
  )
}
