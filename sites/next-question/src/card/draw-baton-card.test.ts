import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CARD_SIZE } from '@viral/shared'
import { installCanvasStub } from '../../test/canvas-stub'
import { makeBatonCardDraw } from './draw-baton-card'

describe('makeBatonCardDraw', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('邀请卡包含棒数、固定文案、品牌与二维码，但不含问题正文', () => {
    const ctx = installCanvasStub()
    const draw = makeBatonCardDraw(3, 'https://guaihaowan.example/next-question/c/abcd1234abcd1234#b=tok')
    draw(ctx as unknown as CanvasRenderingContext2D, CARD_SIZE)

    const texts = ctx.fillText.mock.calls.map((call) => String(call[0]))
    expect(texts).toContain('第 3 / 6 棒')
    expect(texts).toContain('上一棒给你留了一个问题')
    expect(texts).toContain('回答它，再把下一问交给一个人')
    expect(texts.some((text) => text.includes('下一问'))).toBe(true)
    // 卡片绝不出现任何用户问题正文
    for (const text of texts) {
      expect(text).not.toContain('秘密问题')
    }
    // 纸底 + 二维码模块都靠 fillRect 完成
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(10)
  })

  it('不同席位显示对应棒数', () => {
    const ctx = installCanvasStub()
    makeBatonCardDraw(5, 'https://e.com/c/abcd1234abcd1234#b=t')(
      ctx as unknown as CanvasRenderingContext2D,
      CARD_SIZE,
    )
    const texts = ctx.fillText.mock.calls.map((call) => String(call[0]))
    expect(texts).toContain('第 5 / 6 棒')
  })
})
