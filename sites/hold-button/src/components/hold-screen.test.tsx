import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HoldScreen } from './hold-screen'

function renderHolding(overrides: Partial<ComponentProps<typeof HoldScreen>> = {}) {
  const props = {
    phase: 'holding' as const,
    countdownSeconds: 0,
    shownMs: 5_000,
    milestoneText: '十秒达成，这已经不是误触了。',
    longPressHint: false,
    onHoldStart: vi.fn(),
    onHoldEnd: vi.fn(),
    onInterrupt: vi.fn(),
    ...overrides,
  }
  const view = render(<HoldScreen {...props} />)
  return { ...view, props }
}

/** jsdom 不会从 init 解析 pointerId/pointerType，手工赋到原生事件上 */
function pointerEvent(type: string, init: { pointerId: number; pointerType: string }) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, init)
  return event
}

describe('HoldScreen', () => {
  it('准备阶段展示倒计时', () => {
    renderHolding({ phase: 'preparing', countdownSeconds: 3, shownMs: 0 })
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('按住阶段展示时长、节点文案与提示', () => {
    renderHolding({ shownMs: 5_000, longPressHint: true })
    expect(screen.getByText('十秒达成，这已经不是误触了。')).toBeInTheDocument()
    expect(screen.getByText(/别松手/)).toBeInTheDocument()
    expect(screen.getByText(/已经五分钟/)).toBeInTheDocument()
  })

  it('准备阶段按下开始按住，并上报 pointer 设备类型', () => {
    const { props } = renderHolding({ phase: 'preparing', countdownSeconds: 1, shownMs: 0 })
    fireEvent(screen.getByTestId('hold-zone'), pointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch' }))
    expect(props.onHoldStart).toHaveBeenCalledWith('touch')
  })

  it('首个 pointer 抬起结束，其余 pointer 被忽略（双指不重启）', () => {
    const { props } = renderHolding()
    const zone = screen.getByTestId('hold-zone')
    fireEvent(zone, pointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch' }))
    fireEvent(zone, pointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch' }))
    fireEvent(zone, pointerEvent('pointerup', { pointerId: 2, pointerType: 'touch' }))
    expect(props.onHoldEnd).not.toHaveBeenCalled()
    fireEvent(zone, pointerEvent('pointerup', { pointerId: 1, pointerType: 'touch' }))
    expect(props.onHoldEnd).toHaveBeenCalledWith('released')
    expect(props.onHoldEnd).toHaveBeenCalledTimes(1)
  })

  it('pointercancel 结束并按住阶段切页/失焦分别上报 hidden/blurred', () => {
    const { props } = renderHolding()
    const zone = screen.getByTestId('hold-zone')
    fireEvent(zone, pointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse' }))
    fireEvent(zone, pointerEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' }))
    expect(props.onHoldEnd).toHaveBeenCalledWith('cancelled')

    fireEvent(window, new Event('blur'))
    expect(props.onHoldEnd).toHaveBeenCalledWith('blurred')

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    fireEvent(document, new Event('visibilitychange'))
    expect(props.onHoldEnd).toHaveBeenCalledWith('hidden')
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('空格键按下开始、抬起结束，忽略 key repeat', () => {
    const { props, rerender } = renderHolding({ phase: 'preparing', countdownSeconds: 1, shownMs: 0 })
    fireEvent.keyDown(window, { code: 'Space', repeat: true })
    expect(props.onHoldStart).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { code: 'Space' })
    expect(props.onHoldStart).toHaveBeenCalledWith('desktop')
    // App 会在此刻切到 holding；rerender 模拟 phase 变化后再抬键
    rerender(
      <HoldScreen
        phase="holding"
        countdownSeconds={0}
        shownMs={1_000}
        milestoneText="刚按下去，故事已经开始了。"
        longPressHint={false}
        onHoldStart={props.onHoldStart}
        onHoldEnd={props.onHoldEnd}
        onInterrupt={props.onInterrupt}
      />,
    )
    fireEvent.keyUp(window, { code: 'Space' })
    expect(props.onHoldEnd).toHaveBeenCalledWith('released')
  })

  it('准备阶段切页或失焦走 onInterrupt', () => {
    const { props } = renderHolding({ phase: 'preparing', countdownSeconds: 2, shownMs: 0 })
    fireEvent(window, new Event('blur'))
    expect(props.onInterrupt).toHaveBeenCalledTimes(1)
    expect(props.onHoldEnd).not.toHaveBeenCalled()
  })
})
