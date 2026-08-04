import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { App } from './app'

function drawOnce() {
  const tube = screen.getByRole('button', { name: '签筒' })
  fireEvent.pointerDown(tube)
  fireEvent.pointerUp(tube)
  act(() => {
    vi.advanceTimersByTime(1600)
  })
}

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    installCanvasStub()
    vi.useFakeTimers()
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('完整流程：求签 → 结果屏 + generate/streak_day 埋点', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    drawOnce()
    expect(screen.getByText(/连续求签第 1 天/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存今日签' })).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('generate', { level: expect.any(String) })
    expect(umamiSpy).toHaveBeenCalledWith('streak_day', { streak: 1 })
  })

  it('同天重复求签：出「心诚，一天一签」，streak_day 不重报，generate 照报', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    drawOnce()
    fireEvent.click(screen.getByRole('button', { name: '回到签筒' }))
    drawOnce()
    expect(screen.getByText('心诚，一天一签')).toBeInTheDocument()
    expect(screen.getByText(/连续求签第 1 天/)).toBeInTheDocument()
    const calls = (name: string) => umamiSpy.mock.calls.filter((c) => c[0] === name).length
    expect(calls('generate')).toBe(2)
    expect(calls('streak_day')).toBe(1)
  })

  it('昵称持久化：回到签筒后输入框仍是上次昵称', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    drawOnce()
    fireEvent.click(screen.getByRole('button', { name: '回到签筒' }))
    expect(screen.getByLabelText('怎么称呼你')).toHaveValue('阿福')
  })

  it('页脚常驻免责声明与隐私声明（全站唯一免责位置）', () => {
    render(<App />)
    expect(
      screen.getByText('签文为程序生成的玩梗内容，不构成任何预测与建议'),
    ).toBeInTheDocument()
    expect(screen.getByText(/只存在这台设备/)).toBeInTheDocument()
  })
})
