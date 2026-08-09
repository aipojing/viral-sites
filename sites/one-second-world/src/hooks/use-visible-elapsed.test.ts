import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVisibleElapsed } from './use-visible-elapsed'

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

/** 手动驱动的 rAF：flush 执行当前挂起的一帧回调 */
function createManualRaf() {
  let nextId = 0
  const pending = new Map<number, FrameRequestCallback>()
  return {
    raf: (callback: FrameRequestCallback) => {
      nextId += 1
      pending.set(nextId, callback)
      return nextId
    },
    cancelRaf: (id: number) => {
      pending.delete(id)
    },
    flush: () => {
      // 与浏览器一致：回调执行后自动从挂起队列移除
      const entries = [...pending.entries()]
      pending.clear()
      for (const [, callback] of entries) {
        callback(performance.now())
      }
    },
    pendingCount: () => pending.size,
  }
}

describe('useVisibleElapsed', () => {
  beforeEach(() => {
    setVisibility('visible')
  })

  it('可见时随帧更新累计毫秒', () => {
    let t = 0
    const manual = createManualRaf()
    const { result } = renderHook(() =>
      useVisibleElapsed({ now: () => t, raf: manual.raf, cancelRaf: manual.cancelRaf }),
    )
    expect(result.current).toBe(0)

    act(() => {
      t = 3_000
      manual.flush()
    })
    expect(result.current).toBe(3_000)
  })

  it('隐藏冻结、恢复续算，后台时间不补跳', () => {
    let t = 0
    const manual = createManualRaf()
    const { result } = renderHook(() =>
      useVisibleElapsed({ now: () => t, raf: manual.raf, cancelRaf: manual.cancelRaf }),
    )

    act(() => {
      t = 5_000
      manual.flush()
    })
    expect(result.current).toBe(5_000)

    // 隐藏：停止 rAF，值定格
    act(() => {
      setVisibility('hidden')
    })
    expect(manual.pendingCount()).toBe(0)

    act(() => {
      t = 7_205_000 // 后台两小时
      manual.flush()
    })
    expect(result.current).toBe(5_000)

    // 恢复可见后再看 2 秒，只加 2 秒
    act(() => {
      setVisibility('visible')
      t = 7_207_000
      manual.flush()
    })
    expect(result.current).toBe(7_000)
  })

  it('reduced-motion 时每秒离散更新且不用 rAF', () => {
    vi.useFakeTimers()
    try {
      let t = 0
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame')
      const { result } = renderHook(() => useVisibleElapsed({ reducedMotion: true, now: () => t }))

      act(() => {
        t = 2_500
        vi.advanceTimersByTime(2_500)
      })
      expect(result.current).toBe(2_500)
      expect(rafSpy).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('卸载后不再响应 visibility 与帧', () => {
    let t = 0
    const manual = createManualRaf()
    const { result, unmount } = renderHook(() =>
      useVisibleElapsed({ now: () => t, raf: manual.raf, cancelRaf: manual.cancelRaf }),
    )

    unmount()
    act(() => {
      t = 9_000
      manual.flush()
      setVisibility('hidden')
      setVisibility('visible')
    })
    expect(result.current).toBe(0)
  })
})
