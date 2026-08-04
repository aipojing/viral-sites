import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { App } from './app'

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('完整流程：落地 → 8 题 → 报告，埋点齐全', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '开始检测' }))
    for (let i = 0; i < 8; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    expect(screen.getByText('你的班味浓度')).toBeInTheDocument()
    expect(screen.getByText('班味清新')).toBeInTheDocument()
    const events = umamiSpy.mock.calls.map((c) => c[0])
    expect(events.filter((e) => e === 'q_answered')).toHaveLength(8)
    expect(umamiSpy).toHaveBeenCalledWith('q_answered', { slug: 'ban-wei', q: 1 })
    expect(umamiSpy).toHaveBeenCalledWith('generate', { slug: 'ban-wei', score: 0 })
  })

  it('再测一次回落地屏', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '开始检测' }))
    for (let i = 0; i < 8; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    await userEvent.click(screen.getByRole('button', { name: '再测一次' }))
    expect(screen.getByRole('button', { name: '开始检测' })).toBeInTheDocument()
  })

  it('免责声明常驻页脚且全站仅此一处', () => {
    render(<App />)
    expect(screen.getByText(/测试纯属玩梗/)).toBeInTheDocument()
  })
})
