import { afterEach, describe, expect, it, vi } from 'vitest'
import { CARD_SIZE, renderCard } from './render-card'

function stubCtx() {
  const fake = { fillRect: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake as never)
  return fake
}

afterEach(() => vi.restoreAllMocks())

describe('renderCard', () => {
  it('默认尺寸 1080×1440 且把 ctx 与尺寸传给 draw', () => {
    const fake = stubCtx()
    const draw = vi.fn()
    const canvas = renderCard(draw)
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1440)
    expect(draw).toHaveBeenCalledWith(fake, CARD_SIZE)
  })

  it('ctx 不可用时抛错', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(() => renderCard(() => {})).toThrow('canvas 2d context unavailable')
  })
})
