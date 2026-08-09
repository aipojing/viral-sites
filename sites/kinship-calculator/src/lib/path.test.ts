import { describe, expect, it } from 'vitest'
import type { RelationToken } from '../data/relation-types'
import { appendRelation, pathKey, removeLastRelation } from './path'

describe('pathKey', () => {
  it('按固定格式生成稳定的查询键，并把性别计入键', () => {
    expect(pathKey(['mother', 'older-brother'], 'unspecified')).toBe('unspecified:mother>older-brother')
    expect(pathKey(['mother', 'older-brother'], 'male')).toBe('male:mother>older-brother')
    expect(pathKey(['mother', 'older-brother'], 'male')).not.toBe(
      pathKey(['mother', 'older-brother'], 'female'),
    )
  })

  it('不同顺序的关系链是不同的键', () => {
    expect(pathKey(['father', 'mother'], 'unspecified')).not.toBe(
      pathKey(['mother', 'father'], 'unspecified'),
    )
  })
})

describe('appendRelation', () => {
  it('追加一级关系并返回新数组，不修改原路径', () => {
    const base: readonly RelationToken[] = ['mother']
    const next = appendRelation(base, 'older-brother')

    expect(next).toEqual(['mother', 'older-brother'])
    expect(base).toEqual(['mother'])
    expect(next).not.toBe(base)
  })

  it('超过 8 级直接抛错，不做静默截断', () => {
    const deep: RelationToken[] = ['father', 'father', 'father', 'father', 'father', 'father', 'father', 'father']

    expect(() => appendRelation(deep, 'father')).toThrow(RangeError)
  })

  it('拒绝重复自己的配偶，但允许链路后段出现亲属的配偶', () => {
    // 已经有丈夫/妻子再点配偶 token 没有意义
    expect(() => appendRelation(['husband'], 'husband')).toThrow(RangeError)
    expect(() => appendRelation(['wife'], 'wife')).toThrow(RangeError)
    expect(() => appendRelation(['husband'], 'wife')).toThrow(RangeError)
    expect(() => appendRelation(['wife', 'older-sister'], 'husband')).not.toThrow()
    // 亲属的配偶之后仍可继续延伸（如 妯娌 后再查其子女）
    expect(() => appendRelation(['husband', 'older-brother', 'wife'], 'son')).not.toThrow()
  })
})

describe('removeLastRelation', () => {
  it('撤销最后一级并返回新数组', () => {
    const base: readonly RelationToken[] = ['mother', 'older-brother', 'daughter']
    const next = removeLastRelation(base)

    expect(next).toEqual(['mother', 'older-brother'])
    expect(base).toHaveLength(3)
  })

  it('空路径撤销后仍是空路径', () => {
    expect(removeLastRelation([])).toEqual([])
  })
})
