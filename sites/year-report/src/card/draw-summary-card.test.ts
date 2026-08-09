import { CARD_SIZE, renderCard } from '@viral/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub, type RecordingCtx } from '../../test/canvas-stub'
import { makeSummaryCardDraw } from './draw-summary-card'
import { DEFAULT_PUBLIC_FIELDS, selectPublicAnswers } from '../lib/public-fields'
import type { ReportAnswers } from '../lib/report-types'

const FULL: ReportAnswers = {
  keyword: '重启',
  place: '县城的老家',
  song: '同一首歌',
  'comfort-food': '楼下的牛肉面',
  'important-person': '老同学 K',
  'small-win': '学会了游一百米',
  'hard-moment': '三月那通电话',
  'feeling-scale': 4,
  'goal-and-release': { completion: 60, release: '没考完的证' },
  'next-year-message': '先睡够，再谈别的',
}

function drawnText(ctx: RecordingCtx): string {
  return ctx.fillText.mock.calls.map((call) => String(call[0])).join('\n')
}

function draw(answers: ReportAnswers, year = 2026): RecordingCtx {
  const ctx = installCanvasStub()
  renderCard(makeSummaryCardDraw({ year, answers }))
  return ctx
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('makeSummaryCardDraw', () => {
  it('默认四字段：只画关键词、小胜利、感受与明年留言', () => {
    const ctx = draw(selectPublicAnswers(FULL, DEFAULT_PUBLIC_FIELDS))
    const text = drawnText(ctx)
    expect(text).toContain('2026')
    expect(text).toContain('重启')
    expect(text).toContain('学会了游一百米')
    expect(text).toContain('先睡够，再谈别的')
    expect(text).toContain('偏轻松')
  })

  it('敏感字段没被勾选时一个字都不出现在卡上', () => {
    const text = drawnText(draw(selectPublicAnswers(FULL, DEFAULT_PUBLIC_FIELDS)))
    expect(text).not.toContain('县城的老家')
    expect(text).not.toContain('老同学 K')
    expect(text).not.toContain('三月那通电话')
  })

  it('勾选敏感字段后才会画出来', () => {
    const text = drawnText(draw(selectPublicAnswers(FULL, [...DEFAULT_PUBLIC_FIELDS, 'place'])))
    expect(text).toContain('县城的老家')
  })

  it('年度感受注明是凭感觉选的一档，不伪装统计', () => {
    const text = drawnText(draw({ 'feeling-scale': 3 }))
    expect(text).toContain('一半一半')
    expect(text).toMatch(/不是统计/)
  })

  it('关键词是层级最大的字，年份标签更小', () => {
    const ctx = installCanvasStub()
    const fonts: string[] = []
    ctx.fillText.mockImplementation(() => {
      fonts.push(ctx.font)
    })
    renderCard(makeSummaryCardDraw({ year: 2026, answers: { keyword: '重启', 'small-win': '游一百米' } }))
    const sizeOf = (font: string) => Number(/(\d+)px/.exec(font)?.[1] ?? 0)
    const keywordFont = fonts[1]!
    expect(sizeOf(keywordFont)).toBeGreaterThan(sizeOf(fonts[0]!))
    expect(sizeOf(keywordFont)).toBeGreaterThanOrEqual(120)
  })

  it('三种答案长度都不越界', () => {
    const cases: ReportAnswers[] = [
      { keyword: '熬' },
      selectPublicAnswers(FULL, DEFAULT_PUBLIC_FIELDS),
      {
        keyword: '八个字的关键词',
        place: '二'.repeat(24),
        song: '三'.repeat(24),
        'comfort-food': '四'.repeat(24),
        'important-person': '五'.repeat(24),
        'small-win': '六'.repeat(50),
        'hard-moment': '七'.repeat(50),
        'feeling-scale': 5,
        'goal-and-release': { completion: 100, release: '八'.repeat(50) },
        'next-year-message': '九'.repeat(30),
      },
    ]

    for (const answers of cases) {
      const ctx = draw(answers)
      for (const call of ctx.fillText.mock.calls) {
        const x = Number(call[1])
        const y = Number(call[2])
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThan(CARD_SIZE.width)
        expect(y).toBeGreaterThan(0)
        expect(y).toBeLessThanOrEqual(CARD_SIZE.height)
      }
      expect(drawnText(ctx)).toContain('年度报告 · 怪好玩')
    }
  })

  it('一个字段都没勾时仍是一张诚实的卡：只有年份和署名', () => {
    const text = drawnText(draw({}))
    expect(text).toContain('2026')
    expect(text).not.toContain('undefined')
    expect(text).not.toContain('NaN')
    expect(text).toContain('年度报告 · 怪好玩')
  })

  it('最长留言会换行，不会溢出卡片右侧', () => {
    const ctx = draw({ 'next-year-message': '十'.repeat(30) })
    const messageLines = ctx.fillText.mock.calls.filter((call) => String(call[0]).startsWith('十'))
    expect(messageLines.length).toBeGreaterThan(1)
    for (const call of messageLines) {
      expect(String(call[0]).length).toBeLessThanOrEqual(13)
    }
  })
})
