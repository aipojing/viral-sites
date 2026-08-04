import { describe, expect, it } from 'vitest'
import { advanceStreak } from './streak'

const NOW = new Date(Date.UTC(2026, 7, 4, 4, 0))

describe('advanceStreak', () => {
  it('首次求签：count = 1', () => {
    expect(advanceStreak(null, NOW)).toEqual({
      state: { lastDate: '2026-08-04', count: 1 },
      isRepeat: false,
    })
  })

  it('昨天求过：连续 +1', () => {
    expect(advanceStreak({ lastDate: '2026-08-03', count: 3 }, NOW)).toEqual({
      state: { lastDate: '2026-08-04', count: 4 },
      isRepeat: false,
    })
  })

  it('当天重复求签：不重复计数，isRepeat = true', () => {
    const prev = { lastDate: '2026-08-04', count: 4 }
    expect(advanceStreak(prev, NOW)).toEqual({ state: prev, isRepeat: true })
  })

  it('中断（前天求过）：清零重置为 1', () => {
    expect(advanceStreak({ lastDate: '2026-08-02', count: 9 }, NOW).state.count).toBe(1)
  })

  it('跨月连续：8-31 → 9-01 算连续', () => {
    const sep1 = new Date(Date.UTC(2026, 8, 1, 4, 0))
    expect(advanceStreak({ lastDate: '2026-08-31', count: 5 }, sep1).state.count).toBe(6)
  })

  it('跨年连续：12-31 → 01-01 算连续', () => {
    const jan1 = new Date(Date.UTC(2025, 11, 31, 16, 0))
    expect(advanceStreak({ lastDate: '2025-12-31', count: 2 }, jan1).state.count).toBe(3)
  })

  it('UTC+8 边界：UTC 16:00 已换日，昨天的记录算连续', () => {
    const boundary = new Date(Date.UTC(2026, 7, 3, 16, 0))
    expect(advanceStreak({ lastDate: '2026-08-03', count: 1 }, boundary).state.count).toBe(2)
  })

  it('不可变：不修改传入的 prev', () => {
    const prev = { lastDate: '2026-08-03', count: 3 }
    advanceStreak(prev, NOW)
    expect(prev).toEqual({ lastDate: '2026-08-03', count: 3 })
  })
})
