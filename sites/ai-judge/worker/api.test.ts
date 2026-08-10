import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleVerdictRequest } from './api'
import { cacheKey } from './cache'
import type { AiJudgeEnv } from './env'
import type { JudgeGate } from './judge-gate'
import { normalizeJudgeInput } from './normalize'
import type { Verdict, VerdictResponse } from './types'

const DAILY_ID = '3f2c9a1e-8b4d-4c6e-9f0a-1b2c3d4e5f60'

const MODEL_VERDICT: Verdict = {
  crime: '拖延成瘾罪',
  verdict:
    '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零，收藏的教程从未打开第二次。本官念其态度尚可。',
  sentence: '判处早睡三个月，缓期执行',
  seal: '赛博衙门 · 即日生效',
}

const UNSAFE_VERDICT: Verdict = { ...MODEL_VERDICT, sentence: '判处弄死你' }

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext

function baseEnv(overrides: Partial<AiJudgeEnv> = {}): AiJudgeEnv {
  return {
    AI_LLM_API_KEY: 'sk-test',
    AI_LLM_BASE_URL: 'https://llm.example/v1',
    AI_LLM_MODEL: 'test-model',
    AI_IDENTITY_SECRET: 'identity-secret',
    AI_DAILY_BUDGET_FEN: '5000',
    AI_INPUT_CNY_PER_MILLION: '2',
    AI_OUTPUT_CNY_PER_MILLION: '8',
    ...overrides,
  } as AiJudgeEnv
}

function verdictBody(nickname = '阿福', intro = '爱熬夜'): string {
  return JSON.stringify({ nickname, intro, dailyId: DAILY_ID })
}

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/ai-judge/verdict', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
}

/** mock 一个 OpenAI-compatible 上游 */
function mockProvider(outputs: string[], status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation(async () => {
    const content = outputs.shift() ?? outputs[outputs.length - 1] ?? '{}'
    if (!status.toString().startsWith('2')) return new Response('busy', { status })
    return new Response(
      JSON.stringify({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 200, completion_tokens: 120 },
      }),
      { status: 200 },
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function fakeGate(behavior: Partial<Record<'authorize' | 'reserveBudget', unknown>> = {}) {
  const authorize = behavior.authorize instanceof Error
    ? vi.fn().mockRejectedValue(behavior.authorize)
    : vi.fn().mockResolvedValue(behavior.authorize ?? { ok: true })
  const reserveBudget = behavior.reserveBudget instanceof Error
    ? vi.fn().mockRejectedValue(behavior.reserveBudget)
    : vi.fn().mockResolvedValue(behavior.reserveBudget ?? { ok: true, reservationId: 'res-1', budgetRatio: 0.01 })
  return {
    authorize,
    reserveBudget,
    settle: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  }
}

function fakeNamespace(gate: unknown): DurableObjectNamespace<JudgeGate> {
  return { idFromName: () => 'id', get: () => gate } as unknown as DurableObjectNamespace<JudgeGate>
}

function fakeKv() {
  const store = new Map<string, string>()
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
  } as unknown as KVNamespace & { store: Map<string, string> }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('handleVerdictRequest', () => {
  it('成功链路：模型判词 → 结算 → 写缓存', async () => {
    const fetchMock = mockProvider([JSON.stringify(MODEL_VERDICT)])
    const gate = fakeGate()
    const kv = fakeKv()
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate), AI_VERDICT_CACHE: kv })

    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ verdict: MODEL_VERDICT, source: 'model' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(gate.authorize).toHaveBeenCalledTimes(1)
    expect(gate.settle).toHaveBeenCalledWith('res-1', expect.any(Number))
    expect(kv.put).toHaveBeenCalledTimes(1)
  })

  it('缓存命中：占次数、不占预算、不请求模型', async () => {
    const gate = fakeGate()
    const kv = fakeKv()
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate), AI_VERDICT_CACHE: kv })
    const normalized = normalizeJudgeInput(JSON.parse(verdictBody()))
    const key = await cacheKey(normalized, 'identity-secret')
    kv.store.set(key, JSON.stringify(MODEL_VERDICT))

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ verdict: MODEL_VERDICT, source: 'cache' })
    expect(gate.authorize).toHaveBeenCalledTimes(1)
    expect(gate.reserveBudget).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('预算暂停但命中缓存：仍返回安全缓存', async () => {
    const gate = fakeGate({ reserveBudget: { ok: false, reason: 'budget_paused', budgetRatio: 1 } })
    const kv = fakeKv()
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate), AI_VERDICT_CACHE: kv })
    const normalized = normalizeJudgeInput(JSON.parse(verdictBody()))
    kv.store.set(await cacheKey(normalized, 'identity-secret'), JSON.stringify(MODEL_VERDICT))

    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    expect((await response.json() as VerdictResponse).source).toBe('cache')
  })

  it('预算暂停且无缓存：503 court_closed，不伪装结果', async () => {
    const gate = fakeGate({ reserveBudget: { ok: false, reason: 'budget_paused', budgetRatio: 1 } })
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate) })
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'court_closed' })
  })

  it('每日次数超限：429 rate_limited', async () => {
    const gate = fakeGate({ authorize: { ok: false, reason: 'rate_limited' } })
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate) })
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ code: 'rate_limited' })
  })

  it('外层限流触发：429', async () => {
    const limiter = { limit: vi.fn().mockResolvedValue({ success: false }) } as unknown as RateLimit
    const env = baseEnv({ AI_REQUEST_LIMITER: limiter })
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ code: 'rate_limited' })
  })

  it('外层限流以服务端匿名 IP 桶计数，换 dailyId 不会绕过', async () => {
    const limiter = { limit: vi.fn().mockResolvedValue({ success: true }) } as unknown as RateLimit
    const env = baseEnv({ AI_REQUEST_LIMITER: limiter, AI_LLM_API_KEY: undefined })
    await handleVerdictRequest(post(verdictBody('阿福', '爱熬夜'), { 'cf-connecting-ip': '203.0.113.8' }), env, ctx)
    await handleVerdictRequest(
      post(JSON.stringify({ nickname: '阿福', intro: '爱熬夜', dailyId: '4f2c9a1e-8b4d-4c6e-9f0a-1b2c3d4e5f61' }), {
        'cf-connecting-ip': '203.0.113.8',
      }),
      env,
      ctx,
    )
    const keys = (limiter.limit as ReturnType<typeof vi.fn>).mock.calls.map(([arg]) => arg.key)
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    expect(keys[0]).not.toContain(DAILY_ID)
  })

  it.each([
    ['缺少 gate binding', { AI_JUDGE_GATE: undefined }],
    ['缺少 identity secret', { AI_IDENTITY_SECRET: undefined }],
  ])('真实 provider 配置时%s关闭法庭且不调用模型', async (_label, overrides) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await handleVerdictRequest(post(verdictBody()), baseEnv(overrides), ctx)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'court_closed' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['authorize', 'reserveBudget'] as const)('gate 的 %s 故障时关闭法庭且不调用模型', async (method) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const gate = fakeGate({ [method]: new Error('gate unavailable') })
    const response = await handleVerdictRequest(post(verdictBody()), baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate) }), ctx)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'court_closed' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('输入命中禁区：422 case_refused，不调用模型', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const env = baseEnv()
    const response = await handleVerdictRequest(
      post(JSON.stringify({ nickname: '傻逼本逼', dailyId: DAILY_ID })),
      env,
      ctx,
    )
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ code: 'case_refused' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('非法输入返回 400 及具体原因', async () => {
    const env = baseEnv()
    const invalidJson = await handleVerdictRequest(post('不是 JSON'), env, ctx)
    expect(invalidJson.status).toBe(400)

    const missingDailyId = await handleVerdictRequest(
      post(JSON.stringify({ nickname: '阿福' })),
      env,
      ctx,
    )
    expect(missingDailyId.status).toBe(400)
    expect(await missingDailyId.json()).toEqual({ code: 'invalid_daily_id' })

    const tooLarge = await handleVerdictRequest(post('x'.repeat(3000), { 'content-length': '3000' }), env, ctx)
    expect(tooLarge.status).toBe(400)
    expect(await tooLarge.json()).toEqual({ code: 'body_too_large' })
  })

  it('schema 失败重试一次后成功', async () => {
    const fetchMock = mockProvider(['这不是 JSON', JSON.stringify(MODEL_VERDICT)])
    const gate = fakeGate()
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate) })

    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    expect((await response.json() as VerdictResponse).source).toBe('model')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('schema 两次失败：fallback 并结算', async () => {
    mockProvider(['坏 JSON', '还是坏 JSON'])
    const gate = fakeGate()
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate) })

    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    const body = (await response.json()) as VerdictResponse
    expect(body.source).toBe('fallback')
    expect(gate.settle).toHaveBeenCalledWith('res-1', expect.any(Number))
  })

  it('输出越界：不返回模型文本，转 fallback', async () => {
    const fetchMock = mockProvider([JSON.stringify(UNSAFE_VERDICT)])
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(fakeGate()) })
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    const body = (await response.json()) as VerdictResponse
    expect(body.source).toBe('fallback')
    expect(JSON.stringify(body)).not.toContain('弄死你')
    expect(fetchMock).toHaveBeenCalledTimes(1) // 不重试轰炸模型
  })

  it('上游 5xx（已响应）：fallback 并按预留上限结算', async () => {
    mockProvider([], 500)
    const gate = fakeGate()
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate) })
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    expect((await response.json() as VerdictResponse).source).toBe('fallback')
    expect(gate.settle).toHaveBeenCalledTimes(1)
    expect(gate.cancel).not.toHaveBeenCalled()
  })

  it('网络失败（未响应）：fallback 并取消预留', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))
    const gate = fakeGate()
    const env = baseEnv({ AI_JUDGE_GATE: fakeNamespace(gate) })
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    expect((await response.json() as VerdictResponse).source).toBe('fallback')
    expect(gate.cancel).toHaveBeenCalledTimes(1)
    expect(gate.settle).not.toHaveBeenCalled()
  })

  it('未配置 LLM key：开发态降级返回 fallback，不请求模型', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const env = baseEnv({ AI_LLM_API_KEY: undefined })
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    const body = (await response.json()) as VerdictResponse
    expect(body.source).toBe('fallback')
    expect(body.verdict).toHaveProperty('crime')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('完全无绑定的开发态：全链路可用', async () => {
    const env = {} as AiJudgeEnv
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    expect(response.status).toBe(200)
    expect((await response.json() as VerdictResponse).source).toBe('fallback')
  })

  it('fallback 与模型判词同 schema，前端可直接渲染', async () => {
    const env = baseEnv({ AI_LLM_API_KEY: undefined })
    const response = await handleVerdictRequest(post(verdictBody()), env, ctx)
    const body = (await response.json()) as VerdictResponse
    for (const field of ['crime', 'verdict', 'sentence', 'seal'] as const) {
      expect(typeof body.verdict[field]).toBe('string')
      expect(body.verdict[field].length).toBeGreaterThan(0)
    }
  })
})
