import { computeTagsResult } from '@viral/shared'
import { describe, expect, it, vi } from 'vitest'
import { wangGanConfig } from '../config/wang-gan'
import { makeExamCardDraw } from './draw-exam-card'

const result = computeTagsResult(wangGanConfig, [0, 0, 0, 0, 0, 0, 0, 0])

function fakeCtx() {
  return {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '' as unknown,
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

describe('makeExamCardDraw', () => {
  it('彩虹底：createLinearGradient 恰好一次', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    expect((ctx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
  })

  it('文字包含抬头/网龄/判定/品牌条', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('互联网网感统一测试卷')
    expect(texts).toContain('34')
    expect(texts).toContain('岁 · 本卷判定：QQ空间贵族')
    expect(texts).toContain('网感年龄测试 · viral-sites')
  })

  it('五维成分条：每维画称号 + 百分比，轨道与占比条各 5 个 fillRect', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    for (const share of result.composition) {
      expect(texts).toContain(share.title)
      expect(texts).toContain(`${share.percent}%`)
    }
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(13)
  })

  it('锐评换行后仍完整覆盖原文', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    const joined = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join('')
    expect(joined).toContain(result.comment)
  })
})
