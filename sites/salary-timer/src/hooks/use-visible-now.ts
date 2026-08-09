import { useEffect, useState } from 'react'

const TICK_MS = 1000

// 唯一的低频时钟：前台每秒更新，页面隐藏时停止重绘，
// 恢复可见时立即按真实时间补一次。金额事实由 now 推导，不靠 interval 累加。
export function useVisibleNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: number | null = null

    const start = () => {
      if (timer !== null) return
      timer = window.setInterval(() => setNow(new Date()), TICK_MS)
    }
    const stop = () => {
      if (timer === null) return
      window.clearInterval(timer)
      timer = null
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date())
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return now
}
