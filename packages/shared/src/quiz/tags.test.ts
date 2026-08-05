import { describe, expect, it } from 'vitest'
import { parseTestConfig } from './schema'
import { makeRawConfig } from './schema.fixtures'
import { makeRawTagsConfig } from './tags.fixtures'
import { computeResult } from './scoring'
import { aggregateTags, computeTagsResult, mentalAgeOf, normalizeShares } from './tags'

const tagsConfig = parseTestConfig(makeRawTagsConfig())
const linearConfig = parseTestConfig(makeRawConfig())
const ALL_X = [0, 0, 0, 0, 0, 0, 0, 0]
const ALL_HALF = [2, 2, 2, 2, 2, 2, 2, 2]

describe('normalizeShares', () => {
  it('整除场景直出', () => expect(normalizeShares([5, 5])).toEqual([50, 50]))
  it('最大余数法补齐 100：[1,1,1] → [34,33,33]', () =>
    expect(normalizeShares([1, 1, 1])).toEqual([34, 33, 33]))
  it('含 0 维度：[4,9,3,0,0] → [25,56,19,0,0]', () =>
    expect(normalizeShares([4, 9, 3, 0, 0])).toEqual([25, 56, 19, 0, 0]))
  it('单维直接 100', () => expect(normalizeShares([7])).toEqual([100]))
  it('总和为 0 抛错', () => expect(() => normalizeShares([0, 0])).toThrow('成分总分必须大于 0'))
})

describe('aggregateTags', () => {
  it('逐题累加权重，未命中 tag 记 0', () => {
    if (tagsConfig.scoring.mode !== 'tags') throw new Error('fixture 应为 tags 配置')
    expect(aggregateTags(tagsConfig, ALL_X)).toEqual({ X: 16, Y: 0 })
    expect(aggregateTags(tagsConfig, ALL_HALF)).toEqual({ X: 8, Y: 8 })
  })
  it('答案数量不对抛错（复用 assertAnswers）', () => {
    if (tagsConfig.scoring.mode !== 'tags') throw new Error('fixture 应为 tags 配置')
    expect(() => aggregateTags(tagsConfig, [0])).toThrow('答案数量不对')
  })
})

describe('mentalAgeOf', () => {
  it('锚点加权 + 确定性扰动：X:6 Y:3 → 33 + (9%5-2) = 35', () => {
    if (tagsConfig.scoring.mode !== 'tags') throw new Error('fixture 应为 tags 配置')
    expect(mentalAgeOf(tagsConfig, { X: 6, Y: 3 })).toBe(35)
  })
  it('总分为 0 抛错', () => {
    if (tagsConfig.scoring.mode !== 'tags') throw new Error('fixture 应为 tags 配置')
    expect(() => mentalAgeOf(tagsConfig, { X: 0, Y: 0 })).toThrow('成分总分必须大于 0')
  })
})

describe('computeTagsResult', () => {
  it('全选 X：成分 100/0，主成分 X，网龄 40+(16%5-2)=39，锐评确定性命中', () => {
    const result = computeTagsResult(tagsConfig, ALL_X)
    expect(result.composition.map((s) => [s.tag, s.percent])).toEqual([
      ['X', 100],
      ['Y', 0],
    ])
    expect(result.dominant.title).toBe('X 系传人')
    expect(result.mentalAge).toBe(39)
    expect(result.comment).toBe(result.dominant.comments[39 % 3])
  })

  it('平手主成分决策：raw 相同取 dimensions 先注册者', () => {
    const result = computeTagsResult(tagsConfig, ALL_HALF)
    expect(result.raws).toEqual({ X: 8, Y: 8 })
    expect(result.dominant.tag).toBe('X')
    expect(result.composition.map((s) => s.percent)).toEqual([50, 50])
    expect(result.mentalAge).toBe(29)
  })

  it('确定性：同输入两次结果深等', () => {
    expect(computeTagsResult(tagsConfig, ALL_X)).toEqual(computeTagsResult(tagsConfig, ALL_X))
  })

  it('linear 配置进 tags 计分抛错', () =>
    expect(() => computeTagsResult(linearConfig, ALL_X)).toThrow(
      'computeTagsResult 仅支持 tags 模式配置',
    ))
})

describe('linear 守卫（v2 新增，不动 02 用例）', () => {
  it('tags 配置进线性计分抛错', () =>
    expect(() => computeResult(tagsConfig, ALL_X)).toThrow(
      '线性计分函数仅支持 mode 为 linear 的配置',
    ))
})
