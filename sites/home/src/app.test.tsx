import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'
import { projects } from './projects'

afterEach(() => {
  vi.useRealTimers()
})

describe('App', () => {
  it('默认把今日主推玩法放进主舞台，并提供站内开始链接', () => {
    render(<App />)

    const featured = projects.find((project) => project.slug === 'cyber-fortune')!

    expect(screen.getByRole('heading', { name: '今天玩哪个？' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: featured.title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '开始玩' })).toHaveAttribute(
      'href',
      featured.href,
    )
  })

  it('选中卡带后切换主舞台及开始链接', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: `选择${projects[1].title}` }))

    expect(screen.getByRole('heading', { name: projects[1].title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '开始玩' })).toHaveAttribute(
      'href',
      projects[1].href,
    )
    expect(screen.getByRole('button', { name: `选择${projects[1].title}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('始终把当前选中的卡带滚动到轨道中央', () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    render(<App />)

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  })

  it('随机选择会轮播后停在抽中的玩法', () => {
    vi.useFakeTimers()
    render(<App random={() => 0.999} />)

    fireEvent.click(screen.getByRole('button', { name: '随机选择' }))
    expect(screen.getByRole('button', { name: '抽取中' })).toBeDisabled()

    act(() => {
      vi.runAllTimers()
    })

    expect(screen.getByRole('heading', { name: projects.at(-1)!.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '随机选择' })).toBeEnabled()
  })

  it('随机轮播先稳住画面，再逐步减速落位', () => {
    vi.useFakeTimers()
    render(<App random={() => 0.999} />)

    fireEvent.click(screen.getByRole('button', { name: '随机选择' }))

    act(() => {
      vi.advanceTimersByTime(179)
    })
    expect(screen.getByRole('heading', { name: '赛博求签' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('heading', { name: '赛博求签' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择拒绝话术生成器' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    act(() => {
      vi.advanceTimersByTime(859)
    })
    expect(screen.getByRole('heading', { name: '赛博求签' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择AI 赛博判官' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('heading', { name: '赛博求签' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择下一问' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '抽取中' })).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(480)
    })
    expect(screen.getByRole('heading', { name: projects.at(-1)!.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '随机选择' })).toBeEnabled()
  })

  it('全部玩法面板展示所有站内入口并可关闭', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '全部玩法' }))

    const dialog = screen.getByRole('dialog', { name: '全部玩法' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /进入/ })).toHaveLength(projects.length)

    fireEvent.click(screen.getByRole('button', { name: '关闭全部玩法' }))
    expect(screen.queryByRole('dialog', { name: '全部玩法' })).not.toBeInTheDocument()
  })
})
