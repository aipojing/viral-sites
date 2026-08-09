import { describe, expect, it } from 'vitest'
import type { SalarySettings } from './settings'
import { overlapMs, paidIntervalsForShift, todayPayState } from './work-schedule'

const HOUR = 3_600_000

// 2026-08-10 是周一，2026-08-09 是周日，2026-08-08 是周六。
function settings(overrides: Partial<SalarySettings> = {}): SalarySettings {
  return {
    version: 1,
    monthlySalary: 15_000,
    salaryBasis: 'net',
    workdays: [1, 2, 3, 4, 5],
    paidHoursPerDay: 8,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    lunchPaid: false,
    persistMode: 'local',
    effectiveFrom: '2026-08-10',
    ...overrides,
  }
}

describe('paidIntervalsForShift', () => {
  it('午休不带薪时拆成两段', () => {
    const intervals = paidIntervalsForShift(settings(), new Date(2026, 7, 10))
    expect(intervals).toHaveLength(2)
    expect(intervals[0].startMs).toBe(new Date(2026, 7, 10, 9).getTime())
    expect(intervals[0].endMs).toBe(new Date(2026, 7, 10, 12).getTime())
    expect(intervals[1].startMs).toBe(new Date(2026, 7, 10, 13).getTime())
    expect(intervals[1].endMs).toBe(new Date(2026, 7, 10, 18).getTime())
  })

  it('午休带薪或未设午休时为整段', () => {
    const paidLunch = paidIntervalsForShift(settings({ lunchPaid: true }), new Date(2026, 7, 10))
    expect(paidLunch).toHaveLength(1)
    expect(paidLunch[0].endMs - paidLunch[0].startMs).toBe(9 * HOUR)

    const noLunch = paidIntervalsForShift(
      settings({ lunchStart: undefined, lunchEnd: undefined, paidHoursPerDay: 9 }),
      new Date(2026, 7, 10),
    )
    expect(noLunch).toHaveLength(1)
  })

  it('跨午夜班次的结束点落在次日凌晨', () => {
    const intervals = paidIntervalsForShift(
      settings({
        shiftStart: '22:00',
        shiftEnd: '06:00',
        lunchStart: undefined,
        lunchEnd: undefined,
      }),
      new Date(2026, 7, 10),
    )
    expect(intervals[0].startMs).toBe(new Date(2026, 7, 10, 22).getTime())
    expect(intervals[0].endMs).toBe(new Date(2026, 7, 11, 6).getTime())
  })
})

describe('todayPayState', () => {
  it('上班前：未开始累计，下一边界是上班时间', () => {
    const state = todayPayState(settings(), new Date(2026, 7, 10, 8, 30))
    expect(state.status).toBe('before')
    expect(state.shiftDateKey).toBe('2026-08-10')
    expect(state.earnedMs).toBe(0)
    expect(state.remainingPaidMs).toBe(8 * HOUR)
    expect(state.nextBoundaryMs).toBe(new Date(2026, 7, 10, 9).getTime())
  })

  it('工作中：只累计带薪区间', () => {
    const state = todayPayState(settings(), new Date(2026, 7, 10, 10, 0))
    expect(state.status).toBe('working')
    expect(state.earnedMs).toBe(1 * HOUR)
    expect(state.remainingPaidMs).toBe(7 * HOUR)
    expect(state.nextBoundaryMs).toBe(new Date(2026, 7, 10, 12).getTime())
  })

  it('午休（不带薪）：状态 break，金额停在上午段', () => {
    const state = todayPayState(settings(), new Date(2026, 7, 10, 12, 30))
    expect(state.status).toBe('break')
    expect(state.earnedMs).toBe(3 * HOUR)
    expect(state.remainingPaidMs).toBe(5 * HOUR)
    expect(state.nextBoundaryMs).toBe(new Date(2026, 7, 10, 13).getTime())
  })

  it('午休带薪时 12:30 仍是 working', () => {
    const state = todayPayState(settings({ lunchPaid: true, paidHoursPerDay: 9 }), new Date(2026, 7, 10, 12, 30))
    expect(state.status).toBe('working')
    expect(state.earnedMs).toBe(3.5 * HOUR)
  })

  it('下班后：金额封顶，剩余为零，无下一边界', () => {
    const state = todayPayState(settings(), new Date(2026, 7, 10, 19, 0))
    expect(state.status).toBe('after')
    expect(state.earnedMs).toBe(8 * HOUR)
    expect(state.remainingPaidMs).toBe(0)
    expect(state.nextBoundaryMs).toBeNull()
  })

  it('边界分钟：整点切换状态', () => {
    expect(todayPayState(settings(), new Date(2026, 7, 10, 9, 0)).status).toBe('working')
    expect(todayPayState(settings(), new Date(2026, 7, 10, 12, 0)).status).toBe('break')
    expect(todayPayState(settings(), new Date(2026, 7, 10, 13, 0)).status).toBe('working')
    const atEnd = todayPayState(settings(), new Date(2026, 7, 10, 18, 0))
    expect(atEnd.status).toBe('after')
    expect(atEnd.remainingPaidMs).toBe(0)
    expect(atEnd.earnedMs).toBe(8 * HOUR)
  })

  it('非工作日：off 且没有任何区间', () => {
    const state = todayPayState(settings(), new Date(2026, 7, 9, 10, 0)) // 周日
    expect(state.status).toBe('off')
    expect(state.shiftDateKey).toBe('2026-08-09')
    expect(state.earnedMs).toBe(0)
    expect(state.intervals).toEqual([])
  })

  it('非工作日可强制开启一次性临时班次', () => {
    const state = todayPayState(settings(), new Date(2026, 7, 9, 10, 0), true)
    expect(state.status).toBe('working')
    expect(state.shiftDateKey).toBe('2026-08-09')
    expect(state.earnedMs).toBe(1 * HOUR)
  })

  it('跨午夜班次：次日凌晨仍归前一天班次', () => {
    const night = settings({
      shiftStart: '22:00',
      shiftEnd: '06:00',
      lunchStart: undefined,
      lunchEnd: undefined,
    })

    const lateNight = todayPayState(night, new Date(2026, 7, 10, 23, 30))
    expect(lateNight.status).toBe('working')
    expect(lateNight.shiftDateKey).toBe('2026-08-10')

    const afterMidnight = todayPayState(night, new Date(2026, 7, 11, 2, 0)) // 周二凌晨
    expect(afterMidnight.status).toBe('working')
    expect(afterMidnight.shiftDateKey).toBe('2026-08-10')
    expect(afterMidnight.earnedMs).toBe(4 * HOUR)
    expect(afterMidnight.remainingPaidMs).toBe(4 * HOUR)

    // 凌晨班次结束后，回到当天班次视角：当天班次未开始
    const morning = todayPayState(night, new Date(2026, 7, 11, 7, 0))
    expect(morning.status).toBe('before')
    expect(morning.shiftDateKey).toBe('2026-08-11')
    expect(morning.earnedMs).toBe(0)
  })

  it('跨午夜班次在非工作日凌晨不续接（前一天是周末）', () => {
    // 周日晚 22:00 不属于 workdays（0 不在列表），周一凌晨不应有昨日班次
    const night = settings({
      shiftStart: '22:00',
      shiftEnd: '06:00',
      lunchStart: undefined,
      lunchEnd: undefined,
    })
    const state = todayPayState(night, new Date(2026, 7, 10, 2, 0)) // 周一凌晨 2 点
    expect(state.status).toBe('before')
    expect(state.shiftDateKey).toBe('2026-08-10')
  })

  it('同一批次重复调用结果一致（纯函数，不依赖动画帧或累加）', () => {
    const s = settings()
    const now = new Date(2026, 7, 10, 15, 45)
    expect(todayPayState(s, now)).toEqual(todayPayState(s, now))
  })
})

describe('overlapMs', () => {
  it('计算区间交集总时长', () => {
    const intervals = [
      { startMs: 100, endMs: 200 },
      { startMs: 300, endMs: 500 },
    ]
    expect(overlapMs({ startMs: 150, endMs: 400 }, intervals)).toBe(150)
    expect(overlapMs({ startMs: 0, endMs: 1000 }, intervals)).toBe(300)
    expect(overlapMs({ startMs: 600, endMs: 700 }, intervals)).toBe(0)
    expect(overlapMs({ startMs: 400, endMs: 100 }, intervals)).toBe(0)
  })
})
