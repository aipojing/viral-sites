/**
 * 一秒钟世界的事实 schema：每条必须能从原始统计值与周期复算每秒速率，
 * 并携带完整来源台账（发布机构、链接、发布日期、复核日、可信度）。
 */
export type WorldChapter = 'self' | 'daily' | 'human' | 'planet'
export type Confidence = 'A' | 'B'
export type PeriodUnit = 'day' | 'month' | 'year' | 'custom-seconds'

export interface WorldFact {
  id: string
  chapter: WorldChapter
  title: string
  explanation: string
  /** 原始统计值（一个统计周期内的总量，或 custom-seconds 周期内的增量） */
  value: number
  period: { unit: PeriodUnit; seconds?: number; referenceYear?: number }
  outputUnit: string
  region: string
  decimals: 0 | 1 | 2
  /** 快照默认选择的优先级，越大越优先 */
  snapshotPriority: number
  /** 是否具有明确的中文生活语境（产品规格 5.2 的硬门槛标记） */
  chineseContext: boolean
  source: {
    title: string
    publisher: string
    url: string
    publishedAt: string
    reviewedAt: string
    confidence: Confidence
  }
}
