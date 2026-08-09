import { useEffect, useRef, useState } from 'react'
import {
  createVisibleClock,
  readElapsed,
  setClockVisible,
  type VisibleClockState,
} from '../lib/visible-clock'

const REDUCED_MOTION_TICK_MS = 1000

// 默认实现放在模块级，保证引用稳定，effect 依赖不会每次渲染变化
const defaultNow = (): number => performance.now()
const defaultRaf = (callback: FrameRequestCallback): number => window.requestAnimationFrame(callback)
const defaultCancelRaf = (id: number): void => window.cancelAnimationFrame(id)

export interface VisibleElapsedOptions {
  /** prefers-reduced-motion 时每秒离散更新一次，否则用 rAF 平滑刷新 */
  reducedMotion?: boolean
  /** 可注入的 monotonic 时钟（测试用），默认 performance.now */
  now?: () => number
  /** 可注入的 rAF（测试用） */
  raf?: (callback: FrameRequestCallback) => number
  cancelRaf?: (id: number) => void
}

/**
 * 全站唯一的有效停留时钟：只累计页面可见时间，隐藏冻结、恢复续算、刷新归零。
 * 返回当前累计的有效毫秒数，事实数值每次渲染都由它重新推导。
 */
export function useVisibleElapsed(options: VisibleElapsedOptions = {}): number {
  const now = options.now ?? defaultNow
  const raf = options.raf ?? defaultRaf
  const cancelRaf = options.cancelRaf ?? defaultCancelRaf
  const reducedMotion = options.reducedMotion ?? false

  const clockRef = useRef<VisibleClockState | null>(null)
  if (clockRef.current === null) {
    clockRef.current = createVisibleClock(now(), document.visibilityState === 'visible')
  }

  const [elapsedMs, setElapsedMs] = useState(() => readElapsed(clockRef.current as VisibleClockState, now()))

  useEffect(() => {
    let rafId: number | null = null
    let timer: number | null = null

    const tick = () => {
      setElapsedMs(readElapsed(clockRef.current as VisibleClockState, now()))
    }
    const loop = () => {
      tick()
      rafId = raf(loop)
    }
    const start = () => {
      tick()
      if (reducedMotion) {
        if (timer === null) timer = window.setInterval(tick, REDUCED_MOTION_TICK_MS)
      } else if (rafId === null) {
        loop()
      }
    }
    const stop = () => {
      if (rafId !== null) {
        cancelRaf(rafId)
        rafId = null
      }
      if (timer !== null) {
        window.clearInterval(timer)
        timer = null
      }
    }

    const onVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      clockRef.current = setClockVisible(clockRef.current as VisibleClockState, visible, now())
      if (visible) {
        start()
      } else {
        stop()
        tick()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [reducedMotion, now, raf, cancelRaf])

  return elapsedMs
}
