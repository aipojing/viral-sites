import { useMemo, useState, type ReactNode } from 'react'
import { SCENE_LABELS, type FragmentResult, type SceneId } from '../lib/fragment'
import { formatDuration, formatMoney, hourlyEquivalent } from '../lib/pay-math'
import type { SalarySettings } from '../lib/settings'
import { localDateKey } from '../lib/time-local'
import { todayPayState } from '../lib/work-schedule'

export interface DailySummaryProps {
  settings: SalarySettings
  now: Date
  fragments: readonly FragmentResult[]
  forceWorkday: boolean
  privacyMode: boolean
  onView: () => void
  /** 日报保存入口：接收总等值是否可见，决定卡片是否含金额 */
  children?: (amountVisible: boolean) => ReactNode
}

const SCENE_ORDER: readonly SceneId[] = ['meeting', 'toilet', 'idle', 'queue', 'custom']

export function DailySummary({
  settings,
  now,
  fragments,
  forceWorkday,
  privacyMode,
  onView,
  children,
}: DailySummaryProps) {
  // 总等值可能被反推薪资，默认隐藏，只在用户主动开启后显示。
  const [amountVisible, setAmountVisible] = useState(false)

  const todayKey = localDateKey(now)
  const payState = todayPayState(settings, now, forceWorkday)

  // 按场景汇总带薪时长；片段等值是今日金额切片，这里不二次加总。
  const sceneRows = useMemo(() => {
    const todayFragments = fragments.filter(
      (fragment) => localDateKey(new Date(fragment.endedAtMs)) === todayKey,
    )
    const byScene = new Map<SceneId, { paidMs: number; labels: string[] }>()
    for (const fragment of todayFragments) {
      const row = byScene.get(fragment.scene) ?? { paidMs: 0, labels: [] }
      row.paidMs += fragment.paidDurationMs
      if (fragment.scene === 'custom' && fragment.customLabel && !row.labels.includes(fragment.customLabel)) {
        row.labels.push(fragment.customLabel)
      }
      byScene.set(fragment.scene, row)
    }
    return SCENE_ORDER.filter((scene) => byScene.has(scene)).map((scene) => ({
      scene,
      label:
        scene === 'custom'
          ? (byScene.get(scene)?.labels ?? []).join('、') || SCENE_LABELS.custom
          : SCENE_LABELS[scene],
      paidMs: byScene.get(scene)?.paidMs ?? 0,
    }))
  }, [fragments, todayKey])

  const earned = (payState.earnedMs / 3_600_000) * hourlyEquivalent(settings)

  return (
    <details
      className="mt-6"
      onToggle={(event) => {
        if (event.currentTarget.open) onView()
      }}
    >
      <summary className="st-mono cursor-pointer text-xs tracking-[0.25em] text-[var(--st-ink-soft)]">
        今日小结
      </summary>

      <div className="mt-3 rounded border border-dashed border-[var(--st-line)] p-4">
        <dl className="st-mono space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>今日带薪已工作</dt>
            <dd>{formatDuration(payState.earnedMs)}</dd>
          </div>
          {sceneRows.map((row) => (
            <div key={row.scene} className="flex justify-between gap-2">
              <dt className="min-w-0 truncate">{row.label}</dt>
              <dd className="shrink-0">{formatDuration(row.paidMs)}</dd>
            </div>
          ))}
        </dl>

        {sceneRows.length === 0 && (
          <p className="mt-2 text-xs text-[var(--st-ink-soft)]">今天还没有计价片段。</p>
        )}

        <div className="st-dashed my-3" aria-hidden="true" />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={amountVisible}
            onChange={(event) => setAmountVisible(event.target.checked)}
          />
          显示今日总等值
        </label>
        {amountVisible && (
          <p className="st-mono mt-2 text-lg font-black">
            <span className={privacyMode ? 'st-privacy-blur' : ''} aria-label="今日总等值">
              {formatMoney(earned)}
            </span>
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--st-ink-soft)]">
          总等值可能被反推薪资，默认隐藏；日报分享前还会再确认一次。
        </p>

        {children?.(amountVisible)}
      </div>
    </details>
  )
}
