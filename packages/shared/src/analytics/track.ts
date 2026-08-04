type UmamiGlobal = { track: (event: string, data?: Record<string, unknown>) => void }

declare global {
  interface Window {
    umami?: UmamiGlobal
  }
}

export function track(event: string, data?: Record<string, string | number>): void {
  try {
    if (typeof window === 'undefined') return
    if (window.umami?.track) {
      window.umami.track(event, data)
    } else {
      console.debug('[track]', event, data ?? {})
    }
  } catch {
    // 埋点失败绝不影响业务
  }
}
