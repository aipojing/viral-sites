import { renderCard } from '@viral/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub, type RecordingCtx } from '../../test/canvas-stub'
import type { WorldChapter, WorldFact } from '../data/fact-types'
import { formatFactValue } from '../lib/format-value'
import type { SnapshotItem } from '../lib/snapshot'
import { makeWorldSnapshotCardDraw, type WorldSnapshotCardData } from './draw-snapshot-card'

function makeFact(options: {
  id: string
  chapter: WorldChapter
  title: string
  ratePerSecond?: number
  sourceTitle?: string
}): WorldFact {
  return {
    id: options.id,
    chapter: options.chapter,
    title: options.title,
    explanation: '测试合成事实',
    value: options.ratePerSecond ?? 1,
    period: { unit: 'custom-seconds', seconds: 1 },
    outputUnit: '个',
    region: '测试',
    decimals: 0,
    snapshotPriority: 50,
    chineseContext: false,
    source: {
      title: options.sourceTitle ?? 'Test Source Title',
      publisher: '测试机构',
      url: 'https://example.com/very-long-source-url',
      publishedAt: '2026-01-01',
      reviewedAt: '2026-08-08',
      confidence: 'A',
    },
  }
}

function makeItem(fact: WorldFact, elapsedMs: number): SnapshotItem {
  return { fact, display: formatFactValue(fact, elapsedMs) }
}

const ELAPSED = 47_000
const express = makeFact({ id: 'a', chapter: 'daily', title: '中国寄出的快递', ratePerSecond: 6308 })
const orbit = makeFact({ id: 'b', chapter: 'planet', title: '地球带你绕太阳飞行', ratePerSecond: 30 })
const births = makeFact({ id: 'c', chapter: 'human', title: '来到世界的婴儿', ratePerSecond: 4 })

function makeData(items?: WorldSnapshotCardData['items']): WorldSnapshotCardData {
  return {
    elapsedMs: ELAPSED,
    localTimeLabel: '2026-08-09 17:40',
    items: items ?? [makeItem(express, ELAPSED), makeItem(orbit, ELAPSED), makeItem(births, ELAPSED)],
  }
}

let ctx: RecordingCtx

function drawCard(data: WorldSnapshotCardData): void {
  ctx = installCanvasStub()
  renderCard(makeWorldSnapshotCardDraw(data))
}

function drawnTexts(): string[] {
  return ctx.fillText.mock.calls.map((call) => String(call[0]))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('makeWorldSnapshotCardDraw', () => {
  it('卡片包含“约”、单位、三条事实、会话时长、本地时刻、品牌条和回站提示', () => {
    drawCard(makeData())
    const texts = drawnTexts()
    expect(texts).toContain('我在这里的 47 秒')
    expect(texts).toContain('世界发生了什么')
    expect(texts).toContain('中国寄出的快递')
    expect(texts).toContain('地球带你绕太阳飞行')
    expect(texts).toContain('来到世界的婴儿')
    // 数值带“约”与单位
    expect(texts.some((text) => /^约 [\d,]+万 个$/.test(text))).toBe(true)
    expect(texts.some((text) => text.includes('2026-08-09 17:40') && text.includes('有效停留 47 秒'))).toBe(true)
    expect(texts).toContain('一秒钟世界 · 怪好玩')
    expect(texts.some((text) => text.includes('查看数据来源'))).toBe(true)
  })

  it('先铺满深空底色，再画整卡网格', () => {
    drawCard(makeData())
    expect(ctx.fillRect.mock.calls[0]).toEqual([0, 0, 1080, 1440])
  })

  it('最长的中英文来源标题与 URL 都不进卡片正文', () => {
    const longEnglish = makeFact({
      id: 'd',
      chapter: 'planet',
      title: '月球正在远离地球',
      sourceTitle:
        'International Tourist Arrivals up 4% in 2025 Reflecting Strong Travel Demand around the World',
    })
    drawCard(makeData([makeItem(express, ELAPSED), makeItem(orbit, ELAPSED), makeItem(longEnglish, ELAPSED)]))
    const joined = drawnTexts().join('\n')
    expect(joined).not.toContain('International Tourist Arrivals')
    expect(joined).not.toContain('https://')
    expect(joined).not.toContain('example.com')
  })

  it('累计值小于 1 的事实不允许进入默认卡片', () => {
    const waiting = makeFact({ id: 'e', chapter: 'planet', title: '月球远离', ratePerSecond: 1e-9 })
    expect(() =>
      makeWorldSnapshotCardDraw(makeData([makeItem(express, ELAPSED), makeItem(orbit, ELAPSED), makeItem(waiting, ELAPSED)])),
    ).toThrow(/小于 1/)
  })
})
