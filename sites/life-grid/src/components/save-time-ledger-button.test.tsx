import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { TimeLedgerCardData } from '../card/draw-time-ledger-card'
import { SaveTimeLedgerButton } from './save-time-ledger-button'

const DATA: TimeLedgerCardData = {
  freeYears: 20.5,
  weekly: { sleep: 52.5, work: 40, commute: 7.5, necessary: 14, free: 54 },
  remainingYears: { sleep: 14.97, work: 7.14, commute: 1.34, necessary: 3.99, free: 20.46 },
  screenYears: null,
}

describe('SaveTimeLedgerButton', () => {
  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
  })

  it('桌面：点击触发下载并埋点 card: time-ledger', async () => {
    const analyticsSpy = installAnalyticsSpy()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveTimeLedgerButton data={DATA} />)
    await userEvent.click(screen.getByRole('button', { name: '保存余生时间账单' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { card: 'time-ledger' })
  })

  it('移动端：点击弹出长按提示层并可关闭', async () => {
    installAnalyticsSpy()
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    )
    render(<SaveTimeLedgerButton data={DATA} />)
    await userEvent.click(screen.getByRole('button', { name: '保存余生时间账单' }))
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
    render(<SaveTimeLedgerButton data={DATA} />)
    await userEvent.click(screen.getByRole('button', { name: '保存余生时间账单' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
