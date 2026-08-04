import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { LEVELS } from '../content/pools'
import { drawFortune } from '../lib/fortune-math'
import { makeFortuneCardDraw } from './draw-fortune-card'

const SIZE = { width: 1080, height: 1440 }
const FORTUNE = drawFortune('阿福', new Date(Date.UTC(2026, 7, 4, 4, 0)))

function drawnTexts(streak: number): string[] {
  const ctx = makeRecordingCtx()
  makeFortuneCardDraw(FORTUNE, streak)(ctx as never, SIZE)
  return ctx.fillText.mock.calls.map((c) => String(c[0]))
}

describe('makeFortuneCardDraw', () => {
  it('绘制核心要素：等级/昵称/日期/宜忌标签/贵人小人/品牌条', () => {
    const texts = drawnTexts(1)
    expect(texts).toContain(FORTUNE.level)
    expect(texts.some((t) => t.includes('阿福'))).toBe(true)
    expect(texts.some((t) => t.includes('2026-08-04'))).toBe(true)
    expect(texts).toContain('宜')
    expect(texts).toContain('忌')
    expect(texts.some((t) => t.includes(FORTUNE.guiren.text))).toBe(true)
    expect(texts.some((t) => t.includes(FORTUNE.xiaoren.text))).toBe(true)
    expect(texts.some((t) => t.includes('赛博求签'))).toBe(true)
  })

  it('签诗逐字竖绘：两行的每个字都被单独绘制', () => {
    const texts = drawnTexts(1)
    for (const line of FORTUNE.poem.lines) {
      for (const ch of Array.from(line)) {
        expect(texts).toContain(ch)
      }
    }
  })

  it('streak 文案上卡；≥7 天加「虔诚」印章，<7 不加', () => {
    expect(drawnTexts(3).some((t) => t.includes('连续求签第 3 天'))).toBe(true)
    expect(drawnTexts(3)).not.toContain('虔诚')
    expect(drawnTexts(7)).toContain('虔诚')
  })

  it('常驻小印「签」在卡上（黄历印章美学）', () => {
    expect(drawnTexts(1)).toContain('签')
  })

  it('合规：卡片上不出现免责声明（免责只在页脚一处）', () => {
    expect(drawnTexts(1).join('')).not.toContain('不构成任何预测')
  })

  it('等级五色互异（多人晒签一眼可比）', () => {
    expect(new Set(LEVELS.map((l) => l.accent)).size).toBe(5)
  })
})
