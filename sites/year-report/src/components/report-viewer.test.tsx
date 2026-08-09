import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildReportSlides } from '../lib/report-model'
import { ReportViewer } from './report-viewer'
import type { ReportAnswers } from '../lib/report-types'

const FULL: ReportAnswers = {
  keyword: '重启',
  place: '县城的老家',
  song: '同一首歌',
  'comfort-food': '楼下的牛肉面',
  'important-person': '老同学 K',
  'small-win': '学会了游一百米',
  'hard-moment': '三月那通电话',
  'feeling-scale': 4,
  'goal-and-release': { completion: 60, release: '没考完的证' },
  'next-year-message': '先睡够，再谈别的',
}

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ReportViewer', () => {
  it('满答案时逐页可读，页码通过 aria-live 播报', () => {
    render(<ReportViewer slides={buildReportSlides(2026, FULL)} />)
    expect(screen.getByRole('status')).toHaveTextContent('第 1 / 7 页')
    expect(screen.getByText('重启')).toBeInTheDocument()
    expect(screen.getByText('先睡够，再谈别的')).toBeInTheDocument()
  })

  it('上一页在首页禁用，下一页推进页码', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    mockReducedMotion(false)
    render(<ReportViewer slides={buildReportSlides(2026, FULL)} />)

    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByRole('status')).toHaveTextContent('第 2 / 7 页')
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' })
    expect(screen.getByRole('button', { name: '上一页' })).toBeEnabled()
  })

  it('减少动态效果时直接跳转，不做平滑滚动', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    mockReducedMotion(true)
    render(<ReportViewer slides={buildReportSlides(2026, FULL)} />)

    await user.click(screen.getByRole('button', { name: '下一页' }))
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('最短报告也能翻完：末页禁用下一页', async () => {
    const user = userEvent.setup()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    render(<ReportViewer slides={buildReportSlides(2026, {})} />)

    expect(screen.getByRole('status')).toHaveTextContent('第 1 / 2 页')
    await user.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
  })

  it('翻页后紧随的滚动事件不会把页码拽回去（末页也按得到）', async () => {
    const user = userEvent.setup()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    render(<ReportViewer slides={buildReportSlides(2026, {})} />)

    await user.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByRole('status')).toHaveTextContent('第 2 / 2 页')
    // 真机上末页顶部超出容器最大滚动距离，滚动只会停在上一页的位置并冒出 scroll
    fireEvent.scroll(screen.getByLabelText('年度报告'))
    expect(screen.getByRole('status')).toHaveTextContent('第 2 / 2 页')
  })

  it('操作区由上层注入', () => {
    render(
      <ReportViewer slides={buildReportSlides(2026, FULL)} actions={<button type="button">保存或分享</button>} />,
    )
    expect(screen.getByRole('button', { name: '保存或分享' })).toBeInTheDocument()
  })
})
