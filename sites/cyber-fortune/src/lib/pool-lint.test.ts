import { describe, expect, it } from 'vitest'
import { POOLS } from '../content/pools'
import { lintPools } from './pool-lint'

const cleanBase = {
  poems: [{ id: 'p1', level: '平' as const, lines: ['风平浪静', '适合发呆'] as const }],
  yi: [{ id: 'y1', text: '摸鱼' }],
  ji: [{ id: 'j1', text: '接锅' }],
  people: [{ id: 'r1', text: '食堂阿姨' }],
  conflicts: [],
} as const

describe('lintPools', () => {
  it('真实签池零违规（构建期门禁）', () => {
    expect(lintPools(POOLS)).toEqual([])
  })

  it('红线词命中（投资类「买入」）', () => {
    const bad = { ...cleanBase, yi: [{ id: 'y1', text: '逢低买入' }] }
    expect(lintPools(bad).some((v) => v.rule === 'blacklist' && v.text === '逢低买入')).toBe(true)
  })

  it('红线词命中（宗教单字「神」）', () => {
    const bad = { ...cleanBase, people: [{ id: 'r1', text: '财神爷' }] }
    expect(lintPools(bad).some((v) => v.rule === 'blacklist')).toBe(true)
  })

  it('签诗行超 8 字命中长度规则', () => {
    const bad = {
      ...cleanBase,
      poems: [{ id: 'p1', level: '平' as const, lines: ['这一行签诗有九个字', '短'] as const }],
    } as const
    expect(lintPools(bad).some((v) => v.rule === 'length')).toBe(true)
  })

  it('池内重复文本命中', () => {
    const bad = {
      ...cleanBase,
      yi: [
        { id: 'y1', text: '摸鱼' },
        { id: 'y2', text: '摸鱼' },
      ],
    }
    expect(lintPools(bad).some((v) => v.rule === 'duplicate')).toBe(true)
  })

  it('冲突对引用不存在的 id 命中完整性规则', () => {
    const bad = { ...cleanBase, conflicts: [{ yi: 'y1', ji: 'j999' }] }
    expect(lintPools(bad).some((v) => v.rule === 'conflict-integrity')).toBe(true)
  })
})
