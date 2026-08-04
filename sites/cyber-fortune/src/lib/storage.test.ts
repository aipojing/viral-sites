import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadNickname, loadStreak, saveNickname, saveStreak } from './storage'

describe('storage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('streak 存取往返', () => {
    saveStreak({ lastDate: '2026-08-04', count: 3 })
    expect(loadStreak()).toEqual({ lastDate: '2026-08-04', count: 3 })
  })

  it('无记录返回 null', () => {
    expect(loadStreak()).toBeNull()
  })

  it('坏 JSON 返回 null（不抛错）', () => {
    localStorage.setItem('cf.streak', '{oops')
    expect(loadStreak()).toBeNull()
  })

  it('形状非法返回 null（日期格式/负数）', () => {
    localStorage.setItem('cf.streak', JSON.stringify({ lastDate: '昨天', count: 3 }))
    expect(loadStreak()).toBeNull()
    localStorage.setItem('cf.streak', JSON.stringify({ lastDate: '2026-08-04', count: -1 }))
    expect(loadStreak()).toBeNull()
  })

  it('存储异常静默（隐私模式配额）', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveStreak({ lastDate: '2026-08-04', count: 1 })).not.toThrow()
    expect(() => saveNickname('阿福')).not.toThrow()
  })

  it('昵称存取往返（记住上次的昵称）', () => {
    expect(loadNickname()).toBeNull()
    saveNickname('阿福')
    expect(loadNickname()).toBe('阿福')
  })
})
