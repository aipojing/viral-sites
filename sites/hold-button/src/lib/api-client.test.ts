import { afterEach, describe, expect, it, vi } from 'vitest'
import { HoldApiError, createHoldApi } from './api-client'

const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('hold-button api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('start 解析合法会话响应', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock.mockResolvedValue(
        jsonResponse(200, { token: 'a.b', startedAt: 1, expiresAt: 2, todayCount: 3 }),
      ),
    )
    const api = createHoldApi()
    const result = await api.start('touch')
    expect(result).toEqual({ token: 'a.b', startedAt: 1, expiresAt: 2, todayCount: 3 })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/hold-button/session')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ deviceType: 'touch' })
  })

  it('start 不信任非法 JSON：缺字段或类型错误都映射为 error', async () => {
    for (const body of [{ token: 'a.b' }, { token: 5, startedAt: 1, expiresAt: 2, todayCount: 3 }]) {
      vi.stubGlobal('fetch', fetchMock.mockResolvedValueOnce(jsonResponse(200, body)))
      const api = createHoldApi()
      await expect(api.start('touch')).rejects.toMatchObject({ code: 'error' })
    }
  })

  it('finish 解析合法成绩响应', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock.mockResolvedValue(
        jsonResponse(200, { durationMs: 5_000, durationBucket: 5, percentile: 40, trusted: true }),
      ),
    )
    const api = createHoldApi()
    const result = await api.finish('token', 5_100)
    expect(result).toEqual({ durationMs: 5_000, durationBucket: 5, percentile: 40, trusted: true })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/hold-button/finish')
    expect(JSON.parse(init.body as string)).toEqual({ token: 'token', clientDurationMs: 5_100 })
  })

  it('finish 允许 percentile 为 null', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock.mockResolvedValue(
        jsonResponse(200, { durationMs: 5_000, durationBucket: 5, percentile: null, trusted: true }),
      ),
    )
    const api = createHoldApi()
    expect((await api.finish('t', 5_000)).percentile).toBeNull()
  })

  it('非 2xx 解析为稳定 HoldApiError { status, code }', async () => {
    vi.stubGlobal('fetch', fetchMock.mockResolvedValue(jsonResponse(503, { code: 'scores_disabled' })))
    const api = createHoldApi()
    await expect(api.start('touch')).rejects.toMatchObject({ status: 503, code: 'scores_disabled' })

    vi.stubGlobal('fetch', fetchMock.mockResolvedValue(jsonResponse(409, { code: 'duplicate_submit' })))
    await expect(api.finish('t', 1)).rejects.toMatchObject({ status: 409, code: 'duplicate_submit' })

    // 错误体不是 JSON 时 code 稳定为 'error'
    vi.stubGlobal('fetch', fetchMock.mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(api.finish('t', 1)).rejects.toMatchObject({ status: 500, code: 'error' })
  })

  it('网络错误与 abort 都转为 HoldApiError', async () => {
    vi.stubGlobal('fetch', fetchMock.mockRejectedValue(new TypeError('network down')))
    const api = createHoldApi()
    await expect(api.start('desktop')).rejects.toBeInstanceOf(HoldApiError)

    const abortError = new DOMException('aborted', 'AbortError')
    vi.stubGlobal('fetch', fetchMock.mockRejectedValue(abortError))
    await expect(api.finish('t', 1)).rejects.toMatchObject({ code: 'aborted' })
  })

  it('透传外部 AbortSignal', async () => {
    vi.stubGlobal('fetch', fetchMock.mockResolvedValue(jsonResponse(200, { token: 'a.b', startedAt: 1, expiresAt: 2, todayCount: 0 })))
    const controller = new AbortController()
    const api = createHoldApi()
    await api.start('touch', controller.signal)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })
})
