import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { LetterCardData } from '../card/draw-letter-card'
import { SaveLetterButton } from './save-letter-button'

const data: LetterCardData = {
  typeLabel: '请假消息',
  tone: 'wenyan',
  text: '启者：偶染微恙，乞假一日。',
  includeAddressee: false,
}

describe('SaveLetterButton', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
  })

  it('桌面：点击保存并埋点 save_image（只带 mode/type/tone 枚举）', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveLetterButton data={data} documentType="leave" />)
    await userEvent.click(screen.getByRole('button', { name: '保存信纸卡片' }))
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', {
      mode: 'document',
      type: 'leave',
      tone: 'wenyan',
    })
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveLetterButton data={data} documentType="apology" />)
    await userEvent.click(screen.getByRole('button', { name: '保存信纸卡片' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveLetterButton data={data} documentType="leave" />)
    await userEvent.click(screen.getByRole('button', { name: '保存信纸卡片' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
