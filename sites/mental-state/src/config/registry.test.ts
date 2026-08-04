import { computeResult, scoreBounds } from '@viral/shared'
import { describe, expect, it } from 'vitest'
import { banWeiConfig } from './ban-wei'
import { DEFAULT_SLUG, resolveConfig } from './registry'

describe('banWeiConfig', () => {
  it('通过 schema 校验且结构达标', () => {
    expect(banWeiConfig.meta.slug).toBe('ban-wei')
    expect(banWeiConfig.questions).toHaveLength(8)
    banWeiConfig.questions.forEach((q) => expect(q.options).toHaveLength(4))
  })

  it('每题分值 0~3 递进，总分界 0~24', () => {
    banWeiConfig.questions.forEach((q) =>
      expect(q.options.map((o) => o.score)).toEqual([0, 1, 2, 3]),
    )
    expect(scoreBounds(banWeiConfig)).toEqual({ min: 0, max: 24 })
  })

  it('五档称号与档界符合设计', () => {
    expect(banWeiConfig.scoring.tiers.map((t) => t.title)).toEqual([
      '班味清新',
      '微微入味',
      '腌制中',
      '深度腌入味',
      '班味十级学者',
    ])
    expect(banWeiConfig.scoring.tiers.map((t) => t.minScore)).toEqual([0, 5, 10, 15, 20])
  })

  it('percentRange 相连覆盖 0~100', () => {
    const ranges = banWeiConfig.scoring.tiers.map((t) => t.percentRange)
    expect(ranges[0][0]).toBe(0)
    expect(ranges[4][1]).toBe(100)
    for (let i = 1; i < ranges.length; i += 1) {
      expect(ranges[i][0]).toBe(ranges[i - 1][1] + 1)
    }
  })

  it('全选最低 → 班味清新 0%，全选最高 → 班味十级学者 100%', () => {
    const low = computeResult(banWeiConfig, [0, 0, 0, 0, 0, 0, 0, 0])
    expect(low.tier.title).toBe('班味清新')
    expect(low.percent).toBe(0)
    const high = computeResult(banWeiConfig, [3, 3, 3, 3, 3, 3, 3, 3])
    expect(high.tier.title).toBe('班味十级学者')
    expect(high.percent).toBe(100)
  })
})

describe('resolveConfig', () => {
  it('无参数回落默认题库', () =>
    expect(resolveConfig('').meta.slug).toBe(DEFAULT_SLUG))
  it('?t=ban-wei 命中', () =>
    expect(resolveConfig('?t=ban-wei').meta.slug).toBe('ban-wei'))
  it('未知 slug 回落默认（不白屏）', () =>
    expect(resolveConfig('?t=not-exist').meta.slug).toBe(DEFAULT_SLUG))
})
