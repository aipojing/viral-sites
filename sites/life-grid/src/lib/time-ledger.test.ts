import { describe, expect, it } from 'vitest'
import { ageInYears, weeksLived, totalWeeks, WEEKS_PER_YEAR } from './life-math'
import type { LifeInput } from './life-math'
import {
  computeTimeLedger,
  DEFAULT_HABITS,
  roundDisplayYears,
  validateHabits,
  type HabitInput,
} from './time-ledger'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

// 恰好 30 岁，方便手算：1996-08-09 ~ 2026-08-09（含 8 个闰年，10958 天 = 1565 周余 3 天）
const LIFE: LifeInput = { birth: d(1996, 8, 9), today: d(2026, 8, 9) }
const AGE = 30
const REMAINING_WEEKS = totalWeeks(78) - weeksLived(LIFE.birth, LIFE.today) // 4056 - 1565 = 2491
const WORKING_WEEKS = (60 - AGE) * WEEKS_PER_YEAR // 1560
const HOURS_PER_YEAR = 168 * WEEKS_PER_YEAR // 8736

describe('validateHabits', () => {
  it('默认习惯合法且合计 168', () => {
    expect(validateHabits(DEFAULT_HABITS)).toEqual({ ok: true })
    const fixed =
      DEFAULT_HABITS.sleepHoursPerDay * 7 +
      DEFAULT_HABITS.workHoursPerWeek +
      DEFAULT_HABITS.commuteHoursPerWorkday * DEFAULT_HABITS.workdaysPerWeek +
      DEFAULT_HABITS.necessaryHoursPerWeek
    expect(fixed).toBe(52.5 + 40 + 7.5 + 14)
    expect(fixed).toBeLessThanOrEqual(168)
  })

  it('固定事项超过 168 小时返回 weeklyTotal 错误', () => {
    const input: HabitInput = { ...DEFAULT_HABITS, workHoursPerWeek: 112, sleepHoursPerDay: 10 }
    const result = validateHabits(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.field).toBe('weeklyTotal')
  })

  it('负数、NaN、超范围输入都返回字段级错误', () => {
    const cases: Array<[keyof HabitInput, number]> = [
      ['sleepHoursPerDay', -1],
      ['sleepHoursPerDay', 25],
      ['sleepHoursPerDay', Number.NaN],
      ['workHoursPerWeek', 113],
      ['commuteHoursPerWorkday', 9],
      ['workdaysPerWeek', 8],
      ['necessaryHoursPerWeek', 113],
      ['screenHoursPerDay', 25],
    ]
    for (const [field, value] of cases) {
      const result = validateHabits({ ...DEFAULT_HABITS, [field]: value })
      expect(result.ok, `${String(field)}=${value} 应被拒绝`).toBe(false)
      if (!result.ok) expect(result.field).toBe(field)
    }
  })

  it('退休年龄必须不低于当前年龄且不超过 100', () => {
    expect(validateHabits({ ...DEFAULT_HABITS, retirementAge: 29 }, AGE).ok).toBe(false)
    expect(validateHabits({ ...DEFAULT_HABITS, retirementAge: 101 }, AGE).ok).toBe(false)
    expect(validateHabits({ ...DEFAULT_HABITS, retirementAge: 30 }, AGE).ok).toBe(true)
  })
})

describe('computeTimeLedger', () => {
  it('默认习惯五类合计恰好每周 168 小时', () => {
    const result = computeTimeLedger(LIFE, DEFAULT_HABITS)
    expect(result.weekly.sleep).toBeCloseTo(52.5)
    expect(result.weekly.work).toBeCloseTo(40)
    expect(result.weekly.commute).toBeCloseTo(7.5)
    expect(result.weekly.necessary).toBeCloseTo(14)
    expect(result.weekly.free).toBeCloseTo(54)
    const sum = Object.values(result.weekly).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(168)
  })

  it('支持小数输入且自由时间由总量减去固定项得出', () => {
    const result = computeTimeLedger(LIFE, {
      ...DEFAULT_HABITS,
      sleepHoursPerDay: 6.5,
      commuteHoursPerWorkday: 0.75,
    })
    expect(result.weekly.sleep).toBeCloseTo(45.5)
    expect(result.weekly.commute).toBeCloseTo(3.75)
    expect(result.weekly.free).toBeCloseTo(
      168 - result.weekly.sleep - result.weekly.work - result.weekly.commute - result.weekly.necessary,
    )
  })

  it('退休前后拆分：工作与通勤只投影到工作周', () => {
    const result = computeTimeLedger(LIFE, DEFAULT_HABITS)
    expect(result.remainingWeeks).toBe(REMAINING_WEEKS)
    expect(result.workingWeeks).toBe(WORKING_WEEKS)
    expect(result.remainingYears.work).toBeCloseTo((40 * WORKING_WEEKS) / HOURS_PER_YEAR)
    expect(result.remainingYears.commute).toBeCloseTo((7.5 * WORKING_WEEKS) / HOURS_PER_YEAR)
    expect(result.remainingYears.sleep).toBeCloseTo((52.5 * REMAINING_WEEKS) / HOURS_PER_YEAR)
    expect(result.remainingYears.necessary).toBeCloseTo((14 * REMAINING_WEEKS) / HOURS_PER_YEAR)
    // 自由时间 = 剩余总小时减去前四类，保证总量一致
    const fixedHours =
      result.remainingYears.sleep * HOURS_PER_YEAR +
      result.remainingYears.work * HOURS_PER_YEAR +
      result.remainingYears.commute * HOURS_PER_YEAR +
      result.remainingYears.necessary * HOURS_PER_YEAR
    expect(result.remainingYears.free).toBeCloseTo(
      (REMAINING_WEEKS * 168 - fixedHours) / HOURS_PER_YEAR,
    )
  })

  it('已经退休时工作周为 0', () => {
    const result = computeTimeLedger(LIFE, { ...DEFAULT_HABITS, retirementAge: 30 })
    expect(result.workingWeeks).toBe(0)
    expect(result.remainingYears.work).toBe(0)
    expect(result.remainingYears.commute).toBe(0)
  })

  it('超过预期寿命时剩余周为 0，不产生负数', () => {
    const older: LifeInput = { birth: d(1940, 1, 1), today: d(2026, 8, 9) }
    const result = computeTimeLedger(older, DEFAULT_HABITS)
    expect(result.remainingWeeks).toBe(0)
    for (const years of Object.values(result.remainingYears)) expect(years).toBe(0)
    expect(result.screenYears).toBe(0)
  })

  it('keeps screen time outside the mutually exclusive ledger', () => {
    const result = computeTimeLedger(LIFE, { ...DEFAULT_HABITS, screenHoursPerDay: 8 })
    expect(Object.values(result.weekly).reduce((a, b) => a + b, 0)).toBeCloseTo(168)
    expect(result.screenYears).toBeGreaterThan(0)
    expect(result.weekly.free).toBe(
      168 - result.weekly.sleep - result.weekly.work - result.weekly.commute - result.weekly.necessary,
    )
    expect(result.screenYears).toBeCloseTo((8 * 7 * REMAINING_WEEKS) / HOURS_PER_YEAR)
  })

  it('未填屏幕时间时旁账为 null', () => {
    const result = computeTimeLedger(LIFE, { ...DEFAULT_HABITS, screenHoursPerDay: undefined })
    expect(result.screenYears).toBeNull()
  })

  it('零通勤不影响其它类目', () => {
    const result = computeTimeLedger(LIFE, { ...DEFAULT_HABITS, commuteHoursPerWorkday: 0 })
    expect(result.weekly.commute).toBe(0)
    expect(result.weekly.free).toBeCloseTo(61.5)
  })
})

describe('roundDisplayYears', () => {
  it('展示保留一位小数', () => {
    expect(roundDisplayYears(11.44)).toBe(11.4)
    expect(roundDisplayYears(11.45)).toBe(11.5)
    expect(roundDisplayYears(0.04)).toBe(0)
  })
})

describe('口径一致性', () => {
  it('当前年龄与 life-math 的 ageInYears 一致', () => {
    expect(ageInYears(LIFE.birth, LIFE.today)).toBe(AGE)
  })
})
