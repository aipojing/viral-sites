import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, closeChain, createChain, deleteChain, getChain, redactChain, submitBaton } from './api-client'
import type { PublicChain } from '../../worker/types'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const CHAIN = {
  slug: 'abcd1234abcd1234',
  status: 'waiting',
  nextSlot: 2,
  entries: [],
  createdAt: 1,
  updatedAt: 1,
  expiresAt: 2,
} satisfies PublicChain

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('api-client 请求形态', () => {
  it('createChain 使用同源相对路径、JSON 与 requestId，不带 Authorization', async () => {
    const fetchMock = stubFetch(() => jsonResponse(201, { chain: CHAIN, ownerToken: 'o', batonToken: 'b' }))
    const input = {
      requestId: crypto.randomUUID(),
      installationId: crypto.randomUUID(),
      nickname: '甲',
      question: '你好吗？',
    }
    const result = await createChain(input)
    expect(result.ownerToken).toBe('o')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/next-question/chains')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers['content-type']).toContain('application/json')
    expect(headers.authorization).toBeUndefined()
    expect(JSON.parse(init?.body as string)).toEqual(input)
  })

  it('submitBaton/close/redact/delete 携带 Bearer token 与 requestId', async () => {
    const fetchMock = stubFetch(async (url: string) => {
      if (url.endsWith('/baton')) {
        return jsonResponse(200, { chain: CHAIN, participantToken: 'p', nextBatonToken: 'n' })
      }
      if (url.endsWith('/close')) return jsonResponse(200, CHAIN)
      if (url.endsWith('/redact')) return jsonResponse(200, CHAIN)
      return new Response(null, { status: 204 })
    })

    await submitBaton(CHAIN.slug, 'baton-token', {
      requestId: crypto.randomUUID(),
      nickname: '乙',
      answer: '回答',
      question: '下一问',
    })
    await closeChain(CHAIN.slug, 'owner-token', { requestId: crypto.randomUUID(), answer: '收尾' })
    await redactChain(CHAIN.slug, 'p-token', { requestId: crypto.randomUUID(), slot: 2 })
    const deleteRequestId = crypto.randomUUID()
    await deleteChain(CHAIN.slug, 'owner-token', deleteRequestId)

    const calls = fetchMock.mock.calls
    expect(calls[0][1]?.headers).toMatchObject({ authorization: 'Bearer baton-token' })
    expect(calls[1][1]?.headers).toMatchObject({ authorization: 'Bearer owner-token' })
    expect(calls[2][1]?.headers).toMatchObject({ authorization: 'Bearer p-token' })
    expect(calls[3][1]?.headers).toMatchObject({ authorization: 'Bearer owner-token' })
    expect(JSON.parse(calls[3][1]?.body as string)).toEqual({ requestId: deleteRequestId })
    for (const [, init] of calls) {
      expect(JSON.parse(init?.body as string).requestId).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it('getChain 是纯 GET，不带 body 与 Authorization', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, CHAIN))
    const chain = await getChain(CHAIN.slug)
    expect(chain).toEqual(CHAIN)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`/api/next-question/chains/${CHAIN.slug}`)
    expect(init?.method ?? 'GET').toBe('GET')
    expect((init?.headers as Record<string, string> | undefined)?.authorization).toBeUndefined()
    expect(init?.body).toBeUndefined()
  })
})

describe('api-client 错误映射', () => {
  it.each([
    [400, 'validation_failed'],
    [403, 'invalid_token'],
    [404, 'chain_not_found'],
    [409, 'chain_advanced'],
    [410, 'chain_expired'],
    [410, 'chain_cancelled'],
    [429, 'rate_limited'],
  ] as const)('%i %s 抛 ApiError', async (status, code) => {
    stubFetch(() => jsonResponse(status, { code }))
    try {
      await getChain(CHAIN.slug)
      throw new Error('不应成功')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(status)
      expect((error as ApiError).code).toBe(code)
      expect((error as Error).message).toBe(code)
    }
  })

  it('非 JSON 错误响应映射为 invalid_response', async () => {
    stubFetch(() => new Response('<html>oops</html>', { status: 500 }))
    await expect(getChain(CHAIN.slug)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('断网（fetch 抛错）映射为 network_error', async () => {
    stubFetch(() => {
      throw new TypeError('failed to fetch')
    })
    await expect(getChain(CHAIN.slug)).rejects.toMatchObject({ status: 0, code: 'network_error' })
  })

  it('10 秒超时映射为 timeout', async () => {
    vi.useFakeTimers()
    stubFetch(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          )
        }),
    )
    const promise = getChain(CHAIN.slug)
    const assertion = expect(promise).rejects.toMatchObject({ status: 0, code: 'timeout' })
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion
  })
})
