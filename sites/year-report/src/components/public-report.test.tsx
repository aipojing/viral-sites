import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DRAFT_STORAGE_KEY } from '../lib/draft-storage'
import { PublicReport } from './public-report'
import type { PublicReportPayload } from '../lib/public-fields'

const PAYLOAD: PublicReportPayload = {
  version: 1,
  year: 2026,
  answers: {
    keyword: '重启',
    'small-win': '学会了游一百米',
    'feeling-scale': 4,
    'next-year-message': '先睡够，再谈别的',
  },
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})

describe('PublicReport', () => {
  it('只渲染链接里带的字段，并说明这只是对方勾选公开的部分', () => {
    render(<PublicReport payload={PAYLOAD} onStartOwn={() => undefined} />)

    expect(screen.getByRole('heading', { name: '别人分享给你的年度报告' })).toBeInTheDocument()
    expect(screen.getByText(/勾选公开的 4 项/)).toBeInTheDocument()
    expect(screen.getByText('重启')).toBeInTheDocument()
    expect(screen.getByText('先睡够，再谈别的')).toBeInTheDocument()
  })

  it('没勾的字段整段不出现，也不会留下占位空白页', () => {
    render(<PublicReport payload={PAYLOAD} onStartOwn={() => undefined} />)

    expect(screen.queryByText('今年走过的地方')).not.toBeInTheDocument()
    expect(screen.queryByText('今年很重要的人')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('第 1 / 4 页')
  })

  it('接收者视图不往本机存储写任何东西', () => {
    render(<PublicReport payload={PAYLOAD} onStartOwn={() => undefined} />)

    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('提供「我也写一份」入口', async () => {
    const user = userEvent.setup()
    const onStartOwn = vi.fn()
    render(<PublicReport payload={PAYLOAD} onStartOwn={onStartOwn} />)

    await user.click(screen.getByRole('button', { name: '我也写一份' }))
    expect(onStartOwn).toHaveBeenCalledTimes(1)
  })

  it('只带一个字段的链接也能读：页数随内容缩短', () => {
    render(
      <PublicReport payload={{ version: 1, year: 2026, answers: { keyword: '熬' } }} onStartOwn={() => undefined} />,
    )

    expect(screen.getByText(/勾选公开的 1 项/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('第 1 / 2 页')
  })
})
