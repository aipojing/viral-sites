import { describe, expect, it } from 'vitest'
import { dailyEquivalent, formatDuration, formatMoney, hourlyEquivalent } from './pay-math'
import type { SalarySettings } from './settings'

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

describe('hourlyEquivalent', () => {
  it('使用 52/12 × 每周天数 × 带薪小时 的固定口径', () => {
    // 15000 ÷ (52/12 × 5 × 8) = 86.5384...
    expect(hourlyEquivalent(settings())).toBeCloseTo(86.53846153846153, 8)
  })

  it('内部保留完整精度，不提前取整', () => {
    const rate = hourlyEquivalent(settings({ monthlySalary: 10_000 }))
    expect(Number.isInteger(rate)).toBe(false)
  })

  it('税前与到手口径给出相同数值（只影响标签）', () => {
    expect(hourlyEquivalent(settings({ salaryBasis: 'gross' }))).toBe(
      hourlyEquivalent(settings({ salaryBasis: 'net' })),
    )
  })
})

describe('dailyEquivalent', () => {
  it('等于时薪乘以每日带薪小时', () => {
    const s = settings()
    expect(dailyEquivalent(s)).toBeCloseTo(hourlyEquivalent(s) * s.paidHoursPerDay, 10)
    // 15000 ÷ (52/12 × 5) = 692.307...
    expect(dailyEquivalent(s)).toBeCloseTo(692.3076923076923, 8)
  })
})

describe('formatMoney', () => {
  it('两位小数与千分位展示', () => {
    expect(formatMoney(187.43)).toBe('¥187.43')
    expect(formatMoney(1234.5)).toBe('¥1,234.50')
    expect(formatMoney(1_000_000)).toBe('¥1,000,000.00')
    expect(formatMoney(0)).toBe('¥0.00')
  })

  it('非有限值降级为 0', () => {
    expect(formatMoney(Number.NaN)).toBe('¥0.00')
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('¥0.00')
  })
})

describe('formatDuration', () => {
  it('按时分秒分层展示', () => {
    expect(formatDuration(45_000)).toBe('45 秒')
    expect(formatDuration(3 * 60_000 + 12_000)).toBe('3 分 12 秒')
    expect(formatDuration(2 * 3_600_000 + 5 * 60_000)).toBe('2 小时 5 分')
  })

  it('负数按时长 0 处理', () => {
    expect(formatDuration(-1000)).toBe('0 秒')
  })
})
