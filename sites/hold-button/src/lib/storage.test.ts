import { describe, expect, it } from 'vitest'
import { loadPersonalBest, savePersonalBest } from './storage'

function makeStorage(initial?: Record<string, string>): Storage {
  const map = new Map(Object.entries(initial ?? {}))
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size
    },
  }
}

describe('personal best storage', () => {
  it('空存储返回 0', () => {
    expect(loadPersonalBest(makeStorage())).toBe(0)
  })

  it('读写往返', () => {
    const storage = makeStorage()
    expect(savePersonalBest(storage, 12_345)).toBe(12_345)
    expect(loadPersonalBest(storage)).toBe(12_345)
  })

  it('savePersonalBest 只保留更高的成绩', () => {
    const storage = makeStorage()
    savePersonalBest(storage, 50_000)
    expect(savePersonalBest(storage, 9_000)).toBe(50_000)
    expect(savePersonalBest(storage, 60_000)).toBe(60_000)
  })

  it('JSON 损坏或非法值降级为 0', () => {
    expect(loadPersonalBest(makeStorage({ 'hold-button:best': '{broken' }))).toBe(0)
    expect(loadPersonalBest(makeStorage({ 'hold-button:best': '"text"' }))).toBe(0)
    expect(loadPersonalBest(makeStorage({ 'hold-button:best': '-5' }))).toBe(0)
    expect(loadPersonalBest(makeStorage({ 'hold-button:best': 'Infinity' }))).toBe(0)
  })

  it('存储访问抛错时不中断', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage
    expect(loadPersonalBest(throwing)).toBe(0)
    expect(savePersonalBest(throwing, 1_000)).toBe(1_000)
  })
})
