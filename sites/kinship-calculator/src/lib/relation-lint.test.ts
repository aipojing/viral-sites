import { describe, expect, it } from 'vitest'
import type { RegionPack } from '../data/region-packs'
import type { RelationEntry } from '../data/relation-types'
import { lintPopularRelations, lintRelationData } from './relation-lint'

function makeEntry(overrides: Partial<RelationEntry> = {}): RelationEntry {
  return {
    id: 'kc-demo',
    paths: [['mother', 'older-brother']],
    labels: ['舅舅'],
    explanation: '妈妈的哥哥。',
    lineage: 'maternal',
    generation: 1,
    confidence: 'exact',
    aliases: [],
    sourceIds: ['src-wiki-zh-kinship'],
    ...overrides,
  }
}

function makePack(overrides: Partial<RegionPack> = {}): RegionPack {
  return {
    id: 'pack-demo',
    label: '示例地区',
    entries: [
      {
        relationId: 'kc-demo',
        label: '舅爷',
        region: '京津冀常见',
        sourceIds: ['src-wiki-zh-kinship'],
        reviewerRoles: ['native-a', 'native-b'],
      },
    ],
    ...overrides,
  }
}

describe('lintRelationData', () => {
  it('干净的普通话 corpus 与合规地域包没有错误', () => {
    expect(lintRelationData([makeEntry()], [makePack()])).toEqual([])
  })

  it('拒绝重复 id 与重复路径', () => {
    const errors = lintRelationData([makeEntry(), makeEntry({ labels: ['舅父'] })], [])
    expect(errors.some((error) => error.includes('重复的 entry id'))).toBe(true)
    expect(errors.some((error) => error.includes('相同条件下重复或矛盾'))).toBe(true)
  })

  it('相同路径在性别条件可区分时允许共存', () => {
    const female = makeEntry({ id: 'kc-a', subjectGender: 'female' })
    const male = makeEntry({ id: 'kc-b', subjectGender: 'male', labels: ['连襟'] })
    expect(lintRelationData([female, male], [])).toEqual([])
  })

  it('拒绝空 labels、空解释与空来源', () => {
    const errors = lintRelationData(
      [makeEntry({ id: 'kc-a', labels: [] }), makeEntry({ id: 'kc-b', explanation: '  ' }), makeEntry({ id: 'kc-c', sourceIds: [] })],
      [],
    )
    expect(errors.some((error) => error.includes('labels 不能为空'))).toBe(true)
    expect(errors.some((error) => error.includes('explanation 不能为空'))).toBe(true)
    expect(errors.some((error) => error.includes('sourceIds 不能为空'))).toBe(true)
  })

  it('拒绝未定义枚举与过长路径', () => {
    const badToken = makeEntry({ id: 'kc-a', paths: [['uncle' as never]] })
    const tooLong = makeEntry({
      id: 'kc-b',
      paths: [['father', 'father', 'father', 'father', 'father', 'father', 'father', 'father', 'father']],
    })
    const errors = lintRelationData([badToken, tooLong], [])
    expect(errors.some((error) => error.includes('未定义的关系枚举'))).toBe(true)
    expect(errors.some((error) => error.includes('超过 8 级上限'))).toBe(true)
  })

  it('拒绝未知 relationId、过宽地区名、缺双审核的地域项', () => {
    const errors = lintRelationData([makeEntry()], [
      makePack({ entries: [{ ...makePack().entries[0], relationId: 'kc-missing' }] }),
      makePack({ id: 'pack-broad', entries: [{ ...makePack().entries[0], region: '北方话' }] }),
      makePack({ id: 'pack-review', entries: [{ ...makePack().entries[0], reviewerRoles: ['same', 'same'] }] }),
    ])
    expect(errors.some((error) => error.includes('不存在的 relationId'))).toBe(true)
    expect(errors.some((error) => error.includes('地区名过宽'))).toBe(true)
    expect(errors.some((error) => error.includes('两位不同的母语者审核'))).toBe(true)
  })

  it('粤语地域包必须带读音提示', () => {
    const cantonese = makePack({
      id: 'cantonese',
      label: '粤语常见',
      entries: [{ ...makePack().entries[0], pronunciation: '' }],
    })
    const errors = lintRelationData([makeEntry()], [cantonese])
    expect(errors.some((error) => error.includes('粤拼或读音提示'))).toBe(true)
  })
})

describe('lintPopularRelations', () => {
  it('热门速查必须指向存在的 entry 且不重复', () => {
    const errors = lintPopularRelations([makeEntry()], [
      { entryId: 'kc-missing' },
      { entryId: 'kc-demo' },
      { entryId: 'kc-demo' },
    ])
    expect(errors.some((error) => error.includes('不存在的 relationId'))).toBe(true)
    expect(errors.some((error) => error.includes('重复收录'))).toBe(true)
  })
})
