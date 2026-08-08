import { render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { SaveCardButton } from './save-card-button'

describe('SaveCardButton', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>
  const draw = vi.fn()

  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
  })

  it('桌面：下载接棒卡，埋点只带 slot 与 method，不带 URL', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton draw={draw} filename="baton.png" label="保存邀请卡" kind="baton" slot={3} />)
    await userEvent.click(screen.getByRole('button', { name: '保存邀请卡' }))
    expect(draw).toHaveBeenCalled()
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { card: 'baton' })
    expect(analyticsSpy).toHaveBeenCalledWith('next_question_baton_shared', { q: 3, mode: 'card' })
    for (const [, data] of analyticsSpy.mock.calls) {
      expect(JSON.stringify(data ?? {})).not.toContain('http')
    }
  })

  it('桌面：下载结果卡埋点 next_question_result_saved', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton draw={draw} filename="result.png" label="保存结果卡" kind="result" />)
    await userEvent.click(screen.getByRole('button', { name: '保存结果卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('next_question_result_saved', undefined)
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton draw={draw} filename="baton.png" label="保存邀请卡" kind="baton" slot={2} />)
    await userEvent.click(screen.getByRole('button', { name: '保存邀请卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton draw={draw} filename="baton.png" label="保存邀请卡" kind="baton" slot={2} />)
    await userEvent.click(screen.getByRole('button', { name: '保存邀请卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', { card: 'baton' })
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
