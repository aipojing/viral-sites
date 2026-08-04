import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { PALETTE } from '../lib/palette'
import { buildComparison, pickHighlightRow, tierFor } from '../lib/scoring'
import { makeCompareCardDraw, type CompareCardData } from './draw-compare-card'

const SIZE = { width: 1080, height: 1440 }
const A = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
const B = [1, 1, 2, 3, 0, 1, 2, 3, 0, 2] // 8 题一致 → 80 分

function makeData(): CompareCardData {
  const rows = buildComparison('friend', A, B)
  return {
    quiz: 'friend',
    initiatorName: '阿福',
    challengerName: '小明',
    score: 80,
    tier: tierFor(80, 'friend'),
    highlight: pickHighlightRow(rows),
  }
}

describe('makeCompareCardDraw', () => {
  it('框与大数字用档位强调色', () => {
    const ctx = makeRecordingCtx()
    makeCompareCardDraw(makeData())(ctx as never, SIZE)
    expect(ctx.strokeStyles).toContain('#e08f3a')
    expect(ctx.fillStyles).toContain('#e08f3a')
  })

  it('双人名字分别用蓝笔与红笔', () => {
    const ctx = makeRecordingCtx()
    makeCompareCardDraw(makeData())(ctx as never, SIZE)
    expect(ctx.fillStyles).toContain(PALETTE.bluePen)
    expect(ctx.fillStyles).toContain(PALETTE.redPen)
  })

  it('文字含双方昵称/大数字/称号/最有梗一条/品牌条', () => {
    const ctx = makeRecordingCtx()
    makeCompareCardDraw(makeData())(ctx as never, SIZE)
    const texts = ctx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('阿福')
    expect(texts).toContain('小明')
    expect(texts).toContain('80%')
    expect(texts).toContain('双向奔赴')
    expect(texts.some((t) => t.includes('第 2 题你们想到一起了'))).toBe(true)
    expect(texts.some((t) => t.includes('阿福：'))).toBe(true)
    expect(texts.some((t) => t.includes('小明：'))).toBe(true)
    expect(texts.some((t) => t.includes('默契度测试'))).toBe(true)
  })

  it('全不一致时高亮文案换成「分道扬镳」', () => {
    const allMiss = A.map((v) => (v + 1) % 4)
    const rows = buildComparison('friend', A, allMiss)
    const ctx = makeRecordingCtx()
    makeCompareCardDraw({
      quiz: 'friend',
      initiatorName: '阿福',
      challengerName: '小明',
      score: 0,
      tier: tierFor(0, 'friend'),
      highlight: pickHighlightRow(rows),
    })(ctx as never, SIZE)
    const texts = ctx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts.some((t) => t.includes('第 1 题你们就分道扬镳'))).toBe(true)
    expect(texts).toContain('塑料情谊')
  })
})
