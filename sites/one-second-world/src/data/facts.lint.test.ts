import { describe, expect, it } from 'vitest'
import { FACTS } from './facts'
import { CHAPTERS, lintFacts } from '../lib/fact-lint'

/**
 * 真实内容门禁：对 facts.ts 台账跑完整 lint（构建门禁的一部分）。
 * 与单元测试不同，这里传真实的 new Date()，且不允许降低任何门槛。
 */
describe('FACTS 内容门禁', () => {
  const now = new Date()
  const issues = lintFacts(FACTS, now)

  it('全部条目通过 lint，无问题', () => {
    if (issues.length > 0) {
      // 失败时直接打印问题，方便定位是哪条台账坏了
      console.error(JSON.stringify(issues, null, 2))
    }
    expect(issues).toEqual([])
  })

  it('条数与结构符合 v1 规划（≤20 条、每章 ≥2 条）', () => {
    expect(FACTS.length).toBeLessThanOrEqual(20)
    for (const chapter of CHAPTERS) {
      const count = FACTS.filter((fact) => fact.chapter === chapter).length
      expect(count, `章节 ${chapter} 的数量`).toBeGreaterThanOrEqual(2)
    }
  })

  it('输出 A/B 分级与章节分布（供人工复核）', () => {
    const countA = FACTS.filter((fact) => fact.source.confidence === 'A').length
    const countB = FACTS.filter((fact) => fact.source.confidence === 'B').length
    const chinese = FACTS.filter((fact) => fact.chineseContext).length
    const byChapter = CHAPTERS.map(
      (chapter) => `${chapter}:${FACTS.filter((fact) => fact.chapter === chapter).length}`,
    ).join(' ')
    // eslint-disable-next-line no-console
    console.log(`FACTS 台账统计 → 总数 ${FACTS.length} | A 级 ${countA} | B 级 ${countB} | 中文语境 ${chinese} | ${byChapter}`)
    expect(countA).toBeGreaterThanOrEqual(12)
    expect(chinese).toBeGreaterThanOrEqual(8)
  })

  it('快照候选至少有三条 A 级条目（快照只能选 A 级）', () => {
    const aFacts = FACTS.filter((fact) => fact.source.confidence === 'A')
    expect(aFacts.length).toBeGreaterThanOrEqual(3)
    const priorities = aFacts.map((fact) => fact.snapshotPriority)
    expect(new Set(priorities).size).toBe(priorities.length)
  })
})
