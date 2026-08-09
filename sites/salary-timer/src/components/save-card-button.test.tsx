import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import type { DrawFn } from '@viral/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { SaveCardButton } from './save-card-button'

const makeDraw = (): DrawFn => (ctx, size) => {
  ctx.fillText('测试小票', size.width / 2, size.height / 2)
}

describe('SaveCardButton', () => {
  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
  })

  it('桌面：点击触发下载并埋点片段卡属性', async () => {
    const analyticsSpy = installAnalyticsSpy()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(
      <SaveCardButton
        makeDraw={makeDraw}
        filename="salary-timer-fragment.png"
        label="保存片段小票"
        trackProps={{ card: 'scene', scene: 'meeting' }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '保存片段小票' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', {
      slug: 'salary-timer',
      card: 'scene',
      scene: 'meeting',
    })
  })

  it('日报埋点只带 amount_visible 枚举，不带金额', async () => {
    const analyticsSpy = installAnalyticsSpy()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(
      <SaveCardButton
        makeDraw={makeDraw}
        filename="salary-timer-daily.png"
        label="保存今日日报"
        trackProps={{ card: 'daily', amount_visible: 0 }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '保存今日日报' }))
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', {
      slug: 'salary-timer',
      card: 'daily',
      amount_visible: 0,
    })
  })

  it('移动端：点击弹出长按提示层并可关闭', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')
    render(
      <SaveCardButton
        makeDraw={makeDraw}
        filename="salary-timer-fragment.png"
        label="保存片段小票"
        trackProps={{ card: 'scene', scene: 'meeting' }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '保存片段小票' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
    await userEvent.click(screen.getByText('点击空白处关闭'))
    expect(screen.queryByText('长按图片保存')).not.toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    const analyticsSpy = installAnalyticsSpy()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(
      <SaveCardButton
        makeDraw={makeDraw}
        filename="salary-timer-fragment.png"
        label="保存片段小票"
        trackProps={{ card: 'scene', scene: 'meeting' }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '保存片段小票' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', { slug: 'salary-timer' })
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
