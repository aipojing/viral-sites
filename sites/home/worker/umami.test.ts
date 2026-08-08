import { afterEach, describe, expect, it, vi } from 'vitest'
import { proxyUmami, UMAMI_ENDPOINT } from './umami'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

type FetchSignature = (input: Request | string | URL, init?: RequestInit) => Promise<Response>

function mockFetch(implementation: FetchSignature) {
  const fetchMock = vi.fn<FetchSignature>(implementation)
  globalThis.fetch = fetchMock
  return fetchMock
}

function makePostRequest(headers: Record<string, string> = {}) {
  return new Request('https://example.com/api/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: '{"type":"event"}',
  })
}

describe('proxyUmami', () => {
  it('只接受 POST，其余方法返回 405', async () => {
    const response = await proxyUmami(new Request('https://example.com/api/send'))
    expect(response.status).toBe(405)
  })

  it('只转发白名单 header，其余一律丢弃', async () => {
    const fetchMock = mockFetch(async () => new Response('{}', { status: 200 }))

    await proxyUmami(
      makePostRequest({
        'user-agent': 'test-agent',
        'x-umami-website-id': 'website-id',
        'x-umami-hostname': 'guaihaowan.example',
        cookie: 'session=secret',
        authorization: 'Bearer token',
      }),
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [endpoint, init] = fetchMock.mock.calls[0]
    expect(endpoint).toBe(UMAMI_ENDPOINT)
    const forwarded = (init as RequestInit).headers as Record<string, string>
    expect(forwarded['content-type']).toBe('application/json')
    expect(forwarded['user-agent']).toBe('test-agent')
    expect(forwarded['x-umami-website-id']).toBe('website-id')
    expect(forwarded['x-umami-hostname']).toBe('guaihaowan.example')
    expect(forwarded['cookie']).toBeUndefined()
    expect(forwarded['authorization']).toBeUndefined()
    expect(init as RequestInit).toMatchObject({ method: 'POST' })
  })

  it('附带客户端 IP 作为 x-forwarded-for', async () => {
    const fetchMock = mockFetch(async () => new Response('{}', { status: 200 }))

    const request = makePostRequest({ 'cf-connecting-ip': '203.0.113.7' })
    await proxyUmami(request)

    const forwarded = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(forwarded['x-forwarded-for']).toBe('203.0.113.7')
  })

  it('原样转发请求体', async () => {
    const fetchMock = mockFetch(async () => new Response('{}', { status: 200 }))

    await proxyUmami(makePostRequest())

    expect(await new Request('https://x', fetchMock.mock.calls[0][1] as RequestInit).text()).toBe(
      '{"type":"event"}',
    )
  })

  it('上游失败返回 202 空响应，不阻断玩法', async () => {
    mockFetch(async () => {
      throw new Error('network unreachable')
    })

    const response = await proxyUmami(makePostRequest())

    expect(response.status).toBe(202)
    expect(await response.text()).toBe('')
  })
})
