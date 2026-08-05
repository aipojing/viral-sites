import { computeTagsResult } from '@viral/shared'
import { describe, expect, it } from 'vitest'
import { wangGanConfig } from './wang-gan'
import { DEFAULT_SLUG, resolveConfig } from './registry'

const TAGS = ['贴吧遗老', 'QQ空间贵族', '微博冲浪元老', '抽象人', '小红书新贵']

describe('wangGanConfig · 题库 lint', () => {
  it('tags 模式，8 题 4 选项，五维齐全', () => {
    expect(wangGanConfig.meta.slug).toBe('wang-gan')
    expect(wangGanConfig.scoring.mode).toBe('tags')
    expect(wangGanConfig.questions).toHaveLength(8)
    wangGanConfig.questions.forEach((q) => expect(q.options).toHaveLength(4))
    expect(wangGanConfig.scoring.dimensions.map((d) => d.tag)).toEqual(TAGS)
  })

  it('锚点年龄 40/35/30/24/19，互不重复', () => {
    expect(wangGanConfig.scoring.dimensions.map((d) => d.anchorAge)).toEqual([40, 35, 30, 24, 19])
  })

  it('时效校准制度：每题都有非空梗年代标注 note', () => {
    wangGanConfig.questions.forEach((q) => {
      expect(q.note).toBeTruthy()
      expect((q.note ?? '').length).toBeGreaterThan(4)
    })
  })

  it('每维全题库可得权重 ≥ 8', () => {
    const totals: Record<string, number> = Object.fromEntries(TAGS.map((t) => [t, 0]))
    for (const q of wangGanConfig.questions) {
      for (const o of q.options) {
        for (const [tag, w] of Object.entries(o.tags ?? {})) totals[tag] += w
      }
    }
    for (const tag of TAGS) expect(totals[tag]).toBeGreaterThanOrEqual(8)
  })

  it('对齐设计文档口径：全选首项 → 主成分 QQ空间贵族，精神网龄 34', () => {
    const result = computeTagsResult(wangGanConfig, [0, 0, 0, 0, 0, 0, 0, 0])
    expect(result.dominant.title).toBe('QQ空间贵族')
    expect(result.mentalAge).toBe(34)
    expect(result.composition.map((s) => [s.tag, s.percent])).toEqual([
      ['QQ空间贵族', 56],
      ['贴吧遗老', 25],
      ['微博冲浪元老', 19],
      ['抽象人', 0],
      ['小红书新贵', 0],
    ])
  })
})

describe('resolveConfig', () => {
  it('无参数回落默认题库', () => expect(resolveConfig('').meta.slug).toBe(DEFAULT_SLUG))
  it('?t=wang-gan 命中', () => expect(resolveConfig('?t=wang-gan').meta.slug).toBe('wang-gan'))
  it('未知 slug 回落默认（不白屏）', () =>
    expect(resolveConfig('?t=not-exist').meta.slug).toBe(DEFAULT_SLUG))
})
