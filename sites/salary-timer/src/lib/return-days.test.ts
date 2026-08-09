import { describe, expect, it } from 'vitest'
import { markReturnDaysReported, returnDayEvents, weeklyActiveDays } from './return-days'
import type { SalaryLocalData } from './storage'
import type { SalarySettings } from './settings'

function data(overrides: Partial<SalaryLocalData> = {}): SalaryLocalData {
  const settings: SalarySettings = {
    version: 1,
    monthlySalary: 15_000,
    salaryBasis: 'net',
    workdays: [1, 2, 3, 4, 5],
    paidHoursPerDay: 8,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    lunchPaid: false,
    persistMode: 'local',
    effectiveFrom: '2026-08-10',
  }
  return {
    version: 1,
    settings,
    fragments: [],
    firstVisitDate: '2026-08-03',
    activeDates: [],
    reportedReturnDays: [],
    ...overrides,
  }
}

describe('returnDayEvents', () => {
  it('首次访问当天没有复访事件', () => {
    expect(returnDayEvents(data(), new Date(2026, 7, 3))).toEqual([])
  })

  it('次日回访触发 D1', () => {
    expect(returnDayEvents(data(), new Date(2026, 7, 4))).toEqual(['D1'])
  })

  it('第七天同时触发 D1 与 D7', () => {
    expect(returnDayEvents(data(), new Date(2026, 7, 10))).toEqual(['D1', 'D7'])
  })

  it('已上报过的事件不再重复返回', () => {
    const reported = markReturnDaysReported(data(), returnDayEvents(data(), new Date(2026, 7, 4)))
    expect(returnDayEvents(reported, new Date(2026, 7, 5))).toEqual([])

    const reportedBoth = markReturnDaysReported(data(), ['D1', 'D7'])
    expect(returnDayEvents(reportedBoth, new Date(2026, 7, 10))).toEqual([])
  })
})

describe('weeklyActiveDays', () => {
  it('统计今天往前 7 天窗口内的活跃天数', () => {
    const d = data({ activeDates: ['2026-08-04', '2026-08-09', '2026-08-10', '2026-07-01'] })
    expect(weeklyActiveDays(d, new Date(2026, 7, 10))).toBe(3)
  })

  it('未来日期不计入', () => {
    const d = data({ activeDates: ['2026-08-12'] })
    expect(weeklyActiveDays(d, new Date(2026, 7, 10))).toBe(0)
  })
})
