import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultScreen } from './result-screen'

const base = {
  durationMs: 23_400,
  percentile: null as number | null,
  percentilePending: false,
  localOnly: false,
  todayCount: 0,
  isNewBest: false,
  challengeTarget: null as number | null,
  challengeUrl: 'https://example.com/hold-button/?beat=23400',
  onRetry: () => {},
}

describe('ResultScreen', () => {
  it('先展示本地时长与称号', () => {
    render(<ResultScreen {...base} />)
    expect(screen.getByText('23.4 秒')).toBeInTheDocument()
    expect(screen.getByText('路过按了一下')).toBeInTheDocument()
  })

  it('有百分位时展示「超过 X%」', () => {
    render(<ResultScreen {...base} durationMs={130_000} percentile={72} todayCount={58} />)
    expect(screen.getByText(/超过今天 72%/)).toBeInTheDocument()
    expect(screen.getByText(/58 人/)).toBeInTheDocument()
  })

  it('本地模式展示降级文案，不展示百分位', () => {
    render(<ResultScreen {...base} localOnly />)
    expect(screen.getByText(/成绩保留在本机/)).toBeInTheDocument()
  })

  it('服务端已返回首位结果 percentile=null 时不再显示正在核对', () => {
    render(<ResultScreen {...base} todayCount={1} />)
    expect(screen.getByText(/首位完成挑战/)).toBeInTheDocument()
    expect(screen.queryByText(/正在核对/)).not.toBeInTheDocument()
  })

  it('只在等待服务端结果时显示正在核对', () => {
    render(<ResultScreen {...base} percentilePending />)
    expect(screen.getByText(/正在核对/)).toBeInTheDocument()
  })

  it('打破本机纪录时给出提示', () => {
    render(<ResultScreen {...base} isNewBest />)
    expect(screen.getByText(/新的本机纪录/)).toBeInTheDocument()
  })

  it('再来一次触发 onRetry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ResultScreen {...base} onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: /再来一次/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('成绩区同时提供保存成绩卡与复制挑战链接两个入口', () => {
    render(<ResultScreen {...base} />)
    expect(screen.getByRole('button', { name: '保存成绩卡' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制挑战链接' })).toBeInTheDocument()
  })
})
