import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { ScoreCardData } from '../card/draw-score-card'
import { SaveCardButton } from './save-card-button'

const data: ScoreCardData = {
  durationMs: 23_400,
  percentile: 42,
  title: '路过按了一下',
  challengeUrl: 'https://example.com/hold-button/?beat=23400',
}

describe('SaveCardButton', () => {
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

  it('桌面：点击保存并埋点 save_image（只带 slug，不带成绩数值）', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存成绩卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { slug: 'hold-button' })
    expect(analyticsSpy).not.toHaveBeenCalledWith(
      'challenge_shared',
      expect.anything(),
    )
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存成绩卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存成绩卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', { slug: 'hold-button' })
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
