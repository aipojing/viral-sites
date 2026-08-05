import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { QuoteCardData } from '../card/draw-quote-card'
import { SaveQuoteButton } from './save-quote-button'

const data: QuoteCardData = {
  text: '不借。我的钱也是一分一分挣的。',
  sceneId: 'jieqian',
  sceneLabel: '被借钱',
  sceneColor: '#0d9488',
  toneId: 'yinggang',
  toneLabel: '直球硬刚',
}

describe('SaveQuoteButton', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('桌面：点击触发下载并埋点 save_image（带 scene/tone）', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveQuoteButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存卡片' }))
    expect(umamiSpy).toHaveBeenCalledWith('save_image', { scene: 'jieqian', tone: 'yinggang' })
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveQuoteButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存卡片' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveQuoteButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存卡片' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
