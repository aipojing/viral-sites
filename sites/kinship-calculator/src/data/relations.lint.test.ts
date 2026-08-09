import { describe, expect, it } from 'vitest'
import { MANDARIN_RELATIONS, RELATION_SOURCES } from './mandarin-relations'
import { POPULAR_RELATIONS } from './popular-relations'
import { REGION_PACKS } from './region-packs'
import { lintPopularRelations, lintRelationData } from '../lib/relation-lint'

// 真实数据 lint：corpus 有任何结构问题，构建直接失败
describe('relations.lint', () => {
  it('普通话 corpus 与地域包通过全部 lint 规则', () => {
    expect(lintRelationData(MANDARIN_RELATIONS, REGION_PACKS)).toEqual([])
  })

  it('热门速查全部指向已审核 entry', () => {
    expect(lintPopularRelations(MANDARIN_RELATIONS, POPULAR_RELATIONS)).toEqual([])
  })

  it('每条 entry 的来源都在来源表中可查', () => {
    const sourceIds = new Set(RELATION_SOURCES.map((source) => source.id))
    for (const entry of MANDARIN_RELATIONS) {
      for (const sourceId of entry.sourceIds) {
        expect(sourceIds.has(sourceId), `${entry.id} 引用了未知来源 ${sourceId}`).toBe(true)
      }
    }
    for (const source of RELATION_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('每条解释都说明了辈分或亲缘方向', () => {
    for (const entry of MANDARIN_RELATIONS) {
      expect(
        /辈|同辈|高一辈|低一辈|下一代|上一代|同姓|异姓/.test(entry.explanation),
        `${entry.id} 的解释需要说明辈分：${entry.explanation}`,
      ).toBe(true)
    }
  })

  it('v1 覆盖三代以内，路径深度不超过 4 级', () => {
    for (const entry of MANDARIN_RELATIONS) {
      for (const path of entry.paths) {
        expect(path.length, `${entry.id} 超出 v1 范围`).toBeLessThanOrEqual(4)
      }
    }
  })

  it('开发态地域包为空时保持空数组，不得填猜测数据', () => {
    expect(REGION_PACKS).toEqual([])
  })
})
