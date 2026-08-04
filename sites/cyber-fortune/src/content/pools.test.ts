import { describe, expect, it } from 'vitest'
import { LEVELS, POOLS, POOL_VERSION, levelMeta } from './pools'

describe('签池形状', () => {
  it('首发规模：签诗 40 / 宜 30 / 忌 30 / 人物 20', () => {
    expect(POOLS.poems).toHaveLength(40)
    expect(POOLS.yi).toHaveLength(30)
    expect(POOLS.ji).toHaveLength(30)
    expect(POOLS.people).toHaveLength(20)
  })

  it('签诗等级分布：大吉6 / 中吉10 / 小吉10 / 平6 / 小凶8', () => {
    const count = (level: string) => POOLS.poems.filter((p) => p.level === level).length
    expect(count('大吉')).toBe(6)
    expect(count('中吉')).toBe(10)
    expect(count('小吉')).toBe(10)
    expect(count('平')).toBe(6)
    expect(count('小凶')).toBe(8)
  })

  it('等级权重表：顺序与权重符合设计（15/30/30/15/10，合计 100）', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['大吉', '中吉', '小吉', '平', '小凶'])
    expect(LEVELS.map((l) => l.weight)).toEqual([15, 30, 30, 15, 10])
    expect(LEVELS.reduce((sum, l) => sum + l.weight, 0)).toBe(100)
  })

  it('等级五色互异（群内对比的视觉基础）', () => {
    expect(new Set(LEVELS.map((l) => l.accent)).size).toBe(5)
  })

  it('levelMeta 按 id 取回元数据', () => {
    expect(levelMeta('小凶').weight).toBe(10)
  })

  it('全库 id 唯一', () => {
    const ids = [
      ...POOLS.poems.map((p) => p.id),
      ...POOLS.yi.map((i) => i.id),
      ...POOLS.ji.map((i) => i.id),
      ...POOLS.people.map((i) => i.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('冲突对引用的 id 都存在，且含「宜准点下班 × 忌准点下班」同文互斥例', () => {
    const yiIds = new Set(POOLS.yi.map((i) => i.id))
    const jiIds = new Set(POOLS.ji.map((i) => i.id))
    for (const pair of POOLS.conflicts) {
      expect(yiIds.has(pair.yi)).toBe(true)
      expect(jiIds.has(pair.ji)).toBe(true)
    }
    const texts = POOLS.conflicts.map((pair) => {
      const yi = POOLS.yi.find((i) => i.id === pair.yi)!
      const ji = POOLS.ji.find((i) => i.id === pair.ji)!
      return `${yi.text}×${ji.text}`
    })
    expect(texts).toContain('准点下班×准点下班')
  })

  it('版本号为 v1（进 seed，改池必须 bump）', () => {
    expect(POOL_VERSION).toBe('v1')
  })
})
