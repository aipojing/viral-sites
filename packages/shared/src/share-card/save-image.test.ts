import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveCard } from './save-image'

const DESKTOP = 'Mozilla/5.0 (Macintosh) Chrome/126.0.0.0 Safari/537.36'
const WECHAT = 'Mozilla/5.0 (iPhone) MicroMessenger/8.0.47'

function makeCanvas(dataUrl = 'data:image/png;base64,AAA') {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'toDataURL').mockReturnValue(dataUrl)
  return canvas
}

afterEach(() => vi.restoreAllMocks())

describe('saveCard', () => {
  it('桌面 UA 走下载：创建 a[download] 并点击', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const strategy = saveCard(makeCanvas(), {
      filename: 'life.png',
      userAgent: DESKTOP,
      onLongPress: vi.fn(),
    })
    expect(strategy).toBe('download')
    expect(click).toHaveBeenCalledOnce()
  })

  it('微信 UA 走长按：回调拿到 dataUrl，不触发下载', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const onLongPress = vi.fn()
    const strategy = saveCard(makeCanvas('data:image/png;base64,BBB'), {
      filename: 'life.png',
      userAgent: WECHAT,
      onLongPress,
    })
    expect(strategy).toBe('long-press')
    expect(onLongPress).toHaveBeenCalledWith('data:image/png;base64,BBB')
    expect(click).not.toHaveBeenCalled()
  })

  it('toDataURL 抛错时向上抛（站点层降级）', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'toDataURL').mockImplementation(() => {
      throw new Error('export failed')
    })
    expect(() =>
      saveCard(canvas, { filename: 'x.png', userAgent: DESKTOP, onLongPress: vi.fn() }),
    ).toThrow('export failed')
  })
})
