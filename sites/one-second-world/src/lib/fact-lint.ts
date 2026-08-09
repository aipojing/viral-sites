import type { Confidence, PeriodUnit, WorldChapter, WorldFact } from '../data/fact-types'

/** lint 默认需要的最低门槛：与产品规格 5.2 内容配额一致 */
export const MIN_FACTS_A = 12
export const MIN_CHINESE_CONTEXT = 8
export const CHAPTERS: readonly WorldChapter[] = ['self', 'daily', 'human', 'planet']
/** 复核超过 100 天视为过期，构建失败 */
const REVIEW_STALE_MS = 100 * 86_400_000
/** 统计口径发布超过一年仍无更新，必须在 explanation 明写「历史口径」 */
const HISTORY_MARK_MS = 365 * 86_400_000

interface LintOptions {
  minFactsA?: number
  minChineseContext?: number
}

export interface FactLintIssue {
  factId?: string
  code: string
  message: string
}

function makeBaseFact(overrides: Partial<WorldFact> = {}): WorldFact {
  return {
    id: 'fact-base',
    chapter: 'daily',
    title: '示例事实',
    explanation: '示例说明。',
    value: 1_000_000,
    period: { unit: 'year', referenceYear: 2025 },
    outputUnit: '件',
    region: '中国',
    decimals: 0,
    snapshotPriority: 1,
    chineseContext: true,
    source: {
      title: '示例来源',
      publisher: '示例机构',
      url: 'https://example.gov.cn/report',
      publishedAt: '2026-01-15',
      reviewedAt: '2026-08-01',
      confidence: 'A',
    },
    ...overrides,
  }
}

function parseDate(value: string): number | null {
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

/**
 * 构建期内容门禁：重复 id、来源字段、数值合法性、周期口径、复核时效、
 * 章节配额与 A 级/中文语境硬门槛。返回空数组表示通过。
 */
export function lintFacts(
  facts: readonly WorldFact[],
  now: Date,
  options: LintOptions = {},
): readonly FactLintIssue[] {
  const issues: FactLintIssue[] = []
  const minFactsA = options.minFactsA ?? MIN_FACTS_A
  const minChineseContext = options.minChineseContext ?? MIN_CHINESE_CONTEXT
  const nowMs = now.getTime()

  const seen = new Set<string>()
  for (const fact of facts) {
    const push = (code: string, message: string) => issues.push({ factId: fact.id, code, message })

    if (seen.has(fact.id)) push('duplicate_id', `重复的事实 id：${fact.id}`)
    seen.add(fact.id)

    if (!fact.title.trim()) push('missing_title', '标题不能为空')
    if (!fact.explanation.trim()) push('missing_explanation', '说明不能为空')
    if (!fact.outputUnit.trim()) push('missing_output_unit', '输出单位不能为空')
    if (!fact.region.trim()) push('missing_region', '适用地区不能为空')

    if (!Number.isFinite(fact.value) || fact.value <= 0) {
      push('invalid_value', '原始统计值必须是正的有限数')
    }
    if (fact.decimals !== 0 && fact.decimals !== 1 && fact.decimals !== 2) {
      push('invalid_decimals', 'decimals 只能是 0/1/2')
    }

    const { period } = fact
    if (period.unit === 'custom-seconds') {
      if (typeof period.seconds !== 'number' || !Number.isFinite(period.seconds) || period.seconds <= 0) {
        push('missing_period_seconds', 'custom-seconds 周期必须带正的 seconds')
      }
    } else if (period.unit === 'month' || period.unit === 'year') {
      if (typeof period.referenceYear !== 'number' || !Number.isInteger(period.referenceYear)) {
        push('missing_reference_year', `${period.unit} 周期必须带 referenceYear`)
      }
    } else if (period.unit !== 'day') {
      push('invalid_period_unit', `未知周期单位：${(period as { unit: string }).unit}`)
    }

    const { source } = fact
    if (!source.title.trim()) push('missing_source_title', '来源标题不能为空')
    if (!source.publisher.trim()) push('missing_publisher', '来源发布机构不能为空')
    if (!source.url.startsWith('https://')) push('insecure_url', '来源必须是 https 链接')

    const publishedAt = parseDate(source.publishedAt)
    if (publishedAt === null) {
      push('invalid_published_at', '发布日期无法解析')
    } else if (publishedAt > nowMs) {
      push('future_published_at', '发布日期不能晚于当前时间')
    } else if (nowMs - publishedAt > HISTORY_MARK_MS && !fact.explanation.includes('历史口径')) {
      push('stale_without_history_mark', '发布超过一年的口径必须在说明中明写「历史口径」')
    }

    const reviewedAt = parseDate(source.reviewedAt)
    if (reviewedAt === null) {
      push('invalid_reviewed_at', '复核日期无法解析')
    } else if (reviewedAt > nowMs) {
      push('future_reviewed_at', '复核日期不能晚于当前时间')
    } else if (nowMs - reviewedAt > REVIEW_STALE_MS) {
      push('review_stale', '复核日期超过一个季度，需要重新复核')
    }

    if (source.confidence !== 'A' && source.confidence !== 'B') {
      push('missing_confidence', '可信度必须标记 A 或 B')
    }
  }

  // 汇总级门槛：章节配额、A 级数量与中文语境数量
  for (const chapter of CHAPTERS) {
    const count = facts.filter((fact) => fact.chapter === chapter).length
    if (count < 2) {
      issues.push({ code: 'chapter_quota', message: `章节 ${chapter} 至少需要 2 条事实，当前 ${count} 条` })
    }
  }
  const countA = facts.filter((fact) => fact.source.confidence === 'A').length
  if (countA < minFactsA) {
    issues.push({ code: 'min_a_sources', message: `A 级来源至少 ${minFactsA} 条，当前 ${countA} 条` })
  }
  const chineseCount = facts.filter((fact) => fact.chineseContext).length
  if (chineseCount < minChineseContext) {
    issues.push({
      code: 'min_chinese_context',
      message: `中文生活语境条目至少 ${minChineseContext} 条，当前 ${chineseCount} 条`,
    })
  }

  return issues
}

export { makeBaseFact }
export type { Confidence, PeriodUnit }
