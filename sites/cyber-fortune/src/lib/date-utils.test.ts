import { describe, expect, it } from 'vitest'
import { dateKeyUTC8, yesterdayKeyUTC8 } from './date-utils'

describe('dateKeyUTC8', () => {
  it('UTC 15:59 仍是 UTC+8 的当天 23:59', () => {
    expect(dateKeyUTC8(new Date(Date.UTC(2026, 7, 3, 15, 59)))).toBe('2026-08-03')
  })

  it('UTC 16:00 已是 UTC+8 的次日 00:00（换签时刻）', () => {
    expect(dateKeyUTC8(new Date(Date.UTC(2026, 7, 3, 16, 0)))).toBe('2026-08-04')
  })

  it('月/日补零', () => {
    expect(dateKeyUTC8(new Date(Date.UTC(2026, 0, 5, 4, 0)))).toBe('2026-01-05')
  })

  it('跨年边界：UTC 12-31 16:00 → UTC+8 01-01', () => {
    expect(dateKeyUTC8(new Date(Date.UTC(2025, 11, 31, 16, 0)))).toBe('2026-01-01')
  })
})

describe('yesterdayKeyUTC8', () => {
  it('普通日期', () => {
    expect(yesterdayKeyUTC8(new Date(Date.UTC(2026, 7, 4, 4, 0)))).toBe('2026-08-03')
  })

  it('跨月：9-01 的昨天是 8-31', () => {
    expect(yesterdayKeyUTC8(new Date(Date.UTC(2026, 8, 1, 4, 0)))).toBe('2026-08-31')
  })

  it('跨年：UTC+8 的 2026-01-01 昨天是 2025-12-31', () => {
    expect(yesterdayKeyUTC8(new Date(Date.UTC(2025, 11, 31, 16, 0)))).toBe('2025-12-31')
  })
})
