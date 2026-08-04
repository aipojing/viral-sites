import { describe, expect, it } from 'vitest'
import { pickN, pickOne, seededSequence } from './sequence'

describe('seededSequence', () => {
  it('同 seed 产生完全相同的序列', () => {
    const a = seededSequence(12345)
    const b = seededSequence(12345)
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('不同 seed 序列不同', () => {
    const a = seededSequence(1)
    const b = seededSequence(2)
    expect(Array.from({ length: 5 }, () => a())).not.toEqual(
      Array.from({ length: 5 }, () => b()),
    )
  })

  it('取值均在 [0, 1)', () => {
    const next = seededSequence(999)
    for (let i = 0; i < 1000; i += 1) {
      const v = next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('pickOne', () => {
  it('确定性：同 seed 同结果', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']
    expect(pickOne(seededSequence(7), pool)).toBe(pickOne(seededSequence(7), pool))
  })

  it('空池抛错', () => {
    expect(() => pickOne(seededSequence(1), [])).toThrow('pickOne: empty pool')
  })

  it('分布均匀性：1000 次抽样，10 元素池每个命中 60~140 次（期望 100）', () => {
    const pool = Array.from({ length: 10 }, (_, i) => i)
    const next = seededSequence(42)
    const counts = new Map<number, number>()
    for (let i = 0; i < 1000; i += 1) {
      const v = pickOne(next, pool)
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    for (const item of pool) {
      const c = counts.get(item) ?? 0
      expect(c).toBeGreaterThanOrEqual(60)
      expect(c).toBeLessThanOrEqual(140)
    }
  })
})

describe('pickN', () => {
  it('不重复且长度正确', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f']
    const out = pickN(seededSequence(3), pool, 3)
    expect(out).toHaveLength(3)
    expect(new Set(out).size).toBe(3)
  })

  it('确定性：同 seed 同结果', () => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(pickN(seededSequence(11), pool, 4)).toEqual(pickN(seededSequence(11), pool, 4))
  })

  it('不改动传入数组（不可变）', () => {
    const pool = ['a', 'b', 'c', 'd']
    const snapshot = [...pool]
    pickN(seededSequence(5), pool, 2)
    expect(pool).toEqual(snapshot)
  })

  it('n 超过池子大小抛错', () => {
    expect(() => pickN(seededSequence(1), ['a'], 2)).toThrow('pickN')
  })

  it('分布覆盖：500 次 pickN(3/6)，每个元素入选 180~320 次（期望 250）', () => {
    const pool = [0, 1, 2, 3, 4, 5]
    const next = seededSequence(2026)
    const counts = new Map<number, number>()
    for (let i = 0; i < 500; i += 1) {
      for (const v of pickN(next, pool, 3)) {
        counts.set(v, (counts.get(v) ?? 0) + 1)
      }
    }
    for (const item of pool) {
      const c = counts.get(item) ?? 0
      expect(c).toBeGreaterThanOrEqual(180)
      expect(c).toBeLessThanOrEqual(320)
    }
  })
})
