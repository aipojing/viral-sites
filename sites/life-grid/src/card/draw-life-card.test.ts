import { describe, expect, it, vi } from 'vitest'
import type { LifeStats } from '../lib/life-math'
import { makeLifeCardDraw } from './draw-life-card'

const stats: LifeStats = {
  age: 30,
  weeksLived: 1565,
  totalWeeks: 4056,
  percent: 38.6,
  blankWeeks: 2491,
  bonusWeeks: 0,
  meetingsPerYear: 2,
  parentMeetings: 40,
  springFestivals: 48,
  workdays: 7500,
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

describe('makeLifeCardDraw', () => {
  it('绘制背景 + 全部格子（fillRect ≥ totalWeeks + 1）', () => {
    const ctx = fakeCtx()
    makeLifeCardDraw(stats)(ctx, { width: 1080, height: 1440 })
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(4056)
  })

  it('文字包含主文案与品牌条', () => {
    const ctx = fakeCtx()
    makeLifeCardDraw(stats)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])
    expect(texts.some((t: string) => t.includes('还能见父母'))).toBe(true)
    expect(texts.some((t: string) => t.includes('人生进度条'))).toBe(true)
    expect(texts.some((t: string) => t.includes('38.6%'))).toBe(true)
  })
})
