import { describe, expect, it } from 'vitest'
import { FACTS } from '../data/facts'
import type { WorldChapter, WorldFact } from '../data/fact-types'
import { replaceSnapshotFact, selectSnapshotFacts } from './snapshot'

let seq = 0

/** 合成事实：period=custom-seconds 1 秒，value 即每秒速率，便于控制 waiting/count */
function makeFact(options: {
  id?: string
  chapter?: WorldChapter
  ratePerSecond?: number
  priority?: number
  confidence?: 'A' | 'B'
}): WorldFact {
  seq += 1
  return {
    id: options.id ?? `fact-${seq}`,
    chapter: options.chapter ?? 'daily',
    title: `事实 ${seq}`,
    explanation: '测试合成事实',
    value: options.ratePerSecond ?? 1,
    period: { unit: 'custom-seconds', seconds: 1 },
    outputUnit: '个',
    region: '测试',
    decimals: 0,
    snapshotPriority: options.priority ?? 50,
    chineseContext: false,
    source: {
      title: '测试来源',
      publisher: '测试机构',
      url: 'https://example.com',
      publishedAt: '2026-01-01',
      reviewedAt: '2026-08-08',
      confidence: options.confidence ?? 'A',
    },
  }
}

describe('selectSnapshotFacts', () => {
  it('默认三条来自三个不同章节，即使重复章节的事实优先级更高', () => {
    const dailyTop = makeFact({ id: 'a-daily-top', chapter: 'daily', priority: 95 })
    const dailySecond = makeFact({ id: 'b-daily-second', chapter: 'daily', priority: 90 })
    const human = makeFact({ id: 'c-human', chapter: 'human', priority: 60 })
    const planet = makeFact({ id: 'd-planet', chapter: 'planet', priority: 40 })

    const [first, second, third] = selectSnapshotFacts([dailySecond, human, dailyTop, planet], 5_000)
    expect([first.id, second.id, third.id]).toEqual(['a-daily-top', 'c-human', 'd-planet'])
  })

  it('章节不足三个时才允许重复章节补足', () => {
    const dailyHigh = makeFact({ id: 'a-daily', chapter: 'daily', priority: 90 })
    const humanOne = makeFact({ id: 'b-human', chapter: 'human', priority: 80 })
    const dailyLow = makeFact({ id: 'c-daily', chapter: 'daily', priority: 70 })

    const picked = selectSnapshotFacts([dailyHigh, humanOne, dailyLow], 5_000)
    expect(picked.map((fact) => fact.id)).toEqual(['a-daily', 'b-human', 'c-daily'])
  })

  it('优先选择已经 count 的事实，waiting 事实排后', () => {
    // waiting 事实优先级更高，但在 1 秒时还没攒满 1 个
    const waiting = makeFact({ id: 'a-waiting', chapter: 'daily', ratePerSecond: 0.01, priority: 99 })
    const counting = makeFact({ id: 'b-count', chapter: 'human', ratePerSecond: 5, priority: 30 })
    const alsoCounting = makeFact({ id: 'c-count', chapter: 'planet', ratePerSecond: 2, priority: 20 })

    const picked = selectSnapshotFacts([waiting, counting, alsoCounting], 1_000)
    expect(picked.map((fact) => fact.id)).toEqual(['b-count', 'c-count', 'a-waiting'])
  })

  it('只选 A 级事实，B 级即使优先级最高也不进快照', () => {
    const gradeB = makeFact({ id: 'a-b', chapter: 'daily', priority: 100, confidence: 'B' })
    const one = makeFact({ id: 'b-a1', chapter: 'daily', priority: 50 })
    const two = makeFact({ id: 'c-a2', chapter: 'human', priority: 40 })
    const three = makeFact({ id: 'd-a3', chapter: 'planet', priority: 30 })

    const picked = selectSnapshotFacts([gradeB, one, two, three], 5_000)
    expect(picked.some((fact) => fact.id === 'a-b')).toBe(false)
  })

  it('优先级相同时按 id 升序决胜', () => {
    const later = makeFact({ id: 'zzz-later', chapter: 'daily', priority: 70 })
    const earlier = makeFact({ id: 'aaa-earlier', chapter: 'daily', priority: 70 })
    const human = makeFact({ id: 'mmm-human', chapter: 'human', priority: 60 })
    const planet = makeFact({ id: 'nnn-planet', chapter: 'planet', priority: 50 })

    const [first] = selectSnapshotFacts([later, earlier, human, planet], 5_000)
    expect(first.id).toBe('aaa-earlier')
  })

  it('A 级事实不足三条时直接抛错，不产出残缺快照', () => {
    const one = makeFact({ chapter: 'daily' })
    const two = makeFact({ chapter: 'human' })
    expect(() => selectSnapshotFacts([one, two], 5_000)).toThrow(/不足三条/)
  })

  it('对真实台账在 5 秒时选出快递、公转、出生三条 A 级不同章节事实', () => {
    const picked = selectSnapshotFacts(FACTS, 5_000)
    expect(picked.map((fact) => fact.id)).toEqual([
      'osw-cn-express',
      'osw-planet-orbit',
      'osw-world-births',
    ])
    for (const fact of picked) {
      expect(fact.source.confidence).toBe('A')
    }
    expect(new Set(picked.map((fact) => fact.chapter)).size).toBe(3)
  })
})

describe('replaceSnapshotFact', () => {
  it('替换指定槽位的事实', () => {
    const one = makeFact({ id: 'a', chapter: 'daily' })
    const two = makeFact({ id: 'b', chapter: 'human' })
    const three = makeFact({ id: 'c', chapter: 'planet' })
    const replacement = makeFact({ id: 'd', chapter: 'human' })

    const next = replaceSnapshotFact([one, two, three], 1, replacement)
    expect(next.map((fact) => fact.id)).toEqual(['a', 'd', 'c'])
  })

  it('拒绝重复 id 的替换', () => {
    const one = makeFact({ id: 'a', chapter: 'daily' })
    const two = makeFact({ id: 'b', chapter: 'human' })
    const three = makeFact({ id: 'c', chapter: 'planet' })

    expect(() => replaceSnapshotFact([one, two, three], 2, two)).toThrow(/已经包含/)
  })

  it('拒绝替换后章节覆盖少于两个的方案', () => {
    const one = makeFact({ id: 'a', chapter: 'daily' })
    const two = makeFact({ id: 'b', chapter: 'daily' })
    const three = makeFact({ id: 'c', chapter: 'planet' })
    const dailyReplacement = makeFact({ id: 'd', chapter: 'daily' })

    expect(() => replaceSnapshotFact([one, two, three], 2, dailyReplacement)).toThrow(/两个不同章节/)
  })

  it('拒绝越界槽位', () => {
    const one = makeFact({ id: 'a', chapter: 'daily' })
    const two = makeFact({ id: 'b', chapter: 'human' })
    const replacement = makeFact({ id: 'd', chapter: 'planet' })

    expect(() => replaceSnapshotFact([one, two], 2, replacement)).toThrow(RangeError)
    expect(() => replaceSnapshotFact([one, two], -1, replacement)).toThrow(RangeError)
  })
})
