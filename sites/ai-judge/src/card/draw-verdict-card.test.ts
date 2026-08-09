import { describe, expect, it, vi } from 'vitest'
import type { Verdict } from '../lib/verdict'
import { makeVerdictCardDraw } from './draw-verdict-card'

const SHORT_VERDICT: Verdict = {
  crime: '拖延罪',
  verdict:
    '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零，收藏的教程从未打开第二次。本官念其态度尚可。',
  sentence: '判处早睡三个月，缓期执行',
  seal: '赛博衙门 · 即日生效',
}

/** 全部字段取 schema 上限的最坏情况 */
const MAX_VERDICT: Verdict = {
  crime: '一二三四五六七八',
  verdict: '字'.repeat(90),
  sentence: '一二三四五六七八九十一二三四五六七八九十再加',
  seal: '一二三四五六七八九十一二三四五六',
}

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
    globalAlpha: 1,
    lineWidth: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

function textsOf(ctx: CanvasRenderingContext2D): string[] {
  return ((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls as unknown[][]).map((call) => String(call[0]))
}

describe('makeVerdictCardDraw', () => {
  it('绘制抬头、罪名、刑期、印章与品牌条', () => {
    const ctx = fakeCtx()
    makeVerdictCardDraw(SHORT_VERDICT)(ctx, { width: 1080, height: 1440 })
    const texts = textsOf(ctx)
    expect(texts).toContain('赛博衙门 · 判')
    expect(texts).toContain('拖延罪')
    expect(texts.some((text) => text.includes('判处早睡三个月'))).toBe(true)
    expect(texts).toContain('AI 赛博判官 · 怪好玩')
    // 印章逐字竖排，去掉空格后仍完整覆盖原文
    expect(texts.join('').split(' ').join('')).toContain('赛博衙门·即日生效')
  })

  it('判词正文换行后仍完整覆盖原文', () => {
    const ctx = fakeCtx()
    makeVerdictCardDraw(SHORT_VERDICT)(ctx, { width: 1080, height: 1440 })
    expect(textsOf(ctx).join('')).toContain(SHORT_VERDICT.verdict)
  })

  it('卡片不含昵称与简介，避免截图泄露输入', () => {
    const ctx = fakeCtx()
    makeVerdictCardDraw(SHORT_VERDICT)(ctx, { width: 1080, height: 1440 })
    expect(textsOf(ctx).join('')).not.toContain('阿福')
  })

  it('最长内容不越界：所有文字 x 在版面内', () => {
    const ctx = fakeCtx()
    makeVerdictCardDraw(MAX_VERDICT)(ctx, { width: 1080, height: 1440 })
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls as unknown[][]
    for (const call of calls) {
      const [text, x, y] = call as [string, number, number]
      // 印章文字以印章中心为原点绘制，豁免整体坐标检查
      if (Array.from(text).length === 1 && /[\u4e00-\u9fa5·]/.test(text)) continue
      expect(x, `「${text}」越界`).toBeGreaterThanOrEqual(0)
      expect(x, `「${text}」越界`).toBeLessThanOrEqual(1080)
      expect(y, `「${text}」越界`).toBeGreaterThanOrEqual(0)
      expect(y, `「${text}」越界`).toBeLessThanOrEqual(1440)
    }
  })

  it('印章带旋转，扫描线用低透明度绘制', () => {
    const ctx = fakeCtx()
    const alphas: number[] = []
    Object.defineProperty(ctx, 'globalAlpha', {
      get: () => alphas[alphas.length - 1] ?? 1,
      set: (value: number) => alphas.push(value),
    })
    makeVerdictCardDraw(SHORT_VERDICT)(ctx, { width: 1080, height: 1440 })
    expect(ctx.rotate).toHaveBeenCalled()
    expect(alphas).toContain(0.05)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })
})
