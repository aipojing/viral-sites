import { beforeEach, describe, expect, it } from 'vitest'
import { dateKeyBeijing, getDailyId } from './daily-id'

beforeEach(() => {
  localStorage.clear()
})

describe('dateKeyBeijing', () => {
  it('按 UTC+8 计算日期键', () => {
    // 北京 2026-08-09 02:00 = UTC 2026-08-08 18:00，不能按 UTC 落到前一天
    expect(dateKeyBeijing(new Date('2026-08-08T18:00:00Z'))).toBe('2026-08-09')
    // 北京 2026-08-08 23:30 = UTC 2026-08-08 15:30
    expect(dateKeyBeijing(new Date('2026-08-08T15:30:00Z'))).toBe('2026-08-08')
  })
})

describe('getDailyId', () => {
  it('同一天内保持稳定并写入 localStorage', () => {
    const now = new Date('2026-08-08T15:30:00Z')
    const first = getDailyId(now)
    const second = getDailyId(now)
    expect(first).toBe(second)
    expect(localStorage.getItem('ai_judge_daily_id')).toContain(first)
  })

  it('北京时间跨日后更换 id', () => {
    const first = getDailyId(new Date('2026-08-08T15:30:00Z'))
    const second = getDailyId(new Date('2026-08-08T16:30:00Z')) // 北京已是次日
    expect(second).not.toBe(first)
  })

  it('localStorage 损坏时不抛错并返回新 id', () => {
    localStorage.setItem('ai_judge_daily_id', '{坏的 JSON')
    expect(() => getDailyId(new Date('2026-08-08T15:30:00Z'))).not.toThrow()
    expect(getDailyId(new Date('2026-08-08T15:30:00Z')).length).toBeGreaterThan(0)
  })
})
