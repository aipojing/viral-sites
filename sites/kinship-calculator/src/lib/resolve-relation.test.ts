import { describe, expect, it } from 'vitest'
import type { RegionPack } from '../data/region-packs'
import { resolveRelation } from './resolve-relation'

describe('resolveRelation', () => {
  it('空路径返回 unresolved empty', () => {
    expect(resolveRelation({ path: [], subjectGender: 'unspecified' })).toEqual({
      status: 'unresolved',
      reason: 'empty',
    })
  })

  it('妈妈的哥哥的女儿解析为表姐/表妹', () => {
    const result = resolveRelation({
      path: ['mother', 'older-brother', 'daughter'],
      subjectGender: 'unspecified',
    })

    expect(result.status).toBe('resolved')
    if (result.status !== 'resolved') throw new Error('unreachable')
    expect(result.confidence).toBe('exact')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].entry.labels).toEqual(['表姐', '表妹'])
    expect(result.entries[0].entry.id).toBe('kc-biao-sister-jiu')
  })

  it('多路径 entry 的任一路径都能命中（堂哥：伯父或叔叔的儿子）', () => {
    for (const path of [
      ['father', 'older-brother', 'son'],
      ['father', 'younger-brother', 'son'],
    ] as const) {
      const result = resolveRelation({ path: [...path], subjectGender: 'unspecified' })
      expect(result.status).toBe('resolved')
      if (result.status !== 'resolved') throw new Error('unreachable')
      expect(result.entries[0].entry.id).toBe('kc-tang-brother')
      expect(result.entries[0].entry.labels).toEqual(['堂哥', '堂弟'])
    }
  })

  it('姻亲路径可以解析（丈夫的妈妈是婆婆）', () => {
    const result = resolveRelation({ path: ['husband', 'mother'], subjectGender: 'female' })
    expect(result.status).toBe('resolved')
    if (result.status !== 'resolved') throw new Error('unreachable')
    expect(result.entries[0].entry.labels).toEqual(['婆婆'])
  })

  it('性别条件 entry 在未指定性别时追问，而不是直接命中', () => {
    const result = resolveRelation({
      path: ['wife', 'older-sister', 'husband'],
      subjectGender: 'unspecified',
    })
    expect(result.status).toBe('needs-gender')
    if (result.status !== 'needs-gender') throw new Error('unreachable')
    expect(result.candidates.map((entry) => entry.id)).toEqual(['kc-lianjin'])
  })

  it('追问后给出性别即可解析（男性称连襟，女性语境无标准称呼）', () => {
    const male = resolveRelation({ path: ['wife', 'older-sister', 'husband'], subjectGender: 'male' })
    expect(male.status).toBe('resolved')

    const female = resolveRelation({ path: ['wife', 'older-sister', 'husband'], subjectGender: 'female' })
    expect(female).toEqual({ status: 'unresolved', reason: 'not-covered' })
  })

  it('词库未收录的链路返回 not-covered，不做模糊猜测', () => {
    const result = resolveRelation({
      path: ['father', 'father', 'older-brother', 'son'],
      subjectGender: 'unspecified',
    })
    expect(result).toEqual({ status: 'unresolved', reason: 'not-covered' })
  })

  it('超过八级的链路返回 too-distant', () => {
    const deep = ['father', 'father', 'father', 'father', 'father', 'father', 'father', 'father', 'father'] as const
    const result = resolveRelation({ path: [...deep], subjectGender: 'unspecified' })
    expect(result).toEqual({ status: 'unresolved', reason: 'too-distant' })
  })

  it('地域包只给已解析结果追加称呼，不改变亲缘关系', () => {
    const pack: RegionPack = {
      id: 'pack-test',
      label: '测试地区',
      entries: [
        {
          relationId: 'kc-maternal-grandmother',
          label: '姥姥',
          region: '京津冀常见',
          sourceIds: ['src-wiki-zh-kinship'],
          reviewerRoles: ['native-a', 'native-b'],
        },
      ],
    }

    const result = resolveRelation(
      { path: ['mother', 'mother'], subjectGender: 'unspecified', regionPackId: 'pack-test' },
      undefined,
      [pack],
    )

    expect(result.status).toBe('resolved')
    if (result.status !== 'resolved') throw new Error('unreachable')
    expect(result.confidence).toBe('regional')
    expect(result.entries[0].entry.id).toBe('kc-maternal-grandmother')
    expect(result.entries[0].regionalLabels.map((item) => item.label)).toEqual(['姥姥'])
  })

  it('地域包不会让未收录的路径变成已解析', () => {
    const pack: RegionPack = {
      id: 'pack-test',
      label: '测试地区',
      entries: [
        {
          relationId: 'kc-maternal-grandmother',
          label: '姥姥',
          region: '京津冀常见',
          sourceIds: ['src-wiki-zh-kinship'],
          reviewerRoles: ['native-a', 'native-b'],
        },
      ],
    }
    const result = resolveRelation(
      { path: ['father', 'father', 'older-brother', 'son'], subjectGender: 'unspecified', regionPackId: 'pack-test' },
      undefined,
      [pack],
    )
    expect(result.status).toBe('unresolved')
  })
})
