import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTestChain } from './durable-object-testkit'
import { bearerToken, handleNextQuestionApi, slugForRequestId } from './api'
import type { NextQuestionChain } from './question-chain'
import type { NextQuestionEnv } from './env'
import type { CreateChainResult, SubmitBatonResult } from './types'

const ORIGIN = 'https://guaihaowan.example'

interface FakeNamespace {
  idFromName(name: string): { toString(): string }
  get(id: { toString(): string }): NextQuestionChain
  instances: Map<string, NextQuestionChain>
}

function makeFakeNamespace(): FakeNamespace {
  const instances = new Map<string, NextQuestionChain>()
  return {
    instances,
    idFromName: (name) => ({ toString: () => name }),
    get: (id) => {
      const key = id.toString()
      let chain = instances.get(key)
      if (!chain) {
        chain = makeTestChain().chain
        instances.set(key, chain)
      }
      return chain
    },
  }
}

interface HarnessOptions {
  limitSuccess?: boolean
  ip?: string
}

function makeHarness(options: HarnessOptions = {}) {
  const namespace = makeFakeNamespace()
  const limit = vi.fn(
    async (_options: { key: string }) => ({ success: options.limitSuccess ?? true }),
  )
  const env = {
    NEXT_QUESTION_CHAINS: namespace,
    NEXT_QUESTION_CREATE_LIMITER: { limit },
  } as unknown as NextQuestionEnv
  const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext
  const headers = options.ip === undefined ? {} : { 'cf-connecting-ip': options.ip }
  return {
    namespace,
    limit,
    call(method: string, path: string, body?: unknown, token?: string) {
      const init: RequestInit = { method, headers: { ...(headers as Record<string, string>) } }
      if (body !== undefined) {
        ;(init.headers as Record<string, string>)['content-type'] = 'application/json'
        init.body = typeof body === 'string' ? body : JSON.stringify(body)
      }
      if (token !== undefined) {
        ;(init.headers as Record<string, string>).authorization = `Bearer ${token}`
      }
      return handleNextQuestionApi(new Request(`${ORIGIN}${path}`, init), env, ctx)
    },
  }
}

function createBody(overrides: Record<string, unknown> = {}) {
  return {
    requestId: crypto.randomUUID(),
    installationId: crypto.randomUUID(),
    nickname: '甲',
    question: '你最近在想什么？',
    ...overrides
  }
}

async function createChain(harness: ReturnType<typeof makeHarness>, overrides: Record<string, unknown> = {}) {
  const body = createBody(overrides)
  const response = await harness.call('POST', '/api/next-question/chains', body)
  expect(response.status).toBe(201)
  const result = (await response.json()) as CreateChainResult
  return { body, result }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('slugForRequestId', () => {
  it('同一 requestId 得到同一 16 位 base64url slug', async () => {
    const requestId = crypto.randomUUID()
    const first = await slugForRequestId(requestId)
    const second = await slugForRequestId(requestId)
    expect(first).toBe(second)
    expect(first).toMatch(/^[A-Za-z0-9_-]{16}$/)
    expect(await slugForRequestId(crypto.randomUUID())).not.toBe(first)
  })
})

describe('bearerToken', () => {
  it('只从 Authorization: Bearer 读取', () => {
    expect(bearerToken(new Request(ORIGIN, { headers: { authorization: 'Bearer abc' } }))).toBe('abc')
    expect(bearerToken(new Request(ORIGIN, { headers: { authorization: 'abc' } }))).toBeNull()
    expect(bearerToken(new Request(ORIGIN))).toBeNull()
    expect(bearerToken(new Request(ORIGIN, { headers: { authorization: 'Bearer ' } }))).toBeNull()
  })
})

describe('POST /api/next-question/chains', () => {
  it('创建成功返回 201、链条状态与两枚 capability', async () => {
    const harness = makeHarness({ ip: '203.0.113.7' })
    const { body, result } = await createChain(harness)
    const slug = await slugForRequestId(body.requestId as string)
    expect(result.chain.slug).toBe(slug)
    expect(result.chain.status).toBe('waiting')
    expect(result.chain.nextSlot).toBe(2)
    expect(result.ownerToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(result.batonToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(harness.limit).toHaveBeenCalledTimes(1)
    // 限流 key 绝不能回显原始 IP
    const key = harness.limit.mock.calls[0][0].key
    expect(key).not.toContain('203.0.113.7')
  })

  it('相同 requestId 幂等：同一 slug、同一结果，不创建第二条链', async () => {
    const harness = makeHarness()
    const body = createBody()
    const first = await createChain(harness, body)
    const second = await createChain(harness, { ...body, nickname: '另一个昵称' })
    expect(second.result).toEqual(first.result)
    expect(harness.namespace.instances.size).toBe(1)
  })

  it('拒绝非 RFC 4122 requestId、缺失字段与非法 JSON', async () => {
    const harness = makeHarness()
    const badId = await harness.call('POST', '/api/next-question/chains', createBody({ requestId: 'nope' }))
    expect(badId.status).toBe(400)
    expect(await badId.json()).toEqual({ code: 'validation_failed' })

    const missing = await harness.call('POST', '/api/next-question/chains', { requestId: crypto.randomUUID() })
    expect(missing.status).toBe(400)

    const badJson = await harness.call('POST', '/api/next-question/chains', '{oops')
    expect(badJson.status).toBe(400)
    expect(await badJson.json()).toEqual({ code: 'validation_failed' })
  })

  it('拒绝超过 16KB 的请求体', async () => {
    const harness = makeHarness()
    const huge = createBody({ question: '问'.repeat(20000) })
    const response = await harness.call('POST', '/api/next-question/chains', huge)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ code: 'validation_failed' })
  })

  it('限流命中时返回 429 且不创建链', async () => {
    const harness = makeHarness({ limitSuccess: false, ip: '203.0.113.9' })
    const response = await harness.call('POST', '/api/next-question/chains', createBody())
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ code: 'rate_limited' })
    expect(harness.namespace.instances.size).toBe(0)
  })

  it('创建接口只接受 POST', async () => {
    const harness = makeHarness()
    const response = await harness.call('GET', '/api/next-question/chains')
    expect(response.status).toBe(405)
    expect(await response.json()).toEqual({ code: 'method_not_allowed' })
  })
})

describe('链条读取与提交接口', () => {
  it('GET 返回脱敏公开状态，不需要 token，也不接受 token', async () => {
    const harness = makeHarness()
    const { result } = await createChain(harness)
    const slug = result.chain.slug

    const publicResponse = await harness.call('GET', `/api/next-question/chains/${slug}`)
    expect(publicResponse.status).toBe(200)
    const chain = await publicResponse.json()
    expect(chain).toEqual(result.chain)
    expect(JSON.stringify(chain)).not.toContain(result.ownerToken)

    const withToken = await harness.call('GET', `/api/next-question/chains/${slug}`, undefined, 'whatever')
    expect(withToken.status).toBe(200)
  })

  it('未知 slug 返回 404 chain_not_found', async () => {
    const harness = makeHarness()
    const response = await harness.call('GET', '/api/next-question/chains/zzzz1111zzzz1111')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'chain_not_found' })
  })

  it('baton 提交成功返回下一棒 token；缺 token 403；错误 token 403；已推进 409', async () => {
    const harness = makeHarness()
    const { result } = await createChain(harness)
    const slug = result.chain.slug
    const submit = {
      requestId: crypto.randomUUID(),
      nickname: '乙',
      answer: '在想一个人。',
      question: '那你呢？',
    }

    const missing = await harness.call('POST', `/api/next-question/chains/${slug}/baton`, submit)
    expect(missing.status).toBe(403)
    expect(await missing.json()).toEqual({ code: 'invalid_token' })

    const wrong = await harness.call('POST', `/api/next-question/chains/${slug}/baton`, submit, 'x'.repeat(43))
    expect(wrong.status).toBe(403)

    const ok = await harness.call('POST', `/api/next-question/chains/${slug}/baton`, submit, result.batonToken)
    expect(ok.status).toBe(200)
    const advanced = (await ok.json()) as SubmitBatonResult
    expect(advanced.chain.nextSlot).toBe(3)
    expect(advanced.nextBatonToken).toMatch(/^[A-Za-z0-9_-]{43}$/)

    const replay = await harness.call(
      'POST',
      `/api/next-question/chains/${slug}/baton`,
      { ...submit, requestId: crypto.randomUUID() },
      result.batonToken,
    )
    expect(replay.status).toBe(409)
    expect(await replay.json()).toEqual({ code: 'chain_advanced' })
  })

  it('close/redact/delete 缺少 capability 一律 403', async () => {
    const harness = makeHarness()
    const { result } = await createChain(harness)
    const slug = result.chain.slug

    for (const path of ['close', 'redact'] as const) {
      const missing = await harness.call('POST', `/api/next-question/chains/${slug}/${path}`, {
        requestId: crypto.randomUUID(),
        answer: '收尾',
      })
      expect(missing.status).toBe(403)
    }
    const missingDelete = await harness.call('DELETE', `/api/next-question/chains/${slug}`, {
      requestId: crypto.randomUUID(),
    })
    expect(missingDelete.status).toBe(403)
  })

  it('returned 状态下非 owner token 不能收尾；删除不接受 baton token，错误响应不回显 token', async () => {
    const harness = makeHarness()
    const { result } = await createChain(harness)
    const slug = result.chain.slug
    await advanceToReturned(harness, slug, result.batonToken)

    const wrongClose = await harness.call(
      'POST',
      `/api/next-question/chains/${slug}/close`,
      { requestId: crypto.randomUUID(), answer: '收尾' },
      'x'.repeat(43),
    )
    expect(wrongClose.status).toBe(403)
    expect(await wrongClose.json()).toEqual({ code: 'invalid_token' })

    const wrongDelete = await harness.call('DELETE', `/api/next-question/chains/${slug}`, {
      requestId: crypto.randomUUID(),
    }, 'x'.repeat(43))
    expect(wrongDelete.status).toBe(403)
    expect(JSON.stringify(await wrongDelete.json())).not.toContain('x'.repeat(43))
  })

  async function advanceToReturned(harness: ReturnType<typeof makeHarness>, slug: string, firstBaton: string) {
    let token = firstBaton
    for (let slot = 2; slot <= 6; slot += 1) {
      const response = await harness.call(
        'POST',
        `/api/next-question/chains/${slug}/baton`,
        {
          requestId: crypto.randomUUID(),
          nickname: `第${slot}席`,
          answer: '一个回答。',
          question: `第${slot}席的问题`,
        },
        token,
      )
      expect(response.status).toBe(200)
      const advanced = (await response.json()) as SubmitBatonResult
      if (slot === 6) {
        expect(advanced.chain.status).toBe('returned')
        expect(advanced.nextBatonToken).toBeNull()
        return
      }
      token = advanced.nextBatonToken as string
    }
    throw new Error('未能推进到 returned')
  }

  it('redact 需要合法 slot；删除后 GET 得到 deleted 空 tombstone', async () => {
    const harness = makeHarness()
    const { result } = await createChain(harness)
    const slug = result.chain.slug

    const badSlot = await harness.call(
      'POST',
      `/api/next-question/chains/${slug}/redact`,
      { requestId: crypto.randomUUID(), slot: 9 },
      result.ownerToken,
    )
    expect(badSlot.status).toBe(400)
    expect(await badSlot.json()).toEqual({ code: 'validation_failed' })

    const okRedact = await harness.call(
      'POST',
      `/api/next-question/chains/${slug}/redact`,
      { requestId: crypto.randomUUID(), slot: 1 },
      result.ownerToken,
    )
    expect(okRedact.status).toBe(200)
    expect(((await okRedact.json()) as { status: string }).status).toBe('cancelled')

    const deleted = await harness.call(
      'DELETE',
      `/api/next-question/chains/${slug}`,
      { requestId: crypto.randomUUID() },
      result.ownerToken,
    )
    expect(deleted.status).toBe(204)

    const after = await harness.call('GET', `/api/next-question/chains/${slug}`)
    expect(after.status).toBe(200)
    const chain = (await after.json()) as { status: string; entries: unknown[] }
    expect(chain.status).toBe('deleted')
    expect(chain.entries).toEqual([])
  })

  it('未知子路由返回 JSON 404，绝不回退 HTML；方法不允许返回 405', async () => {
    const harness = makeHarness()
    const unknown = await harness.call('GET', '/api/next-question/nope')
    expect(unknown.status).toBe(404)
    expect(unknown.headers.get('content-type')).toContain('application/json')

    const harness2 = makeHarness()
    const { result } = await createChain(harness2)
    const method = await harness2.call('PUT', `/api/next-question/chains/${result.chain.slug}/baton`, {})
    expect(method.status).toBe(405)
  })
})

describe('API 响应安全头', () => {
  it('所有响应携带 Cache-Control: no-store 与 JSON content-type', async () => {
    const harness = makeHarness()
    const created = await harness.call('POST', '/api/next-question/chains', createBody())
    const slug = ((await created.clone().json()) as CreateChainResult).chain.slug

    const responses = [
      created,
      await harness.call('GET', `/api/next-question/chains/${slug}`),
      await harness.call('GET', '/api/next-question/chains/zzzz1111zzzz1111'),
      await harness.call('POST', `/api/next-question/chains/${slug}/baton`, { requestId: crypto.randomUUID() }),
    ]
    for (const response of responses) {
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('content-type')).toContain('application/json')
    }
  })
})
