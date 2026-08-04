import { describe, expect, it } from 'vitest'
import { parseTestConfig } from './schema'
import { makeRawConfig } from './schema.fixtures'

describe('parseTestConfig', () => {
  it('合法配置通过，mode 默认 linear', () => {
    const config = parseTestConfig(makeRawConfig())
    expect(config.scoring.mode).toBe('linear')
    expect(config.questions).toHaveLength(8)
    expect(config.scoring.tiers).toHaveLength(5)
  })

  it('题数不是 8 拒绝', () => {
    const base = makeRawConfig()
    const raw = { ...base, questions: base.questions.slice(0, 7) }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('选项少于 3 个拒绝', () => {
    const base = makeRawConfig()
    const bad = { ...base.questions[0], options: base.questions[0].options.slice(0, 2) }
    const raw = { ...base, questions: [bad, ...base.questions.slice(1)] }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('分档不是 5 档拒绝', () => {
    const base = makeRawConfig()
    const raw = {
      ...base,
      scoring: { ...base.scoring, tiers: base.scoring.tiers.slice(0, 4) },
    }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('第一档 minScore 不为 0 拒绝', () => {
    const base = makeRawConfig()
    const tiers = [{ ...base.scoring.tiers[0], minScore: 1 }, ...base.scoring.tiers.slice(1)]
    const raw = { ...base, scoring: { ...base.scoring, tiers } }
    expect(() => parseTestConfig(raw)).toThrow('第一档 minScore 必须为 0')
  })

  it('minScore 不严格递增拒绝', () => {
    const base = makeRawConfig()
    const tiers = base.scoring.tiers.map((t, i) => (i === 2 ? { ...t, minScore: 5 } : t))
    const raw = { ...base, scoring: { ...base.scoring, tiers } }
    expect(() => parseTestConfig(raw)).toThrow('minScore 必须严格递增')
  })

  it('报告文案不是 3 条拒绝', () => {
    const base = makeRawConfig()
    const tiers = [
      { ...base.scoring.tiers[0], comments: ['只有一条'] },
      ...base.scoring.tiers.slice(1),
    ]
    const raw = { ...base, scoring: { ...base.scoring, tiers } }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('非对象输入拒绝且不崩溃', () => {
    expect(() => parseTestConfig(null)).toThrow('测试配置不合法')
    expect(() => parseTestConfig('x')).toThrow('测试配置不合法')
  })
})
