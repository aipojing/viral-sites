import { describe, expect, it } from 'vitest'
import { resolveReportYear } from './report-year'

const NOW = new Date('2026-12-06T00:00:00Z')

describe('resolveReportYear', () => {
  it('优先使用构建常量', () => {
    expect(resolveReportYear('2025', NOW)).toBe(2025)
  })

  it('常量缺失时回落到当前年', () => {
    expect(resolveReportYear(undefined, NOW)).toBe(NOW.getFullYear())
  })

  it('非法常量不会污染年份', () => {
    for (const raw of ['', 'abc', '20.5', '1899', '2201', 'NaN']) {
      expect(resolveReportYear(raw, NOW)).toBe(NOW.getFullYear())
    }
  })
})
