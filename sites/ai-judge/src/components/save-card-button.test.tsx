import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { Verdict } from '../lib/verdict'
import { SaveCardButton } from './save-card-button'

const VERDICT: Verdict = {
  crime: '拖延罪',
  verdict:
    '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零，收藏的教程从未打开第二次。本官念其态度尚可。',
  sentence: '判处早睡三个月，缓期执行',
  seal: '赛博衙门 · 即日生效',
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

  it('桌面：点击触发下载并埋点 save_image（不带判词内容）', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton verdict={VERDICT} />)
    await userEvent.click(screen.getByRole('button', { name: '保存判词卡' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { slug: 'ai-judge' })
  })

  it('移动端：点击弹出长按提示层并可关闭', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')
    render(<SaveCardButton verdict={VERDICT} />)
    await userEvent.click(screen.getByRole('button', { name: '保存判词卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
    expect(screen.getByAltText('判词卡片')).toBeInTheDocument()
    await userEvent.click(screen.getByText('点击空白处关闭'))
    expect(screen.queryByText('长按图片保存')).not.toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton verdict={VERDICT} />)
    await userEvent.click(screen.getByRole('button', { name: '保存判词卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', { slug: 'ai-judge' })
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
