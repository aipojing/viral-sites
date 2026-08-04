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

import { computeStats } from './life-math'

describe('computeStats', () => {
  const base = { birth: d(1996, 8, 4), today: d(2026, 8, 4) } // 恰好 30 岁

  it('默认参数：父母年龄 = age+28，各字段口径正确', () => {
    const s = computeStats(base)
    expect(s.age).toBe(30)
    expect(s.totalWeeks).toBe(4056)
    expect(s.parentMeetings).toBe((78 - 58) * 2) // 40
    expect(s.springFestivals).toBe(48) // 78-30
    expect(s.workdays).toBe(7500) // (60-30)*250
    expect(s.blankWeeks).toBe(s.totalWeeks - s.weeksLived)
    expect(s.bonusWeeks).toBe(0)
    expect(s.meetingsPerYear).toBe(2)
  })

  it('自定义见面频率参与计算', () => {
    const s = computeStats({ ...base, parentAge: 60, meetingsPerYear: 4 })
    expect(s.parentMeetings).toBe(72) // (78-60)*4
  })

  it('父母年龄 ≥ 78 → every-one-counts', () => {
    expect(computeStats({ ...base, parentAge: 80 }).parentMeetings).toBe('every-one-counts')
    expect(computeStats({ ...base, parentAge: 78 }).parentMeetings).toBe('every-one-counts')
  })

  it('年龄 ≥ 60 → workdays done', () => {
    const s = computeStats({ birth: d(1960, 1, 1), today: d(2026, 8, 4) })
    expect(s.workdays).toBe('done')
  })

  it('年龄 ≥ 预期寿命 → 彩蛋模式 bonusWeeks > 0 且 blankWeeks = 0', () => {
    const s = computeStats({ birth: d(1940, 1, 1), today: d(2026, 8, 4), expectancy: 78 })
    expect(s.bonusWeeks).toBeGreaterThan(0)
    expect(s.blankWeeks).toBe(0)
  })
})
