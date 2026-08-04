import { computeResult } from '@viral/shared'
import { describe, expect, it, vi } from 'vitest'
import { banWeiConfig } from '../config/ban-wei'
import { makeReportCardDraw } from './draw-report-card'

const result = computeResult(banWeiConfig, [3, 3, 3, 3, 3, 3, 3, 3])

function fakeCtx() {
  return {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

describe('makeReportCardDraw', () => {
  it('文字包含抬头/大数字/称号/品牌条', () => {
    const ctx = fakeCtx()
    makeReportCardDraw(banWeiConfig, result)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('精神状态检测报告')
    expect(texts).toContain('100%')
    expect(texts).toContain('班味十级学者')
    expect(texts).toContain('班味浓度检测 · viral-sites')
  })

  it('锐评与解药逐行绘制（换行后仍完整覆盖原文）', () => {
    const ctx = fakeCtx()
    makeReportCardDraw(banWeiConfig, result)(ctx, { width: 1080, height: 1440 })
    const joined = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join('')
    for (const comment of result.tier.comments) {
      expect(joined).toContain(comment)
    }
    expect(joined).toContain(result.tier.remedy)
  })

  it('公章 + 骑缝章：arc 恰好两次且带旋转', () => {
    const ctx = fakeCtx()
    makeReportCardDraw(banWeiConfig, result)(ctx, { width: 1080, height: 1440 })
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2)
    expect(ctx.rotate).toHaveBeenCalled()
  })
})
