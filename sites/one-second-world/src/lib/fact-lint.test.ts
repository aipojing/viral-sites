import { describe, expect, it } from 'vitest'
import type { WorldFact } from '../data/fact-types'
import { CHAPTERS, lintFacts, makeBaseFact } from './fact-lint'

const NOW = new Date('2026-08-09T12:00:00+08:00')

/** 生成满足所有单条规则、且覆盖四章与硬门槛（12 条 A 级）的最小合规集合 */
function makeValidSet(): WorldFact[] {
  const facts: WorldFact[] = []
  const chapters = [...CHAPTERS, ...CHAPTERS, ...CHAPTERS]
  chapters.forEach((chapter, index) => {
    facts.push(
      makeBaseFact({
        id: `fact-${index}`,
        chapter,
        chineseContext: index < 8,
        snapshotPriority: index,
      }),
    )
  })
  return facts
}

function issuesOf(facts: WorldFact[]): string[] {
  return lintFacts(facts, NOW).map((issue) => issue.code)
}

describe('lintFacts', () => {
  it('合规集合不产生问题', () => {
    expect(lintFacts(makeValidSet(), NOW)).toEqual([])
  })

  it('拒绝重复 id', () => {
    const facts = makeValidSet()
    facts[1] = { ...facts[1], id: facts[0].id }
    expect(issuesOf(facts)).toContain('duplicate_id')
  })

  it('拒绝缺发布机构或非 https 的来源', () => {
    const facts = makeValidSet()
    facts[0] = { ...facts[0], source: { ...facts[0].source, publisher: '' } }
    facts[1] = { ...facts[1], source: { ...facts[1].source, url: 'http://example.gov.cn/x' } }
    const codes = issuesOf(facts)
    expect(codes).toContain('missing_publisher')
    expect(codes).toContain('insecure_url')
  })

  it('拒绝负值与 NaN 原始统计值', () => {
    const negative = makeValidSet()
    negative[0] = { ...negative[0], value: -1 }
    expect(issuesOf(negative)).toContain('invalid_value')

    const nan = makeValidSet()
    nan[0] = { ...nan[0], value: Number.NaN }
    expect(issuesOf(nan)).toContain('invalid_value')
  })

  it('custom-seconds 必须带正的 seconds', () => {
    const facts = makeValidSet()
    facts[0] = { ...facts[0], period: { unit: 'custom-seconds' } }
    expect(issuesOf(facts)).toContain('missing_period_seconds')
  })

  it('month/year 必须带 referenceYear', () => {
    const facts = makeValidSet()
    facts[0] = { ...facts[0], period: { unit: 'month' } }
    facts[1] = { ...facts[1], period: { unit: 'year' } }
    expect(issuesOf(facts).filter((code) => code === 'missing_reference_year')).toHaveLength(2)
  })

  it('拒绝未来的发布日期', () => {
    const facts = makeValidSet()
    facts[0] = { ...facts[0], source: { ...facts[0].source, publishedAt: '2027-01-01' } }
    expect(issuesOf(facts)).toContain('future_published_at')
  })

  it('复核超过一季度视为过期', () => {
    const facts = makeValidSet()
    facts[0] = { ...facts[0], source: { ...facts[0].source, reviewedAt: '2026-04-01' } }
    expect(issuesOf(facts)).toContain('review_stale')
  })

  it('发布超过一年且未标注历史口径会被拒绝', () => {
    const facts = makeValidSet()
    facts[0] = { ...facts[0], source: { ...facts[0].source, publishedAt: '2024-07-01' } }
    expect(issuesOf(facts)).toContain('stale_without_history_mark')

    const marked = makeValidSet()
    marked[0] = {
      ...marked[0],
      explanation: '历史口径：2024 年数据，新版发布后更新。',
      source: { ...marked[0].source, publishedAt: '2024-07-01' },
    }
    expect(issuesOf(marked)).not.toContain('stale_without_history_mark')
  })

  it('每个章节至少两条，A 级与中文语境有硬门槛', () => {
    const onlyDaily = makeValidSet().filter((fact) => fact.chapter === 'daily')
    const codes = issuesOf(onlyDaily)
    expect(codes).toContain('chapter_quota')

    const fewA = makeValidSet().map((fact, index) =>
      index >= 4 ? { ...fact, source: { ...fact.source, confidence: 'B' as const } } : fact,
    )
    expect(issuesOf(fewA)).toContain('min_a_sources')

    const fewChinese = makeValidSet().map((fact, index) => ({ ...fact, chineseContext: index < 2 }))
    expect(issuesOf(fewChinese)).toContain('min_chinese_context')
  })

  it('门槛可以通过 options 覆盖（单元测试小集合用）', () => {
    const tiny = [makeBaseFact({ id: 'a' }), makeBaseFact({ id: 'b' })]
    const issues = lintFacts(tiny, NOW, { minFactsA: 1, minChineseContext: 1 })
    // 仍然要满足章节配额：只有 daily 两条，其他章节报配额
    expect(issues.map((issue) => issue.code)).toEqual(['chapter_quota', 'chapter_quota', 'chapter_quota'])
  })
})
