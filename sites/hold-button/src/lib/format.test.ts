import { describe, expect, it } from 'vitest'
import { formatDuration } from './format'

describe('formatDuration', () => {
  it('一分钟以下显示秒（保留一位小数）', () => {
    expect(formatDuration(0)).toBe('0.0 秒')
    expect(formatDuration(999)).toBe('1.0 秒')
    expect(formatDuration(23_456)).toBe('23.5 秒')
    expect(formatDuration(59_999)).toBe('60.0 秒')
  })

  it('一分钟以上显示分秒', () => {
    expect(formatDuration(60_000)).toBe('1 分 00 秒')
    expect(formatDuration(90_000)).toBe('1 分 30 秒')
    expect(formatDuration(20 * 60_000)).toBe('20 分 00 秒')
  })

  it('非法输入按 0 处理', () => {
    expect(formatDuration(-5)).toBe('0.0 秒')
    expect(formatDuration(Number.NaN)).toBe('0.0 秒')
  })
})
