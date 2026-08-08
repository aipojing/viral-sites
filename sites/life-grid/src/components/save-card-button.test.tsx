import { render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { LifeStats } from '../lib/life-math'
import { SaveCardButton } from './save-card-button'

const stats: LifeStats = {
  age: 30,
  weeksLived: 1565,
  totalWeeks: 4056,
  percent: 38.6,
  blankWeeks: 2491,
  bonusWeeks: 0,
  meetingsPerYear: 2,
  parentMeetings: 40,
  springFestivals: 48,
  workdays: 7500,
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

  it('桌面：点击触发下载并埋点 save_image', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton stats={stats} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的人生卡片' }))
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', undefined)
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton stats={stats} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的人生卡片' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton stats={stats} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的人生卡片' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
