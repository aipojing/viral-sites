import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVisibleNow } from './use-visible-now'

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useVisibleNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 10, 10, 0, 0))
    setVisibility('visible')
  })

  it('前台每秒更新一次 now', () => {
    const { result } = renderHook(() => useVisibleNow())
    expect(result.current.getTime()).toBe(new Date(2026, 7, 10, 10, 0, 0).getTime())

    // 注意：setSystemTime 之后 advanceTimersByTime 会同步推进系统时钟
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.getTime()).toBe(new Date(2026, 7, 10, 10, 0, 3).getTime())
  })

  it('页面隐藏时停止更新', () => {
    const { result } = renderHook(() => useVisibleNow())
    act(() => {
      setVisibility('hidden')
    })

    const frozen = result.current.getTime()
    vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.getTime()).toBe(frozen)
  })

  it('恢复可见时立即按真实时间补算', () => {
    const { result } = renderHook(() => useVisibleNow())
    act(() => {
      setVisibility('hidden')
    })

    vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0)) // 后台两小时
    act(() => {
      setVisibility('visible')
    })
    expect(result.current.getTime()).toBe(new Date(2026, 7, 10, 12, 0, 0).getTime())
  })

  it('卸载后不再更新', () => {
    const { result, unmount } = renderHook(() => useVisibleNow())
    unmount()
    vi.setSystemTime(new Date(2026, 7, 10, 11, 0, 0))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.getTime()).toBe(new Date(2026, 7, 10, 10, 0, 0).getTime())
  })
})
