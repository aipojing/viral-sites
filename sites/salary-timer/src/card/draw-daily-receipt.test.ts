import { renderCard } from '@viral/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub, type RecordingCtx } from '../../test/canvas-stub'
import { makeDailyReceiptDraw } from './draw-daily-receipt'
import type { SceneId } from '../lib/fragment'

function durations(overrides: Partial<Record<SceneId, number>> = {}): Record<SceneId, number> {
  return { meeting: 0, toilet: 0, idle: 0, queue: 0, custom: 0, ...overrides }
}

describe('makeDailyReceiptDraw', () => {
  let ctx: RecordingCtx

  beforeEach(() => {
    ctx = installCanvasStub()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function drawnTexts(): string[] {
    return ctx.fillText.mock.calls.map((call) => String(call[0]))
  }

  it('默认不含金额：只绘制日期与时间分布', () => {
    renderCard(
      makeDailyReceiptDraw({
        dateLabel: '2026-08-10',
        sceneDurations: durations({ meeting: 900_000, toilet: 120_000 }),
      }),
    )
    const texts = drawnTexts()
    expect(texts).toContain('2026-08-10')
    expect(texts).toContain('开会')
    expect(texts).toContain('15 分 0 秒')
    expect(texts).toContain('带薪如厕')
    expect(texts).toContain('本卡只有时间分布，不含任何金额')
    // 任何 ¥ 金额都不允许出现
    expect(texts.some((text) => text.includes('¥'))).toBe(false)
  })

  it('零时长场景不绘制', () => {
    renderCard(
      makeDailyReceiptDraw({
        dateLabel: '2026-08-10',
        sceneDurations: durations({ meeting: 600_000 }),
      }),
    )
    const texts = drawnTexts()
    expect(texts).toContain('开会')
    expect(texts).not.toContain('带薪如厕')
    expect(texts).not.toContain('发呆')
    expect(texts).not.toContain('排队')
  })

  it('显式传入 totalEquivalent 时才绘制总等值', () => {
    renderCard(
      makeDailyReceiptDraw({
        dateLabel: '2026-08-10',
        sceneDurations: durations({ meeting: 600_000 }),
        totalEquivalent: 692.31,
      }),
    )
    const texts = drawnTexts()
    expect(texts).toContain('今日总等值')
    expect(texts).toContain('¥692.31')
    expect(texts).toContain('总等值为时间换算，不是工资单')
  })

  it('自定义场景使用用户标签', () => {
    renderCard(
      makeDailyReceiptDraw({
        dateLabel: '2026-08-10',
        sceneDurations: durations({ custom: 300_000 }),
        customLabel: '等外卖',
      }),
    )
    expect(drawnTexts()).toContain('等外卖')
  })
})
