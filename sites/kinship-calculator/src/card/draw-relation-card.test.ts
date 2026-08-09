import { renderCard } from '@viral/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub, type RecordingCtx } from '../../test/canvas-stub'
import { makeRelationCardDraw, type RelationCardData } from './draw-relation-card'

function makeData(overrides: Partial<RelationCardData> = {}): RelationCardData {
  return {
    label: '舅舅',
    pathLabels: ['妈妈', '哥哥'],
    confidence: 'exact',
    ...overrides,
  }
}

let ctx: RecordingCtx

function drawCard(data: RelationCardData): void {
  ctx = installCanvasStub()
  renderCard(makeRelationCardDraw(data))
}

function drawnTexts(): string[] {
  return ctx.fillText.mock.calls.map((call) => String(call[0]))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('makeRelationCardDraw', () => {
  it('卡片包含中心称呼大字、族谱路径节点、置信提示与品牌条', () => {
    drawCard(makeData())
    const texts = drawnTexts()

    expect(texts).toContain('舅舅')
    expect(texts).toContain('我')
    expect(texts).toContain('妈妈')
    expect(texts).toContain('哥哥')
    expect(texts).toContain('建议叫')
    expect(texts.some((text) => text.startsWith('置信：明确'))).toBe(true)
    expect(texts).toContain('亲戚称呼计算器 · 怪好玩')
  })

  it('先铺纸底再画红框，卡片是 1080×1440', () => {
    drawCard(makeData())
    expect(ctx.fillRect.mock.calls[0]).toEqual([0, 0, 1080, 1440])
    expect(ctx.fillRect.mock.calls[1]?.[2]).toBe(1080 - 80)
  })

  it('长链自动换行：8 级路径的节点分布在多行，短链只有一行', () => {
    const nodeYs = (data: RelationCardData) => {
      drawCard(data)
      return ctx.fillText.mock.calls
        .filter((call) => String(call[0]) === '爸爸')
        .map((call) => Number(call[2]))
    }

    const shortYs = nodeYs(makeData({ pathLabels: ['爸爸'] }))
    expect(new Set(shortYs).size).toBe(1)

    const longYs = nodeYs(makeData({ pathLabels: Array.from({ length: 8 }, () => '爸爸') }))
    expect(longYs).toHaveLength(8)
    expect(new Set(longYs).size).toBeGreaterThan(1)
  })

  it('地域称呼只放用户选中的那一个', () => {
    drawCard(makeData({ label: '外婆', pathLabels: ['妈妈', '妈妈'], regionalLabel: '姥姥', confidence: 'regional' }))
    const texts = drawnTexts()

    expect(texts.some((text) => text === '我们这儿也叫：姥姥')).toBe(true)
    expect(texts).toContain('建议叫（普通话）')
    expect(texts.some((text) => text.startsWith('置信：有地域差异'))).toBe(true)
  })

  it('不出现任何姓名字段：卡片数据接口本身没有姓名入口', () => {
    drawCard(makeData())
    const joined = drawnTexts().join('\n')
    expect(joined).not.toContain('姓名')
    expect(joined).not.toContain('名字')
    const keys: readonly (keyof RelationCardData)[] = ['label', 'pathLabels', 'regionalLabel', 'confidence']
    expect(keys).not.toContain('name' as never)
  })

  it('未解析的结果不生成误导卡片：空称呼或空链路直接抛错', () => {
    expect(() => makeRelationCardDraw(makeData({ label: '   ' }))).toThrow(/未解析/)
    expect(() => makeRelationCardDraw(makeData({ pathLabels: [] }))).toThrow(/关系链为空/)
  })
})
