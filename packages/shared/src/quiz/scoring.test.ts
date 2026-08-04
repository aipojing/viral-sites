import { describe, expect, it } from 'vitest'
import { makeRawConfig } from './schema.fixtures'
import { parseTestConfig } from './schema'
import {
  computeResult,
  percentInTier,
  resolveTier,
  scoreBounds,
  totalScore,
} from './scoring'

const config = parseTestConfig(makeRawConfig())
const ALL_MIN = [0, 0, 0, 0, 0, 0, 0, 0]
const ALL_MAX = [3, 3, 3, 3, 3, 3, 3, 3]

describe('totalScore', () => {
  it('全选最低分 = 0', () => expect(totalScore(config, ALL_MIN)).toBe(0))
  it('全选最高分 = 24', () => expect(totalScore(config, ALL_MAX)).toBe(24))
  it('混合作答逐题求和', () =>
    expect(totalScore(config, [0, 1, 2, 3, 0, 1, 2, 3])).toBe(12))
  it('答案数量不对抛错', () =>
    expect(() => totalScore(config, [0, 1])).toThrow('答案数量不对'))
  it('选项下标越界抛错', () =>
    expect(() => totalScore(config, [0, 0, 0, 0, 0, 0, 0, 4])).toThrow('第 8 题答案越界'))
  it('非整数下标抛错', () =>
    expect(() => totalScore(config, [0, 0, 0, 0, 0, 0, 0, 1.5])).toThrow('第 8 题答案越界'))
})

describe('scoreBounds', () => {
  it('全 0~3 分制 8 题 → { 0, 24 }', () =>
    expect(scoreBounds(config)).toEqual({ min: 0, max: 24 }))
})

describe('resolveTier', () => {
  it('档位边界：4 → 一档，5 → 二档', () => {
    expect(resolveTier(config, 4).title).toBe('一档')
    expect(resolveTier(config, 5).title).toBe('二档')
  })
  it('档位边界：19 → 四档，20 → 五档', () => {
    expect(resolveTier(config, 19).title).toBe('四档')
    expect(resolveTier(config, 20).title).toBe('五档')
  })
})

describe('percentInTier', () => {
  it('全档最低分落在区间下缘：0 → 0，5 → 20，20 → 85', () => {
    expect(percentInTier(config, 0)).toBe(0)
    expect(percentInTier(config, 5)).toBe(20)
    expect(percentInTier(config, 20)).toBe(85)
  })
  it('档内线性：12 → 52（40 + 2/4 × 24）', () =>
    expect(percentInTier(config, 12)).toBe(52))
  it('末档用 scoreBounds.max 收口：22 → 93，24 → 100', () => {
    expect(percentInTier(config, 22)).toBe(93)
    expect(percentInTier(config, 24)).toBe(100)
  })
})

describe('computeResult', () => {
  it('组装 score/tier/percent', () => {
    const result = computeResult(config, ALL_MAX)
    expect(result.score).toBe(24)
    expect(result.tier.title).toBe('五档')
    expect(result.percent).toBe(100)
  })
})
