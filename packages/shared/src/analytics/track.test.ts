import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as analytics from './track'

describe('track', () => {
  const sendBeacon = vi.fn<(url: string | URL, data?: BodyInit | null) => boolean>()

  beforeEach(() => {
    sessionStorage.clear()
    sendBeacon.mockReturnValue(true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('把产品事件发给同源接口，并只携带路径、来源域名和会话标识', () => {
    analytics.track('generate', { from: 'test' })

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/events')
    expect(JSON.parse(String(sendBeacon.mock.calls[0][1]))).toMatchObject({
      event: 'generate',
      data: { from: 'test' },
      path: '/',
      referrer: '',
      sessionId: expect.any(String),
    })
  })

  it('sendBeacon 不可用时降级为 keepalive fetch', () => {
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: undefined })
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchSpy)

    analytics.track('save_image')

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({ method: 'POST', keepalive: true, credentials: 'omit' }),
    )
  })

  it('浏览器发送能力抛错时静默吞掉', () => {
    sendBeacon.mockImplementation(() => {
      throw new Error('boom')
    })
    vi.stubGlobal('fetch', () => {
      throw new Error('boom')
    })

    expect(() => analytics.track('save_image')).not.toThrow()
  })

  it('初始化时只上报一次 page_view', () => {
    expect(typeof analytics.startAnalytics).toBe('function')
    analytics.startAnalytics()
    analytics.startAnalytics()

    const events = sendBeacon.mock.calls.map(([, body]) => JSON.parse(String(body)).event)
    expect(events).toEqual(['page_view'])
  })
})
