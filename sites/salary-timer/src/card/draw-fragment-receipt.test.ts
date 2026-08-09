import { renderCard } from '@viral/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub, type RecordingCtx } from '../../test/canvas-stub'
import { makeFragmentReceiptDraw } from './draw-fragment-receipt'

describe('makeFragmentReceiptDraw', () => {
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

  it('绘制场景名、时长、等值、锐评与品牌条', () => {
    renderCard(
      makeFragmentReceiptDraw({
        sceneLabel: '开会',
        durationMs: 1_800_000,
        equivalent: 43.27,
        includeDate: true,
        dateLabel: '2026-08-10',
        quip: '会议内容会忘，等值已经记下。',
      }),
    )
    const texts = drawnTexts()
    expect(texts).toContain('开会')
    expect(texts).toContain('2026-08-10')
    expect(texts).toContain('30 分 0 秒')
    expect(texts).toContain('¥43.27')
    expect(texts).toContain('会议内容会忘，等值已经记下。')
    expect(texts).toContain('上班回本计算器 · 怪好玩')
    expect(texts).toContain('小票不含月薪与时薪 · 时间等值不是工资单')
  })

  it('includeDate 为 false 时不绘制日期', () => {
    renderCard(
      makeFragmentReceiptDraw({
        sceneLabel: '发呆',
        durationMs: 60_000,
        equivalent: 1.44,
        includeDate: false,
        dateLabel: '2026-08-10',
      }),
    )
    expect(drawnTexts()).not.toContain('2026-08-10')
  })

  it('0 等值与大数字长数字不破版', () => {
    renderCard(
      makeFragmentReceiptDraw({
        sceneLabel: '排队',
        durationMs: 0,
        equivalent: 0,
        includeDate: false,
      }),
    )
    expect(drawnTexts()).toContain('¥0.00')

    renderCard(
      makeFragmentReceiptDraw({
        sceneLabel: '排队',
        durationMs: 359_999_000,
        equivalent: 9_999_999.99,
        includeDate: false,
      }),
    )
    expect(drawnTexts()).toContain('¥9,999,999.99')
  })

  it('12 code points 的超长自定义标签完整绘制', () => {
    const label = '一二三四五六七八九十壹贰'
    renderCard(
      makeFragmentReceiptDraw({
        sceneLabel: label,
        durationMs: 600_000,
        equivalent: 14.42,
        includeDate: false,
      }),
    )
    // wrapByLength 每行 8 字，两行合计仍是完整标签
    expect(drawnTexts().join('')).toContain(label)
  })

  it('接口不含月薪时薪字段：卡面永不出现工资口径数字', () => {
    renderCard(
      makeFragmentReceiptDraw({
        sceneLabel: '开会',
        durationMs: 1_800_000,
        equivalent: 43.27,
        includeDate: true,
        dateLabel: '2026-08-10',
      }),
    )
    const all = drawnTexts().join('|')
    expect(all).not.toContain('15,000')
    expect(all).not.toContain('86.5')
  })
})
