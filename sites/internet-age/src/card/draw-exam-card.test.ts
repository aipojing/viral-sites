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
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
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

  it('结果区只保留网龄数字和称号，不显示冗余考试说明', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('互联网网感统一测试卷')
    expect(texts).toContain('34')
    expect(texts).toContain('QQ空间贵族')
    expect(texts).toContain('网感年龄测试 · viral-sites')
    expect(texts.some((text) => text.includes('满分 100'))).toBe(false)
    expect(texts.some((text) => text.includes('本卷判定'))).toBe(false)
    expect(texts.some((text) => text.includes('岁'))).toBe(false)
  })

  it('五维成分条：每维画称号 + 百分比，轨道和有效占比使用圆角条', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    for (const share of result.composition) {
      expect(texts).toContain(share.title)
      expect(texts).toContain(`${share.percent}%`)
    }
    // 5 条轨道 + 当前结果里的非零占比；页面里的 0% 同样不显示彩色部分。
    const visibleFillCount = result.composition.filter((share) => share.percent > 0).length
    expect((ctx.beginPath as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(5 + visibleFillCount)
    expect((ctx.quadraticCurveTo as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
    // 大背景、白色试卷、底部品牌条仍使用普通矩形。
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3)
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
