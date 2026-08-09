import { describe, expect, it } from 'vitest'
import { makeBaseFact } from './fact-lint'
import { accumulatedValue, periodSeconds, ratePerSecond } from './rate'

describe('periodSeconds', () => {
  it('day 固定 86400 秒', () => {
    expect(periodSeconds({ unit: 'day' })).toBe(86_400)
  })

  it('month 使用 referenceYear 该年的平均月', () => {
    expect(periodSeconds({ unit: 'month', referenceYear: 2025 })).toBe((365 * 86_400) / 12)
    expect(periodSeconds({ unit: 'month', referenceYear: 2024 })).toBe((366 * 86_400) / 12)
  })

  it('year 使用 referenceYear 实际天数（平年/闰年）', () => {
    expect(periodSeconds({ unit: 'year', referenceYear: 2025 })).toBe(31_536_000)
    expect(periodSeconds({ unit: 'year', referenceYear: 2024 })).toBe(31_622_400)
    // 百年不闰、四百年闰
    expect(periodSeconds({ unit: 'year', referenceYear: 2100 })).toBe(31_536_000)
    expect(periodSeconds({ unit: 'year', referenceYear: 2000 })).toBe(31_622_400)
  })

  it('custom-seconds 使用显式 seconds', () => {
    expect(periodSeconds({ unit: 'custom-seconds', seconds: 60 })).toBe(60)
  })

  it('缺 referenceYear/seconds 直接抛错，不产生 NaN', () => {
    expect(() => periodSeconds({ unit: 'month' })).toThrow()
    expect(() => periodSeconds({ unit: 'year' })).toThrow()
    expect(() => periodSeconds({ unit: 'custom-seconds' })).toThrow()
    expect(() => periodSeconds({ unit: 'custom-seconds', seconds: -1 })).toThrow()
  })
})

describe('ratePerSecond', () => {
  it('始终从原始值与周期复算', () => {
    const heart = makeBaseFact({ value: 72, period: { unit: 'custom-seconds', seconds: 60 } })
    expect(ratePerSecond(heart)).toBeCloseTo(1.2, 10)

    const yearly = makeBaseFact({ value: 31_536_000, period: { unit: 'year', referenceYear: 2025 } })
    expect(ratePerSecond(yearly)).toBe(1)
  })
})

describe('accumulatedValue', () => {
  const heart = makeBaseFact({ value: 72, period: { unit: 'custom-seconds', seconds: 60 } })

  it('按有效毫秒累计', () => {
    expect(accumulatedValue(heart, 60_000)).toBeCloseTo(72, 10)
    expect(accumulatedValue(heart, 2_500)).toBeCloseTo(3, 10)
  })

  it('0、负数、NaN、Infinity 一律按 0 秒处理', () => {
    expect(accumulatedValue(heart, 0)).toBe(0)
    expect(accumulatedValue(heart, -5_000)).toBe(0)
    expect(accumulatedValue(heart, Number.NaN)).toBe(0)
    expect(accumulatedValue(heart, Number.POSITIVE_INFINITY)).toBe(0)
  })
})
