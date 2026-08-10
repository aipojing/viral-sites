import { hourlyEquivalent } from './pay-math'
import type { SalarySettings } from './settings'
import { overlapMs, todayPayState, type TimeInterval } from './work-schedule'
import { localDateKey } from './time-local'

export type SceneId = 'meeting' | 'toilet' | 'idle' | 'queue' | 'custom'

export const SCENE_LABELS: Record<SceneId, string> = {
  meeting: '开会',
  toilet: '带薪如厕',
  idle: '发呆',
  queue: '排队',
  custom: '自定义',
}

export function sceneLabel(fragment: { scene: SceneId; customLabel?: string }): string {
  return fragment.scene === 'custom' && fragment.customLabel
    ? fragment.customLabel
    : SCENE_LABELS[fragment.scene]
}

// 埋点时长桶：只带枚举，不带具体时长数值。
export type DurationBucket = 'lt1m' | '1to5m' | '5to15m' | '15to30m' | 'gt30m'

export function durationBucket(durationMs: number): DurationBucket {
  const minutes = durationMs / 60_000
  if (minutes < 1) return 'lt1m'
  if (minutes < 5) return '1to5m'
  if (minutes < 15) return '5to15m'
  if (minutes < 30) return '15to30m'
  return 'gt30m'
}

export const CUSTOM_LABEL_MAX_CODE_POINTS = 12

export interface ActiveFragment {
  id: string
  scene: SceneId
  customLabel?: string
  startedAtMs: number
  rateAtStart: number
  paidIntervalsAtStart: readonly TimeInterval[]
  settingsEffectiveFrom: string
}

export interface FragmentResult extends ActiveFragment {
  endedAtMs: number
  durationMs: number
  paidDurationMs: number
  equivalent: number
}

// NFC 归一并按 Unicode code point 截断，防止组合字符绕过长度限制。
export function normalizeCustomLabel(label: string): string {
  return Array.from(label.normalize('NFC').trim()).slice(0, CUSTOM_LABEL_MAX_CODE_POINTS).join('')
}

// 片段开始时快照当时费率与当天带薪区间；之后修改设置不影响该片段。
export function startFragment(
  scene: SceneId,
  now: Date,
  settings: SalarySettings,
  customLabel?: string,
  forceWorkday = false,
): ActiveFragment {
  if (scene === 'custom') {
    const label = normalizeCustomLabel(customLabel ?? '')
    if (label.length === 0) throw new Error('自定义场景必须有名字')
    return buildFragment(scene, now, settings, label, forceWorkday)
  }
  return buildFragment(scene, now, settings, undefined, forceWorkday)
}

function buildFragment(
  scene: SceneId,
  now: Date,
  settings: SalarySettings,
  customLabel?: string,
  forceWorkday = false,
): ActiveFragment {
  return {
    id: crypto.randomUUID(),
    scene,
    ...(customLabel !== undefined ? { customLabel } : {}),
    startedAtMs: now.getTime(),
    rateAtStart: hourlyEquivalent(settings),
    paidIntervalsAtStart: todayPayState(settings, now, forceWorkday).intervals,
    settingsEffectiveFrom: settings.effectiveFrom,
  }
}

// 按场景汇总指定日期的带薪时长；日报卡只展示时间分布，不汇总金额。
export function paidDurationsByScene(
  fragments: readonly FragmentResult[],
  dateKey: string,
): Record<SceneId, number> {
  const totals: Record<SceneId, number> = { meeting: 0, toilet: 0, idle: 0, queue: 0, custom: 0 }
  for (const fragment of fragments) {
    if (localDateKey(new Date(fragment.endedAtMs)) === dateKey) {
      totals[fragment.scene] += fragment.paidDurationMs
    }
  }
  return totals
}

// 片段等值 = 片段与带薪区间的交集 × 创建时费率。
// 它属于今日金额的切片，不会被再加到今日累计上。
export function finishFragment(active: ActiveFragment, now: Date): FragmentResult {
  const endedAtMs = now.getTime()
  if (endedAtMs < active.startedAtMs) throw new Error('片段结束时间不能早于开始时间')

  const durationMs = endedAtMs - active.startedAtMs
  const paidDurationMs = overlapMs(
    { startMs: active.startedAtMs, endMs: endedAtMs },
    active.paidIntervalsAtStart,
  )
  return {
    ...active,
    endedAtMs,
    durationMs,
    paidDurationMs,
    equivalent: (paidDurationMs / 3_600_000) * active.rateAtStart,
  }
}
