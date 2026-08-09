import { describe, expect, it } from 'vitest'
import { addDays, clockOnDate, daysBetween, localDateKey, parseClock, parseDateKey } from './time-local'

describe('parseClock', () => {
  it('把 HH:mm 转成自午夜分钟数', () => {
    expect(parseClock('00:00')).toBe(0)
    expect(parseClock('09:30')).toBe(570)
    expect(parseClock('23:59')).toBe(1439)
  })

  it('拒绝非法格式', () => {
    expect(() => parseClock('9:00')).toThrow()
    expect(() => parseClock('24:00')).toThrow()
    expect(() => parseClock('18:60')).toThrow()
    expect(() => parseClock('')).toThrow()
    expect(() => parseClock('ab:cd')).toThrow()
  })
})

describe('localDateKey / parseDateKey', () => {
  it('输出与解析本地日期 key', () => {
    const date = new Date(2026, 7, 9, 23, 59)
    expect(localDateKey(date)).toBe('2026-08-09')
    expect(parseDateKey('2026-08-09')).toEqual({ year: 2026, monthIndex: 7, day: 9 })
  })

  it('月份与日期补零', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('拒绝非法 key', () => {
    expect(() => parseDateKey('2026-8-9')).toThrow()
    expect(() => parseDateKey('')).toThrow()
  })
})

describe('clockOnDate', () => {
  it('按本地日期与分钟构造时刻', () => {
    const date = clockOnDate('2026-08-10', 570)
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(7)
    expect(date.getDate()).toBe(10)
    expect(date.getHours()).toBe(9)
    expect(date.getMinutes()).toBe(30)
  })

  it('分钟超过 1440 时落到次日凌晨（跨午夜班次）', () => {
    const date = clockOnDate('2026-08-10', 24 * 60 + 90)
    expect(date.getDate()).toBe(11)
    expect(date.getHours()).toBe(1)
    expect(date.getMinutes()).toBe(30)
  })
})

describe('addDays / daysBetween', () => {
  it('按本地自然日加减', () => {
    expect(addDays('2026-08-10', 1)).toBe('2026-08-11')
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-08-10', -1)).toBe('2026-08-09')
  })

  it('计算两个自然日差值', () => {
    expect(daysBetween('2026-08-03', '2026-08-10')).toBe(7)
    expect(daysBetween('2026-08-10', '2026-08-10')).toBe(0)
    expect(daysBetween('2026-08-10', '2026-08-03')).toBe(-7)
  })
})
