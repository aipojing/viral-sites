import { describe, expect, it } from 'vitest'
import { resolveRelation } from '../lib/resolve-relation'
import { MANUAL_RELATION_CASES, type ManualCaseCategory } from './manual-cases'

// 发布 gate：KINSHIP_RELEASE_GATE=on 时启用 docs/17 要求的 200 条人工样例与分类下限。
// 开发态降级：先保证现有样例 100% 通过引擎盲测，数量下限按开发态标准执行。
const RELEASE_GATE = process.env.KINSHIP_RELEASE_GATE === 'on'

const THRESHOLDS: Record<'total' | ManualCaseCategory, number> = RELEASE_GATE
  ? { total: 200, paternal: 30, maternal: 30, spousal: 30, cousin: 20, multi: 20, other: 0 }
  : { total: 50, paternal: 12, maternal: 12, spousal: 12, cousin: 8, multi: 6, other: 5 }

function countCategory(category: ManualCaseCategory): number {
  return MANUAL_RELATION_CASES.filter((item) => item.categories.includes(category)).length
}

describe('manual-cases gate', () => {
  it('样例规模与分类覆盖达到当前 gate 要求', () => {
    expect(MANUAL_RELATION_CASES.length, '样例总数').toBeGreaterThanOrEqual(THRESHOLDS.total)
    expect(countCategory('paternal'), '父系样例数').toBeGreaterThanOrEqual(THRESHOLDS.paternal)
    expect(countCategory('maternal'), '母系样例数').toBeGreaterThanOrEqual(THRESHOLDS.maternal)
    expect(countCategory('spousal'), '姻亲样例数').toBeGreaterThanOrEqual(THRESHOLDS.spousal)
    expect(countCategory('cousin'), '堂表样例数').toBeGreaterThanOrEqual(THRESHOLDS.cousin)
    expect(countCategory('multi'), '多答案样例数').toBeGreaterThanOrEqual(THRESHOLDS.multi)
  })

  it('样例 id 唯一、审核字段完整', () => {
    const ids = MANUAL_RELATION_CASES.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const item of MANUAL_RELATION_CASES) {
      expect(item.reviewedBy).toHaveLength(2)
      expect(item.reviewedBy[0], `${item.id} 需要两位不同审核角色`).not.toBe(item.reviewedBy[1])
      expect(item.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  // 盲测：每条样例的 expected 必须与引擎真实解析一致。
  // 发现不一致时修改 corpus 数据与来源，不在这里放宽期待。
  it.each(MANUAL_RELATION_CASES.map((item) => [item.id, item] as const))(
    '%s 与引擎解析一致',
    (_, testCase) => {
      const resolution = resolveRelation(testCase.query)
      expect(resolution.status, `${testCase.id} 期望状态 ${testCase.expectedStatus}`).toBe(
        testCase.expectedStatus,
      )

      if (testCase.expectedStatus !== 'resolved') {
        expect(testCase.expectedLabels).toEqual([])
        return
      }

      const labels = new Set(
        resolution.status === 'resolved' ? resolution.entries.flatMap((item) => item.entry.labels) : [],
      )
      expect([...labels].sort(), `${testCase.id} 称呼集合`).toEqual([...testCase.expectedLabels].sort())
    },
  )
})
