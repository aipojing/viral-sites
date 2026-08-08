import { describe, expect, it, vi } from 'vitest'
import worker from './index'
import type { PortalEnv } from './env'

function makeEnv(assetResponse = new Response('asset', { status: 200 })) {
  const fetchMock = vi.fn<(input: Request | string | URL, init?: RequestInit) => Promise<Response>>(
    async () => assetResponse,
  )
  const env = { ASSETS: { fetch: fetchMock } } as unknown as PortalEnv
  return { env, fetchMock }
}

const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext

describe('portal worker entry', () => {
  it('未知 API 返回 JSON 404，不回退静态资产', async () => {
    const { env, fetchMock } = makeEnv()

    const response = await worker.fetch(new Request('https://example.com/api/nope'), env, ctx)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'not_found' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('尚未接入的玩法 API 返回 503 feature_unavailable', async () => {
    const { env } = makeEnv()

    const judge = await worker.fetch(new Request('https://example.com/api/ai-judge/verdict'), env, ctx)
    expect(judge.status).toBe(503)
    expect(await judge.json()).toEqual({ code: 'feature_unavailable', feature: 'ai-judge' })

    const hold = await worker.fetch(new Request('https://example.com/api/hold-button/session'), env, ctx)
    expect(hold.status).toBe(503)
    expect(await hold.json()).toEqual({ code: 'feature_unavailable', feature: 'hold-button' })
  })

  it('深链接改写为玩法页并保留 query 后交给静态资产', async () => {
    const { env, fetchMock } = makeEnv()

    await worker.fetch(new Request('https://example.com/tacit-test/c?d=abc'), env, ctx)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const forwarded = fetchMock.mock.calls[0][0] as Request
    expect(forwarded.url).toContain('/tacit-test/')
    expect(new URL(forwarded.url).pathname).toBe('/tacit-test/')
    expect(new URL(forwarded.url).searchParams.get('d')).toBe('abc')
  })

  it('普通路径直接交给静态资产', async () => {
    const { env, fetchMock } = makeEnv()

    const response = await worker.fetch(new Request('https://example.com/life-grid/'), env, ctx)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await response.text()).toBe('asset')
  })
})
