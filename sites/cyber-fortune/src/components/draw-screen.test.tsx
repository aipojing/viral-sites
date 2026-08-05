import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DrawScreen } from './draw-screen'

describe('DrawScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('记住上次昵称：localStorage 有值时输入框预填', () => {
    localStorage.setItem('cf.nickname', '老王')
    render(<DrawScreen onDraw={vi.fn()} />)
    expect(screen.getByLabelText('怎么称呼你')).toHaveValue('老王')
  })

  it('空昵称按签筒：出提示，不进入蓄力，也不触发 onDraw', () => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    const tube = screen.getByRole('button', { name: '签筒' })
    fireEvent.pointerDown(tube)
    expect(screen.getByText('先留个昵称，签才认得你')).toBeInTheDocument()
    expect(tube).toHaveAttribute('data-phase', 'idle')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(onDraw).not.toHaveBeenCalled()
  })

  it('完整流程：按下蓄力 → 松手掉签 → 1.5s 后回调昵称', () => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    const tube = screen.getByRole('button', { name: '签筒' })

    fireEvent.pointerDown(tube)
    expect(tube).toHaveAttribute('data-phase', 'charging')
    act(() => {
      vi.advanceTimersByTime(600)
    })

    fireEvent.pointerUp(tube)
    expect(tube).toHaveAttribute('data-phase', 'falling')
    expect(onDraw).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(onDraw).toHaveBeenCalledExactlyOnceWith('阿福')
  })

  it('昵称首尾空格被 trim 后回调', () => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: ' 阿福 ' } })
    const tube = screen.getByRole('button', { name: '签筒' })
    fireEvent.pointerDown(tube)
    fireEvent.pointerUp(tube)
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(onDraw).toHaveBeenCalledExactlyOnceWith('阿福')
  })

  it('falling 阶段重复按压无效（不双触发）', () => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    const tube = screen.getByRole('button', { name: '签筒' })
    fireEvent.pointerDown(tube)
    fireEvent.pointerUp(tube)
    fireEvent.pointerDown(tube)
    fireEvent.pointerUp(tube)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(onDraw).toHaveBeenCalledTimes(1)
  })

  it.each(['Enter', ' '])('键盘 %s 可以完成求签', (key) => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    const tube = screen.getByRole('button', { name: '签筒' })

    fireEvent.keyDown(tube, { key })
    expect(tube).toHaveAttribute('data-phase', 'charging')
    fireEvent.keyUp(tube, { key })
    expect(tube).toHaveAttribute('data-phase', 'falling')

    act(() => vi.advanceTimersByTime(1500))
    expect(onDraw).toHaveBeenCalledExactlyOnceWith('阿福')
  })
})
