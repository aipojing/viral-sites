const ANALYTICS_ENDPOINT = '/api/events'
const SESSION_STORAGE_KEY = 'viral_analytics_session'

let memorySessionId = ''
let started = false

function createSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

function getSessionId(): string {
  if (memorySessionId) return memorySessionId
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) return (memorySessionId = stored)
    memorySessionId = createSessionId()
    sessionStorage.setItem(SESSION_STORAGE_KEY, memorySessionId)
    return memorySessionId
  } catch {
    return (memorySessionId = createSessionId())
  }
}

function getReferrerHost(): string {
  if (!document.referrer) return ''
  try {
    return new URL(document.referrer).hostname
  } catch {
    return ''
  }
}

export function track(event: string, data?: Record<string, string | number>): void {
  try {
    if (typeof window === 'undefined') return
    const body = JSON.stringify({
      event,
      data,
      path: window.location.pathname,
      referrer: getReferrerHost(),
      sessionId: getSessionId(),
    })
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(ANALYTICS_ENDPOINT, body)) {
      return
    }
    void fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {})
  } catch {
    // 埋点失败绝不影响业务
  }
}

export function startAnalytics(): void {
  if (started || typeof window === 'undefined') return
  started = true
  track('page_view')
}
