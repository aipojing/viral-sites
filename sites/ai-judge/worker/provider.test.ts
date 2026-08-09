import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiJudgeEnv } from './env'
import {
  createProvider,
  estimateCostFen,
  ProviderError,
  type ProviderPrices,
} from './provider'
import type { ChatMessage } from './types'

const MESSAGES: readonly ChatMessage[] = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: 'user' },
]

const ENV: Pick<AiJudgeEnv, 'AI_LLM_API_KEY' | 'AI_LLM_BASE_URL' | 'AI_LLM_MODEL'> = {
  AI_LLM_API_KEY: 'sk-test',
  AI_LLM_BASE_URL: 'https://llm.example.com/v1',
  AI_LLM_MODEL: 'test-model',
}

function okBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    choices: [{ message: { content: '{"crime":"拖延成瘾罪"}' } }],
    usage: { prompt_tokens: 200, completion_tokens: 120 },
    ...overrides,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createProvider', () => {
  it('缺少任一配置时拒绝创建', () => {
    expect(() => createProvider({ ...ENV, AI_LLM_API_KEY: undefined })).toThrow(ProviderError)
    expect(() => createProvider({ ...ENV, AI_LLM_BASE_URL: '' })).toThrow(ProviderError)
    expect(() => createProvider({ ...ENV, AI_LLM_MODEL: undefined })).toThrow(ProviderError)
  })

  it('2xx 返回文本与 usage，并携带鉴权与模型配置', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(okBody(), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = createProvider(ENV)
    const result = await provider.generate(MESSAGES, AbortSignal.timeout(5000))

    expect(result.text).toBe('{"crime":"拖延成瘾罪"}')
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 120 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://llm.example.com/v1/chat/completions')
    expect(init.headers.authorization).toBe('Bearer sk-test')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('test-model')
    expect(body.messages).toEqual(MESSAGES)
    expect(body.response_format).toEqual({ type: 'json_object' })
  })

  it('base url 末尾带斜杠也能正确拼接', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(okBody(), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ ...ENV, AI_LLM_BASE_URL: 'https://llm.example.com/v1/' })
    await provider.generate(MESSAGES, AbortSignal.timeout(5000))
    expect(fetchMock.mock.calls[0][0]).toBe('https://llm.example.com/v1/chat/completions')
  })

  it('非 JSON 响应抛 ProviderError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))
    const provider = createProvider(ENV)
    await expect(provider.generate(MESSAGES, AbortSignal.timeout(5000))).rejects.toThrow(
      ProviderError,
    )
  })

  it('usage 缺失抛 ProviderError，不猜测成本', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(okBody({ usage: undefined }), { status: 200 })),
    )
    const provider = createProvider(ENV)
    await expect(provider.generate(MESSAGES, AbortSignal.timeout(5000))).rejects.toThrow(
      ProviderError,
    )
  })

  it('choices 缺失或非字符串 content 抛 ProviderError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ usage: { prompt_tokens: 1, completion_tokens: 1 } }), {
          status: 200,
        }),
      ),
    )
    const provider = createProvider(ENV)
    await expect(provider.generate(MESSAGES, AbortSignal.timeout(5000))).rejects.toThrow(
      ProviderError,
    )
  })

  it('429 与 5xx 分别携带可区分的错误码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('busy', { status: 429 })))
    const provider = createProvider(ENV)
    await expect(provider.generate(MESSAGES, AbortSignal.timeout(5000))).rejects.toMatchObject({
      code: 'rate_limited',
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(provider.generate(MESSAGES, AbortSignal.timeout(5000))).rejects.toMatchObject({
      code: 'upstream_error',
    })
  })

  it('abort 信号透传给 fetch，中止即抛错', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(controller.signal.reason ?? new Error('aborted')))
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider(ENV)
    const pending = provider.generate(MESSAGES, controller.signal)
    controller.abort()
    await expect(pending).rejects.toThrow()
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })
})

describe('estimateCostFen', () => {
  const PRICES: ProviderPrices = { inputCnyPerMillion: 2, outputCnyPerMillion: 8 }

  it('按元/百万 token 计价并折算成分，向上取整', () => {
    // 200 * 2 / 1e6 + 120 * 8 / 1e6 = 0.00136 元 = 0.136 分 → 1 分
    expect(estimateCostFen({ inputTokens: 200, outputTokens: 120 }, PRICES)).toBe(1)
    // 1_000_000 input → 2 元 → 200 分
    expect(estimateCostFen({ inputTokens: 1_000_000, outputTokens: 0 }, PRICES)).toBe(200)
  })

  it('零用量返回 0', () => {
    expect(estimateCostFen({ inputTokens: 0, outputTokens: 0 }, PRICES)).toBe(0)
  })
})
