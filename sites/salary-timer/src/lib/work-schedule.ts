import type { SalarySettings, Weekday } from './settings'
import { addDays, clockOnDate, localDateKey, parseClock, parseDateKey } from './time-local'

export interface TimeInterval {
  startMs: number
  endMs: number
}

export type WorkStatus = 'before' | 'working' | 'break' | 'after' | 'off'

export interface TodayPayState {
  shiftDateKey: string
  status: WorkStatus
  earnedMs: number
  remainingPaidMs: number
  nextBoundaryMs: number | null
  intervals: readonly TimeInterval[]
}

const MINUTES_PER_DAY = 24 * 60

function weekdayOf(dateKey: string): number {
  const { year, monthIndex, day } = parseDateKey(dateKey)
  return new Date(year, monthIndex, day).getDay()
}

// 某天班次对应的带薪区间（本地毫秒时间轴）。
// 午休不带薪时拆成两段；午休带薪或未设置时为整段。跨午夜班次的结束点落在次日凌晨。
export function paidIntervalsForShift(settings: SalarySettings, shiftStartDate: Date): readonly TimeInterval[] {
  const dateKey = localDateKey(shiftStartDate)
  const startMin = parseClock(settings.shiftStart)
  let endMin = parseClock(settings.shiftEnd)
  if (endMin <= startMin) endMin += MINUTES_PER_DAY // 跨午夜班次

  if (settings.lunchStart && settings.lunchEnd && !settings.lunchPaid) {
    const lunchStartMin = parseClock(settings.lunchStart)
    const lunchEndMin = parseClock(settings.lunchEnd)
    return [
      { startMs: clockOnDate(dateKey, startMin).getTime(), endMs: clockOnDate(dateKey, lunchStartMin).getTime() },
      { startMs: clockOnDate(dateKey, lunchEndMin).getTime(), endMs: clockOnDate(dateKey, endMin).getTime() },
    ]
  }
  return [{ startMs: clockOnDate(dateKey, startMin).getTime(), endMs: clockOnDate(dateKey, endMin).getTime() }]
}

// 区间交集总时长；range 非法或无交集返回 0。
export function overlapMs(range: TimeInterval, intervals: readonly TimeInterval[]): number {
  let total = 0
  for (const interval of intervals) {
    const start = Math.max(range.startMs, interval.startMs)
    const end = Math.min(range.endMs, interval.endMs)
    if (end > start) total += end - start
  }
  return total
}

function buildPayState(shiftDateKey: string, intervals: readonly TimeInterval[], nowMs: number): TodayPayState {
  const shiftStartMs = intervals[0].startMs
  const shiftEndMs = intervals[intervals.length - 1].endMs

  let status: WorkStatus
  if (nowMs < shiftStartMs) {
    status = 'before'
  } else if (nowMs >= shiftEndMs) {
    status = 'after'
  } else if (intervals.some((interval) => nowMs >= interval.startMs && nowMs < interval.endMs)) {
    status = 'working'
  } else {
    status = 'break'
  }

  // 金额事实全部由 now 与带薪区间交集推导，不持有任何递增状态。
  const earnedMs = overlapMs({ startMs: shiftStartMs, endMs: Math.min(nowMs, shiftEndMs) }, intervals)
  const remainingPaidMs = overlapMs(
    { startMs: Math.max(nowMs, shiftStartMs), endMs: shiftEndMs },
    intervals,
  )

  const boundaries = intervals.flatMap((interval) => [interval.startMs, interval.endMs])
  const nextBoundaryMs = boundaries.find((boundary) => boundary > nowMs) ?? null

  return { shiftDateKey, status, earnedMs, remainingPaidMs, nextBoundaryMs, intervals }
}

export function todayPayState(settings: SalarySettings, now: Date, forceWorkday = false): TodayPayState {
  const nowMs = now.getTime()
  const todayKey = localDateKey(now)

  // 跨午夜班次：先检查前一天的班次是否仍在进行中（按班次起始日归属）。
  const yesterdayKey = addDays(todayKey, -1)
  if (settings.workdays.includes(weekdayOf(yesterdayKey) as Weekday)) {
    const intervals = paidIntervalsForShift(settings, clockOnDate(yesterdayKey, 0))
    if (nowMs >= intervals[0].startMs && nowMs < intervals[intervals.length - 1].endMs) {
      return buildPayState(yesterdayKey, intervals, nowMs)
    }
  }

  const todayIsWorkday = forceWorkday || settings.workdays.includes(now.getDay() as Weekday)
  if (!todayIsWorkday) {
    return { shiftDateKey: todayKey, status: 'off', earnedMs: 0, remainingPaidMs: 0, nextBoundaryMs: null, intervals: [] }
  }

  return buildPayState(todayKey, paidIntervalsForShift(settings, clockOnDate(todayKey, 0)), nowMs)
}
