import { describe, expect, it, vi } from 'vitest'
import { makeQuoteCardDraw, wrapByLength, type QuoteCardData } from './draw-quote-card'

const SIZE = { width: 1080, height: 1440 }

const base: QuoteCardData = {
  text: '不借。我的钱也是一分一分挣的。',
  sceneId: 'jieqian',
  sceneLabel: '被借钱',
  sceneColor: '#0d9488',
  toneId: 'yinggang',
  toneLabel: '直球硬刚',
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

describe('wrapByLength', () => {
  it('按定宽折行', () => {
    expect(wrapByLength('一二三四五六', 4)).toEqual(['一二三四', '五六'])
  })
  it('不足一行原样一行', () => expect(wrapByLength('短', 10)).toEqual(['短']))
  it('空串返回一个空行', () => expect(wrapByLength('', 10)).toEqual(['']))
  it('按 code point 切，emoji 不劈半', () => {
    expect(wrapByLength('😀😀😀', 2)).toEqual(['😀😀', '😀'])
  })
})

describe('makeQuoteCardDraw · Bento 标准皮（weiwan/yinggang/heihua）', () => {
  it('画正文、标题、场景语气标签与品牌条', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(base)(ctx, SIZE)
    const texts = textsOf(ctx)
    expect(texts.some((t) => t.includes('不借'))).toBe(true)
    expect(texts.some((t) => t.includes('今日拒绝语录'))).toBe(true)
    expect(texts.some((t) => t.includes('被借钱'))).toBe(true)
    expect(texts.some((t) => t.includes('拒绝话术生成器'))).toBe(true)
  })
  it('标准皮只画背景、正文卡和场景色条，不画九格调色板', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(base)(ctx, SIZE)
    const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBeLessThan(10)
  })
  it('短正文也垂直落在卡片视觉中心区域', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw({ ...base, text: '不借。' })(ctx, SIZE)
    const bodyCall = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
      .find(([text]) => text === '不借。')
    expect(bodyCall?.[2]).toBeGreaterThanOrEqual(620)
    expect(bodyCall?.[2]).toBeLessThanOrEqual(900)
  })
})

describe('makeQuoteCardDraw · 仿古竖排皮（wenyan）', () => {
  const data: QuoteCardData = {
    ...base,
    toneId: 'wenyan',
    toneLabel: '文言文',
    text: '非吾吝也，实囊中羞涩，爱莫能助。',
  }
  it('竖排：每个字单独 fillText，且落「拒」字印章', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(data)(ctx, SIZE)
    const texts = textsOf(ctx)
    expect(texts).toContain('非')
    expect(texts).toContain('助')
    expect(texts).toContain('拒')
    expect(texts.filter((t) => t.length === 1).length).toBeGreaterThanOrEqual(
      [...data.text].length,
    )
  })
})

describe('makeQuoteCardDraw · 发疯 meme 皮（fafeng）', () => {
  const data: QuoteCardData = {
    ...base,
    toneId: 'fafeng',
    toneLabel: '发疯文学',
    text: '实在抱歉，我的钱在我这儿也是好好的。',
  }
  it('正文双重描绘（洋红错位 + 墨黑主体）', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(data)(ctx, SIZE)
    const line = textsOf(ctx).filter((t) => t.includes('实在抱歉'))
    expect(line.length).toBeGreaterThanOrEqual(2)
  })
  it('带「今日拒绝语录!!!」贴条', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(data)(ctx, SIZE)
    expect(textsOf(ctx).some((t) => t.includes('今日拒绝语录!!!'))).toBe(true)
  })
})
