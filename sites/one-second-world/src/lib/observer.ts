/**
 * 视口观察器抽象：生产环境用 IntersectionObserver，
 * 测试可注入 stub；无 IntersectionObserver 的环境降级为常显。
 */
export interface ViewObserver {
  observe: (element: Element) => void
  disconnect: () => void
}

export type ObserverFactory = (onIntersectingChange: (intersecting: boolean) => void) => ViewObserver

export const defaultObserverFactory: ObserverFactory = (onIntersectingChange) => {
  if (typeof IntersectionObserver === 'undefined') {
    // 降级：无法观察视口时视为常显，保证内容可用
    onIntersectingChange(true)
    return { observe: () => {}, disconnect: () => {} }
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        onIntersectingChange(entry.isIntersecting)
      }
    },
    { threshold: 0.25 },
  )
  return {
    observe: (element) => observer.observe(element),
    disconnect: () => observer.disconnect(),
  }
}
