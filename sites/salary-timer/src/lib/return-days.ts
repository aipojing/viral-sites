import type { SalaryLocalData } from './storage'
import { daysBetween, localDateKey } from './time-local'

// D1 / D7 复访判定：距首次访问达到阈值且尚未上报过时返回对应事件。
export function returnDayEvents(data: SalaryLocalData, now: Date): readonly ('D1' | 'D7')[] {
  const gap = daysBetween(data.firstVisitDate, localDateKey(now))
  const events: ('D1' | 'D7')[] = []
  if (gap >= 1 && !data.reportedReturnDays.includes(1)) events.push('D1')
  if (gap >= 7 && !data.reportedReturnDays.includes(7)) events.push('D7')
  return events
}

export function markReturnDaysReported(
  data: SalaryLocalData,
  events: readonly ('D1' | 'D7')[],
): SalaryLocalData {
  if (events.length === 0) return data
  const dayOf = { D1: 1, D7: 7 } as const
  const reported = [...data.reportedReturnDays, ...events.map((event) => dayOf[event])]
  return { ...data, reportedReturnDays: reported }
}

// 本周（今天往前 7 天窗口）活跃天数，仅本地计算，不进埋点。
export function weeklyActiveDays(data: SalaryLocalData, now: Date): number {
  const todayKey = localDateKey(now)
  return data.activeDates.filter((dateKey) => {
    const gap = daysBetween(dateKey, todayKey)
    return gap >= 0 && gap < 7
  }).length
}
