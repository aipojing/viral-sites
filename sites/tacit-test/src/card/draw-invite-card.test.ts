import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { PALETTE } from '../lib/palette'
import { makeInviteCardDraw } from './draw-invite-card'

const SIZE = { width: 1080, height: 1440 }
const URL = 'https://example.com/c?d=challenge-payload'

describe('makeInviteCardDraw', () => {
  it('纸白底 + 蓝笔手抖框', () => {
    const ctx = makeRecordingCtx()
    makeInviteCardDraw('friend', '阿福', URL)(ctx as never, SIZE)
    expect(ctx.fillStyles[0]).toBe(PALETTE.paper)
    expect(ctx.fillRect.mock.calls[0]).toEqual([0, 0, 1080, 1440])
    expect(ctx.strokeStyles).toContain(PALETTE.bluePen)
    expect(ctx.stroke.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('文字含标题/昵称/宣言/题库名/品牌条', () => {
    const ctx = makeRecordingCtx()
    makeInviteCardDraw('friend', '阿福', URL)(ctx as never, SIZE)
    const texts = ctx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('默契度挑战书')
    expect(texts).toContain('阿福')
    expect(texts.join('')).toContain('赌你答不对一半')
    expect(texts.some((t) => t.includes('好友版'))).toBe(true)
    expect(texts.some((t) => t.includes('默契度测试'))).toBe(true)
  })

  it('卡片含扫码行动文案，并绘制二维码模块', () => {
    const ctx = makeRecordingCtx()
    makeInviteCardDraw('friend', '阿福', URL)(ctx as never, SIZE)
    const texts = ctx.fillText.mock.calls.map((call) => String(call[0]))
    expect(texts).toContain('扫码答题，看看我们到底多默契')
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(100)
  })

  it('同数据两次绘制调用序列一致（种子确定性）', () => {
    const a = makeRecordingCtx()
    const b = makeRecordingCtx()
    makeInviteCardDraw('couple', '小明', URL)(a as never, SIZE)
    makeInviteCardDraw('couple', '小明', URL)(b as never, SIZE)
    expect(a.moveTo.mock.calls).toEqual(b.moveTo.mock.calls)
  })
})
