import { describe, expect, it } from 'vitest'
import { activeSkinId, SEASON_SKINS } from './season'

describe('activeSkinId', () => {
  it('新年签区间命中（含首尾闭区间）', () => {
    expect(activeSkinId('2026-01-20')).toBe('new-year')
    expect(activeSkinId('2026-02-01')).toBe('new-year')
    expect(activeSkinId('2026-02-10')).toBe('new-year')
    expect(activeSkinId('2026-02-11')).toBeNull()
  })

  it('高考签区间命中', () => {
    expect(activeSkinId('2026-06-05')).toBe('gaokao')
    expect(activeSkinId('2026-06-10')).toBe('gaokao')
    expect(activeSkinId('2026-06-11')).toBeNull()
  })

  it('发薪日签：每月 10 号与 15 号命中', () => {
    expect(activeSkinId('2026-03-10')).toBe('payday')
    expect(activeSkinId('2026-03-15')).toBe('payday')
    expect(activeSkinId('2026-03-16')).toBeNull()
  })

  it('优先级：02-10 同时是新年区间和发薪日，数组前者（新年）胜出', () => {
    expect(activeSkinId('2026-02-10')).toBe('new-year')
    expect(SEASON_SKINS[0].id).toBe('new-year')
  })

  it('普通日期不命中', () => {
    expect(activeSkinId('2026-08-04')).toBeNull()
  })

  it('自定义皮配置可注入（热点快反用）', () => {
    const skins = [{ id: 'x', name: 'X', rules: [{ type: 'monthly' as const, day: 4 }] }]
    expect(activeSkinId('2026-08-04', skins)).toBe('x')
  })
})
