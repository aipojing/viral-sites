import { describe, expect, it, vi } from 'vitest'
import type { TimeLedgerCardData } from './draw-time-ledger-card'
import { makeTimeLedgerCardDraw } from './draw-time-ledger-card'

const DATA: TimeLedgerCardData = {
  freeYears: 20.5,
  weekly: { sleep: 52.5, work: 40, commute: 7.5, necessary: 14, free: 54 },
  remainingYears: { sleep: 14.97, work: 7.14, commute: 1.34, necessary: 3.99, free: 20.46 },
  screenYears: 11.98,
}

function fakeCtx() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

const textsOf = (ctx: CanvasRenderingContext2D) =>
  (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))

describe('makeTimeLedgerCardDraw', () => {
  it('包含自由时间大数字、五类账本与年数', () => {
    const ctx = fakeCtx()
    makeTimeLedgerCardDraw(DATA)(ctx, { width: 1080, height: 1440 })
    const texts = textsOf(ctx)
    expect(texts.some((t) => t.includes('20.5'))).toBe(true)
    for (const label of ['睡眠', '工作', '通勤', '家务与必要事务', '自由时间']) {
      expect(texts.some((t) => t.includes(label)), `应绘制 ${label}`).toBe(true)
    }
    expect(texts.some((t) => t.includes('7.1'))).toBe(true)
  })

  it('填了屏幕时间时绘制旁账说明，未填时不绘制', () => {
    const withScreen = fakeCtx()
    makeTimeLedgerCardDraw(DATA)(withScreen, { width: 1080, height: 1440 })
    expect(textsOf(withScreen).some((t) => t.includes('屏幕时间相当于余生约 12 年'))).toBe(true)

    const without = fakeCtx()
    makeTimeLedgerCardDraw({ ...DATA, screenYears: null })(without, { width: 1080, height: 1440 })
    expect(textsOf(without).some((t) => t.includes('屏幕时间相当于'))).toBe(false)
  })

  it('带口径说明与品牌条，防止脱离语境被当成精确预测', () => {
    const ctx = fakeCtx()
    makeTimeLedgerCardDraw(DATA)(ctx, { width: 1080, height: 1440 })
    const texts = textsOf(ctx)
    expect(texts.some((t) => t.includes('按当前习惯估算'))).toBe(true)
    expect(texts.some((t) => t.includes('人生进度条'))).toBe(true)
  })

  it('所有文字与色块都落在 1080×1440 画布内', () => {
    const ctx = fakeCtx()
    makeTimeLedgerCardDraw(DATA)(ctx, { width: 1080, height: 1440 })
    for (const call of (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls) {
      const [, x, y] = call as [string, number, number]
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1080)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(1440)
    }
    for (const call of (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls) {
      const [x, y, w, h] = call as [number, number, number, number]
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x + w).toBeLessThanOrEqual(1080)
      expect(y + h).toBeLessThanOrEqual(1440)
    }
  })
})
