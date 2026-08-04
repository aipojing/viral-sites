import { describe, expect, it } from 'vitest'
import {
  ageInYears,
  percentLived,
  totalWeeks,
  validateBirth,
  weeksLived,
} from './life-math'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('weeksLived', () => {
  it('同一天为 0', () => expect(weeksLived(d(2000, 1, 1), d(2000, 1, 1))).toBe(0)
  )
  it('14 天为 2 周', () => expect(weeksLived(d(2000, 1, 1), d(2000, 1, 15))).toBe(2))
  it('不足一周向下取整', () => expect(weeksLived(d(2000, 1, 1), d(2000, 1, 13))).toBe(1))
  it('闰年整年 366 天 = 52 周', () =>
    expect(weeksLived(d(2000, 1, 1), d(2001, 1, 1))).toBe(52))
})

describe('totalWeeks', () => {
  it('78 岁 = 4056 周', () => expect(totalWeeks(78)).toBe(4056))
})

describe('ageInYears', () => {
  it('生日当天算整岁', () => expect(ageInYears(d(2000, 8, 4), d(2026, 8, 4))).toBe(26))
  it('生日前一天差一岁', () => expect(ageInYears(d(2000, 8, 5), d(2026, 8, 4))).toBe(25))
})

describe('percentLived', () => {
  it('保留一位小数', () =>
    expect(percentLived(d(2000, 1, 1), d(2001, 1, 1), 78)).toBe(1.3)) // 52/4056
  it('超过预期寿命封顶 100', () =>
    expect(percentLived(d(1900, 1, 1), d(2020, 1, 1), 78)).toBe(100))
})

describe('validateBirth', () => {
  it('未来日期拒绝', () =>
    expect(validateBirth(d(2030, 1, 1), d(2026, 8, 4))).toEqual({ ok: false, reason: 'future' }))
  it('超过 120 岁拒绝', () =>
    expect(validateBirth(d(1900, 1, 1), d(2026, 8, 4))).toEqual({ ok: false, reason: 'too-old' }))
  it('恰好 120 岁放行', () =>
    expect(validateBirth(d(1906, 8, 4), d(2026, 8, 4))).toEqual({ ok: true }))
  it('正常日期放行', () => expect(validateBirth(d(1990, 5, 1), d(2026, 8, 4))).toEqual({ ok: true }))
})
