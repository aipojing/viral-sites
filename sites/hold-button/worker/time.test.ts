import { describe, expect, it } from 'vitest'
import { dateKeyUTC8, durationBucket } from './time'

describe('dateKeyUTC8', () => {
  it('按北京时间（UTC+8）归日', () => {
    // 2026-08-08T16:30:00Z = 北京时间 2026-08-09 00:30
    expect(dateKeyUTC8(Date.UTC(2026, 7, 8, 16, 30, 0))).toBe('2026-08-09')
    // 2026-08-08T15:59:59Z = 北京时间 2026-08-08 23:59:59
    expect(dateKeyUTC8(Date.UTC(2026, 7, 8, 15, 59, 59))).toBe('2026-08-08')
  })

  it('UTC 午夜附近跨北京日期边界', () => {
    expect(dateKeyUTC8(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01')
    // 2025-12-31T16:00:00Z = 北京时间 2026-01-01 00:00
    expect(dateKeyUTC8(Date.UTC(2025, 11, 31, 16, 0, 0))).toBe('2026-01-01')
  })
})

describe('durationBucket', () => {
  it('向下取整到秒', () => {
    expect(durationBucket(0)).toBe(0)
    expect(durationBucket(19_999)).toBe(19)
    expect(durationBucket(1_000)).toBe(1)
  })

  it('20 分钟封顶为 1200', () => {
    expect(durationBucket(20 * 60_000)).toBe(1200)
    expect(durationBucket(20 * 60_000 + 1)).toBe(1200)
    expect(durationBucket(60 * 60_000)).toBe(1200)
  })

  it('拒绝负值与非有限值', () => {
    expect(() => durationBucket(-1)).toThrow()
    expect(() => durationBucket(Number.NaN)).toThrow()
    expect(() => durationBucket(Number.POSITIVE_INFINITY)).toThrow()
  })
})
