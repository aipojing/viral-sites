import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy, type AnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App, durationBucket } from './app'
import type { AppDeps } from './app'

let now = 0
let nextId = 0
const pending = new Map<number, FrameRequestCallback>()

const deps: AppDeps = {
  now: () => now,
  raf: (callback) => {
    nextId += 1
    pending.set(nextId, callback)
    return nextId
  },
  cancelRaf: (id) => {
    pending.delete(id)
  },
}

/** 推进一帧：设置 monotonic 时间后执行挂起的 rAF 回调（与浏览器一致，执行后移除） */
function frame(time: number): void {
  act(() => {
    now = time
    const entries = [...pending.entries()]
    pending.clear()
    for (const [, callback] of entries) {
      callback(time)
    }
  })
}

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

let analyticsSpy: AnalyticsSpy

beforeEach(() => {
  now = 0
  nextId = 0
  pending.clear()
  setVisibility('visible')
  analyticsSpy = installAnalyticsSpy()
})

afterEach(() => {
  removeAnalyticsSpy()
})

describe('App', () => {
  it('四章按 self → daily → human → planet 顺序展开', () => {
    const { container } = render(<App {...deps} />)
    const chapters = [...container.querySelectorAll('[data-chapter]')].map((el) =>
      el.getAttribute('data-chapter'),
    )
    expect(chapters).toEqual(['self', 'daily', 'human', 'planet'])
  })

  it('首屏从 0 秒开始，按有效停留时间更新', () => {
    render(<App {...deps} />)
    expect(screen.getByTestId('intro-clock')).toHaveTextContent('你看着这个页面 0 秒')
    frame(5_000)
    expect(screen.getByTestId('intro-clock')).toHaveTextContent('你看着这个页面 5 秒')
  })

  it('进入页面即为每个章节记录一次曝光（jsdom 无 IntersectionObserver，降级常显）', () => {
    render(<App {...deps} />)
    const viewed = analyticsSpy.mock.calls.filter((call) => call[0] === 'chapter_viewed')
    expect(viewed).toHaveLength(4)
    expect(viewed.map((call) => (call[1] as { chapter: string }).chapter)).toEqual([
      'self',
      'daily',
      'human',
      'planet',
    ])
  })

  it('点击查看来源打开面板并上报 source_opened，可关闭', () => {
    render(<App {...deps} />)
    const buttons = screen.getAllByRole('button', { name: '查看数据来源' })
    fireEvent.click(buttons[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('source_opened', { source: 'osw-self-heartbeat' })

    fireEvent.click(screen.getByRole('button', { name: '关闭来源面板' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('来源面板冻结在打开时的有效停留时长', () => {
    render(<App {...deps} />)
    frame(5_000)
    fireEvent.click(screen.getAllByRole('button', { name: '查看数据来源' })[0])

    const formulaAtOpen = within(screen.getByRole('dialog')).getByText(/换算式/).textContent
    expect(formulaAtOpen).toContain('× 5.0')

    frame(9_000)
    expect(within(screen.getByRole('dialog')).getByText(/换算式/).textContent).toBe(formulaAtOpen)
  })

  it('点击定格这一刻冻结当前有效秒数，时钟继续走也不变', () => {
    render(<App {...deps} />)
    frame(5_000)
    fireEvent.click(screen.getByRole('button', { name: '定格这一刻' }))
    expect(screen.getByRole('dialog', { name: '定格这一刻' })).toBeInTheDocument()
    expect(screen.getByText(/停留的 5 秒已经冻结/)).toBeInTheDocument()
    // 默认选出的 A 级事实包含快递条目
    expect(within(screen.getByRole('dialog')).getByText('中国寄出的快递')).toBeInTheDocument()

    // 背景时钟继续前进，快照数值保持冻结
    frame(9_000)
    expect(screen.getByText(/停留的 5 秒已经冻结/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '关闭快照编辑' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('页面隐藏时只上报一次停留时长桶，不上传精确秒数', () => {
    render(<App {...deps} />)
    frame(50_000)
    act(() => {
      setVisibility('hidden')
    })
    expect(analyticsSpy).toHaveBeenCalledWith('engaged_time_bucket', { bucket: '45_119' })

    // 反复隐藏/恢复也只报一次
    act(() => {
      setVisibility('visible')
      setVisibility('hidden')
    })
    const bucketCalls = analyticsSpy.mock.calls.filter((call) => call[0] === 'engaged_time_bucket')
    expect(bucketCalls).toHaveLength(1)
  })
})

describe('durationBucket', () => {
  it('使用预定义时长桶', () => {
    expect(durationBucket(0)).toBe('lt15')
    expect(durationBucket(14_999)).toBe('lt15')
    expect(durationBucket(15_000)).toBe('15_44')
    expect(durationBucket(44_999)).toBe('15_44')
    expect(durationBucket(45_000)).toBe('45_119')
    expect(durationBucket(119_999)).toBe('45_119')
    expect(durationBucket(120_000)).toBe('gte120')
  })
})
