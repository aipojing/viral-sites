import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { fillWrappedText, mulberry32, wobblyLine, wobblyRect } from './doodle'

describe('mulberry32', () => {
  it('同种子序列一致', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('不同种子序列不同', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
  it('取值在 [0, 1)', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 100; i += 1) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('wobblyLine', () => {
  it('一次 beginPath/moveTo/quadraticCurveTo/stroke，端点抖动不超过 ±1.5px', () => {
    const ctx = makeRecordingCtx()
    wobblyLine(ctx as unknown as CanvasRenderingContext2D, 10, 20, 110, 20, mulberry32(1))
    expect(ctx.beginPath).toHaveBeenCalledOnce()
    expect(ctx.stroke).toHaveBeenCalledOnce()
    const [mx, my] = ctx.moveTo.mock.calls[0]
    expect(Math.abs(mx - 10)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(my - 20)).toBeLessThanOrEqual(1.5)
    const [, , ex, ey] = ctx.quadraticCurveTo.mock.calls[0]
    expect(Math.abs(ex - 110)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(ey - 20)).toBeLessThanOrEqual(1.5)
  })
})

describe('wobblyRect', () => {
  it('画 4 条边', () => {
    const ctx = makeRecordingCtx()
    wobblyRect(ctx as unknown as CanvasRenderingContext2D, 0, 0, 100, 50, mulberry32(1))
    expect(ctx.stroke).toHaveBeenCalledTimes(4)
  })
})

describe('fillWrappedText', () => {
  it('按字数折行并返回下一行 y', () => {
    const ctx = makeRecordingCtx()
    const nextY = fillWrappedText(
      ctx as unknown as CanvasRenderingContext2D,
      '一二三四五六七八九十一二',
      540,
      100,
      5,
      60,
    )
    const texts = ctx.fillText.mock.calls.map((c) => c[0])
    expect(texts).toEqual(['一二三四五', '六七八九十', '一二'])
    expect(nextY).toBe(280)
  })
  it('emoji 不被劈开', () => {
    const ctx = makeRecordingCtx()
    fillWrappedText(ctx as unknown as CanvasRenderingContext2D, '猫🐱狗🐶鸟', 540, 100, 2, 60)
    expect(ctx.fillText.mock.calls.map((c) => c[0])).toEqual(['猫🐱', '狗🐶', '鸟'])
  })
})
