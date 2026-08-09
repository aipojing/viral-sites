import { fireEvent, render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy, type AnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { SaveCardButton } from './save-card-button'
import type { ReportAnswers } from '../lib/report-types'

const PUBLIC_ANSWERS: ReportAnswers = {
  keyword: '重启',
  'small-win': '学会了游一百米',
  'feeling-scale': 4,
  'next-year-message': '先睡够，再谈别的',
}

let analyticsSpy: AnalyticsSpy

beforeEach(() => {
  installCanvasStub()
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
  analyticsSpy = installAnalyticsSpy()
})

afterEach(() => {
  removeAnalyticsSpy()
  vi.restoreAllMocks()
})

describe('SaveCardButton', () => {
  it('桌面：直接下载并只上报字段数量', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton year={2026} publicAnswers={PUBLIC_ANSWERS} />)

    fireEvent.click(screen.getByRole('button', { name: '保存总结卡' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { card: 'year-report', field_count: 4 })
    const [, data] = analyticsSpy.mock.calls[0]!
    expect(JSON.stringify(data)).not.toContain('重启')
  })

  it('微信：降级为长按保存提示层，可关闭', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton year={2026} publicAnswers={PUBLIC_ANSWERS} />)

    fireEvent.click(screen.getByRole('button', { name: '保存总结卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
    fireEvent.click(screen.getByText('长按图片保存').parentElement!)
    expect(screen.queryByText('长按图片保存')).not.toBeInTheDocument()
  })

  it('画布不可用时明确提示改用截图', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    render(<SaveCardButton year={2026} publicAnswers={PUBLIC_ANSWERS} />)

    fireEvent.click(screen.getByRole('button', { name: '保存总结卡' }))
    expect(screen.getByText(/直接截图也一样/)).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', undefined)
  })

  it('一个字段都没勾时仍能保存一张只有年份的卡', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton year={2026} publicAnswers={{}} />)

    fireEvent.click(screen.getByRole('button', { name: '保存总结卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { card: 'year-report', field_count: 0 })
  })
})
