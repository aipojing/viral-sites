import { describe, expect, it } from 'vitest'
import { parseTestConfig } from './schema'
import { makeRawConfig } from './schema.fixtures'
import { makeRawTagsConfig } from './tags.fixtures'

describe('parseTestConfig v2 · tags 模式', () => {
  it('合法 tags 配置通过', () => {
    const config = parseTestConfig(makeRawTagsConfig())
    expect(config.scoring.mode).toBe('tags')
    if (config.scoring.mode === 'tags') {
      expect(config.scoring.dimensions).toHaveLength(2)
      expect(config.scoring.ageJitterSpan).toBe(5)
    }
  })

  it('ageJitterSpan 缺省为 5', () => {
    const base = makeRawTagsConfig()
    const { ageJitterSpan: _drop, ...scoring } = base.scoring
    const config = parseTestConfig({ ...base, scoring })
    if (config.scoring.mode === 'tags') expect(config.scoring.ageJitterSpan).toBe(5)
  })

  it('选项引用未注册 tag 拒绝', () => {
    const base = makeRawTagsConfig()
    const bad = {
      ...base.questions[0],
      options: [{ text: '幽灵', tags: { Z: 1 } }, ...base.questions[0].options.slice(1)],
    }
    const raw = { ...base, questions: [bad, ...base.questions.slice(1)] }
    expect(() => parseTestConfig(raw)).toThrow('未知 tag')
  })

  it('dimensions tag 重复拒绝', () => {
    const base = makeRawTagsConfig()
    const dims = [base.scoring.dimensions[0], { ...base.scoring.dimensions[1], tag: 'X' }]
    const raw = { ...base, scoring: { ...base.scoring, dimensions: dims } }
    expect(() => parseTestConfig(raw)).toThrow('tag 重复')
  })

  it('选项 tags 为空对象拒绝', () => {
    const base = makeRawTagsConfig()
    const bad = {
      ...base.questions[0],
      options: [{ text: '空的', tags: {} }, ...base.questions[0].options.slice(1)],
    }
    const raw = { ...base, questions: [bad, ...base.questions.slice(1)] }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('权重非正数拒绝', () => {
    const base = makeRawTagsConfig()
    const bad = {
      ...base.questions[0],
      options: [{ text: '负权', tags: { X: -1 } }, ...base.questions[0].options.slice(1)],
    }
    const raw = { ...base, questions: [bad, ...base.questions.slice(1)] }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('向后兼容：02 的 linear 原始配置照常通过，且可带可选 note', () => {
    const linear = parseTestConfig(makeRawConfig())
    expect(linear.scoring.mode).toBe('linear')
    const base = makeRawConfig()
    const withNote = {
      ...base,
      questions: [{ ...base.questions[0], note: '年代标注' }, ...base.questions.slice(1)],
    }
    expect(() => parseTestConfig(withNote)).not.toThrow()
  })
})
