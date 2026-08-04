import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { SaveCardButton } from './save-card-button'

describe('SaveCardButton', () => {
  let umamiSpy: ReturnType<typeof vi.fn>
  const draw = vi.fn()

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

  it('桌面：点击触发下载并埋点 save_image 带卡片标识', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton draw={draw} filename="x.png" label="保存挑战发起卡" cardId="invite" />)
    await userEvent.click(screen.getByRole('button', { name: '保存挑战发起卡' }))
    expect(draw).toHaveBeenCalled()
    expect(umamiSpy).toHaveBeenCalledWith('save_image', { card: 'invite' })
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton draw={draw} filename="x.png" label="保存默契对比卡" cardId="compare" />)
    await userEvent.click(screen.getByRole('button', { name: '保存默契对比卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton draw={draw} filename="x.png" label="保存挑战发起卡" cardId="invite" />)
    await userEvent.click(screen.getByRole('button', { name: '保存挑战发起卡' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', { card: 'invite' })
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
