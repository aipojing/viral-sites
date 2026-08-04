import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { PALETTE } from '../lib/palette'
import { STYLE_REMARKS } from '../lib/style-remark'
import { makeInviteCardDraw } from './draw-invite-card'

const SIZE = { width: 1080, height: 1440 }
const ANSWERS = Array(10).fill(0)

describe('makeInviteCardDraw', () => {
  it('纸白底 + 蓝笔手抖框', () => {
    const ctx = makeRecordingCtx()
    makeInviteCardDraw('friend', '阿福', ANSWERS)(ctx as never, SIZE)
    expect(ctx.fillStyles[0]).toBe(PALETTE.paper)
    expect(ctx.fillRect.mock.calls[0]).toEqual([0, 0, 1080, 1440])
    expect(ctx.strokeStyles).toContain(PALETTE.bluePen)
    expect(ctx.stroke.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('文字含标题/昵称/宣言/题库名/风格锐评/品牌条', () => {
    const ctx = makeRecordingCtx()
    makeInviteCardDraw('friend', '阿福', ANSWERS)(ctx as never, SIZE)
    const texts = ctx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('默契度挑战书')
    expect(texts).toContain('阿福')
    // 宣言与锐评经 fillWrappedText 折行，断言用 join 后的整串
    expect(texts.join('')).toContain('赌你答不对一半')
    expect(texts.some((t) => t.includes('好友版'))).toBe(true)
    expect(texts.join('')).toContain(STYLE_REMARKS['single-minded'])
    expect(texts.some((t) => t.includes('默契度测试'))).toBe(true)
  })

  it('同数据两次绘制调用序列一致（种子确定性）', () => {
    const a = makeRecordingCtx()
    const b = makeRecordingCtx()
    makeInviteCardDraw('couple', '小明', ANSWERS)(a as never, SIZE)
    makeInviteCardDraw('couple', '小明', ANSWERS)(b as never, SIZE)
    expect(a.moveTo.mock.calls).toEqual(b.moveTo.mock.calls)
  })
})
