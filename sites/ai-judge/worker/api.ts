import type { AiJudgeEnv } from './env'
import { fallbackVerdict } from './fallback'
import { dateKeyUTC8, type AuthorizeResult, type ReserveResult } from './judge-gate'
import { JudgeInputError, normalizeJudgeInput, type NormalizedJudgeInput } from './normalize'
import { buildVerdictPrompt } from './prompt'
import { createProvider, estimateCostFen, ProviderError, type ProviderPrices } from './provider'
import { cacheKey, readCachedVerdict, writeCachedVerdict } from './cache'
import { inspectInput, inspectVerdict } from './safety'
import type { Verdict, VerdictResponse } from './types'
import { parseVerdict, VerdictSchemaError } from './verdict-schema'

/** DO 远程调用只需这几个方法，用结构化接口兼容 stub 与测试替身。 */
interface JudgeGateClient {
  authorize(identityHash: string): Promise<AuthorizeResult>
  reserveBudget(maxCostFen: number): Promise<ReserveResult>
  settle(reservationId: string, actualCostFen: number): Promise<void>
  cancel(reservationId: string): Promise<void>
}

const MAX_BODY_BYTES = 2048
/** 两次模型尝试共用同一个 8 秒截止信号 */
const MODEL_DEADLINE_MS = 8000
/** 预算未配置时使用的默认价格（元/百万 token），与部署变量口径一致 */
const DEFAULT_PRICES: ProviderPrices = { inputCnyPerMillion: 2, outputCnyPerMillion: 8 }
/** 预留成本按最坏 token 量估算：输入 400 + 输出 512 */
const RESERVE_USAGE = { inputTokens: 400, outputTokens: 512 }

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function readPrices(env: AiJudgeEnv): ProviderPrices {
  const input = Number(env.AI_INPUT_CNY_PER_MILLION ?? '')
  const output = Number(env.AI_OUTPUT_CNY_PER_MILLION ?? '')
  return {
    inputCnyPerMillion: Number.isFinite(input) && input > 0 ? input : DEFAULT_PRICES.inputCnyPerMillion,
    outputCnyPerMillion: Number.isFinite(output) && output > 0 ? output : DEFAULT_PRICES.outputCnyPerMillion,
  }
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** 每日身份 = HMAC(secret, ip|dailyId|dateKey)。只保存摘要，不保存原文。 */
async function identityHash(request: Request, input: NormalizedJudgeInput, env: AiJudgeEnv): Promise<string> {
  const ip = request.headers.get('cf-connecting-ip') ?? ''
  const dateKey = dateKeyUTC8(Date.now())
  return hmacHex(env.AI_IDENTITY_SECRET ?? '', `${ip}|${input.dailyId}|${dateKey}`)
}

async function generateWithRetry(
  env: AiJudgeEnv,
  input: NormalizedJudgeInput,
  signal: AbortSignal,
): Promise<{ verdict: Verdict; actualCostFen: number } | { verdict: null; responded: boolean }> {
  const provider = createProvider(env)
  const prices = readPrices(env)
  const messages = buildVerdictPrompt(input)

  let responded = false
  // schema 失败最多重试一次，共两次尝试
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let text: string
    let costFen: number
    try {
      const result = await provider.generate(messages, signal)
      responded = true
      text = result.text
      costFen = estimateCostFen(result.usage, prices)
    } catch (error) {
      if (error instanceof ProviderError) {
        return { verdict: null, responded: error.responded }
      }
      // AbortSignal 超时/中止：请求可能已经发出，按已响应保守处理
      return { verdict: null, responded: true }
    }

    try {
      const verdict = parseVerdict(text)
      if (inspectVerdict(verdict).length > 0) {
        // 输出越界：不重试轰炸模型、不返回模型文本，直接转 fallback
        return { verdict: null, responded: true }
      }
      return { verdict, actualCostFen: costFen }
    } catch (error) {
      if (!(error instanceof VerdictSchemaError)) return { verdict: null, responded }
      if (attempt === 1) return { verdict: null, responded }
    }
  }
  return { verdict: null, responded }
}

/**
 * POST /api/ai-judge/verdict 的完整编排。
 * 顺序：body size → normalize → 输入安全 → 外层限流 → DO 次数 → 缓存 →
 * 预算预留 → 模型（最多两次）→ 输出安全 → 结算 → 写缓存 → 响应。
 *
 * 开发态降级：KV / DO / 限流 / LLM 配置缺失时跳过对应环节而不是报错；
 * 没有 LLM key 时直接返回审核过的 fallback，不伪造 AI 结果。
 */
export async function handleVerdictRequest(
  request: Request,
  env: AiJudgeEnv,
  _ctx: ExecutionContext,
): Promise<Response> {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return json(400, { code: 'body_too_large' })

  let body: unknown
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return json(400, { code: 'body_too_large' })
    }
    body = JSON.parse(text)
  } catch {
    return json(400, { code: 'invalid_body' })
  }

  let input: NormalizedJudgeInput
  try {
    input = normalizeJudgeInput(body)
  } catch (error) {
    const code = error instanceof JudgeInputError ? error.code : 'invalid_body'
    return json(400, { code })
  }

  if (inspectInput(input).length > 0) return json(422, { code: 'case_refused' })

  // 外层宽松限流（binding 缺失的开发态直接跳过）
  if (env.AI_REQUEST_LIMITER) {
    try {
      const result = await env.AI_REQUEST_LIMITER.limit({
        key: `ai-judge:${input.dailyId}`,
      })
      if (!result.success) return json(429, { code: 'rate_limited' })
    } catch {
      // 限流组件故障不阻断玩法
    }
  }

  const gateNamespace = env.AI_JUDGE_GATE
  let gate: JudgeGateClient | undefined
  if (gateNamespace && env.AI_IDENTITY_SECRET) {
    try {
      const id = gateNamespace.idFromName(dateKeyUTC8(Date.now()))
      const stub = gateNamespace.get(id)
      gate = stub
      const authorized = await stub.authorize(await identityHash(request, input, env))
      if (!authorized.ok) return json(429, { code: 'rate_limited' })
    } catch {
      gate = undefined // DO 故障时降级为无次数限制，预算与模型仍受其他闸控制
    }
  }

  // 缓存命中占当日次数但不占预算；预算暂停时仍可返回已缓存的安全判词
  let key: string | null = null
  if (env.AI_VERDICT_CACHE && env.AI_IDENTITY_SECRET) {
    try {
      key = await cacheKey(input, env.AI_IDENTITY_SECRET)
      const cached = await readCachedVerdict(env.AI_VERDICT_CACHE, key)
      if (cached) {
        const response: VerdictResponse = { verdict: cached, source: 'cache' }
        return json(200, response)
      }
    } catch {
      key = null
    }
  }

  const providerConfigured = Boolean(env.AI_LLM_API_KEY && env.AI_LLM_BASE_URL && env.AI_LLM_MODEL)
  if (!providerConfigured) {
    // 开发态/未配置模型：明确降级到审核过的兜底判词，不伪造 AI 结果
    const response: VerdictResponse = { verdict: fallbackVerdict(input), source: 'fallback' }
    return json(200, response)
  }

  const prices = readPrices(env)
  const reserveFen = Math.max(estimateCostFen(RESERVE_USAGE, prices), 1)

  let reservationId: string | null = null
  if (gate) {
    try {
      const reserved = await gate.reserveBudget(reserveFen)
      if (!reserved.ok) return json(503, { code: 'court_closed' })
      reservationId = reserved.reservationId
    } catch {
      reservationId = null
    }
  }

  const settle = async (costFen: number): Promise<void> => {
    if (gate && reservationId) await gate.settle(reservationId, costFen).catch(() => {})
  }
  const cancel = async (): Promise<void> => {
    if (gate && reservationId) await gate.cancel(reservationId).catch(() => {})
  }

  let result: { verdict: Verdict; actualCostFen: number } | { verdict: null; responded: boolean }
  try {
    result = await generateWithRetry(env, input, AbortSignal.timeout(MODEL_DEADLINE_MS))
  } catch {
    result = { verdict: null, responded: false }
  }

  if (result.verdict) {
    await settle(result.actualCostFen)
    if (key && env.AI_VERDICT_CACHE) {
      await writeCachedVerdict(env.AI_VERDICT_CACHE, key, result.verdict).catch(() => {})
    }
    const response: VerdictResponse = { verdict: result.verdict, source: 'model' }
    return json(200, response)
  }

  // 请求已发出（含超时）按预留上限结算，保守熔断；未发出则释放预留
  if (result.responded) await settle(reserveFen)
  else await cancel()

  const response: VerdictResponse = { verdict: fallbackVerdict(input), source: 'fallback' }
  return json(200, response)
}
