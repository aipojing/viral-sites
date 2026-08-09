import type { AiJudgeEnv } from './env'
import type { ChatMessage } from './types'

export class ProviderError extends Error {
  readonly code: 'misconfigured' | 'rate_limited' | 'upstream_error' | 'invalid_response'
  /** 上游是否已经收到响应：决定预算该结算还是取消 */
  readonly responded: boolean

  constructor(code: ProviderError['code'], message: string, responded = false) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.responded = responded
  }
}

export interface ProviderUsage {
  inputTokens: number
  outputTokens: number
}

export interface ProviderResult {
  text: string
  usage: ProviderUsage
}

export interface ProviderPrices {
  /** 输入价格：元 / 百万 token */
  inputCnyPerMillion: number
  /** 输出价格：元 / 百万 token */
  outputCnyPerMillion: number
}

export interface LlmProvider {
  generate(messages: readonly ChatMessage[], signal: AbortSignal): Promise<ProviderResult>
}

/**
 * OpenAI-compatible `POST /chat/completions` 的最小适配。
 * 只实现本项目需要的子集；不打 request body、key 或模型原文日志。
 */
export function createProvider(
  env: Pick<AiJudgeEnv, 'AI_LLM_API_KEY' | 'AI_LLM_BASE_URL' | 'AI_LLM_MODEL'>,
): LlmProvider {
  const apiKey = env.AI_LLM_API_KEY
  const baseUrl = env.AI_LLM_BASE_URL
  const model = env.AI_LLM_MODEL
  if (!apiKey || !baseUrl || !model) {
    throw new ProviderError('misconfigured', 'llm provider not configured')
  }
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`

  return {
    async generate(messages, signal) {
      let response: Response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.9,
            max_tokens: 512,
            response_format: { type: 'json_object' },
          }),
          signal,
        })
      } catch (error) {
        throw new ProviderError('upstream_error', 'fetch failed')
      }

      if (response.status === 429) throw new ProviderError('rate_limited', 'provider 429', true)
      if (!response.ok) {
        throw new ProviderError('upstream_error', `provider ${response.status}`, true)
      }

      let body: unknown
      try {
        body = await response.json()
      } catch {
        throw new ProviderError('invalid_response', 'provider returned non-json', true)
      }
      if (!body || typeof body !== 'object') {
        throw new ProviderError('invalid_response', 'provider returned invalid shape', true)
      }

      const record = body as Record<string, unknown>
      const choices = record.choices
      const content = Array.isArray(choices)
        ? (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
        : undefined
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new ProviderError('invalid_response', 'provider returned no content', true)
      }

      const usage = record.usage as
        | { prompt_tokens?: unknown; completion_tokens?: unknown }
        | undefined
      const inputTokens = usage?.prompt_tokens
      const outputTokens = usage?.completion_tokens
      if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
        // 拿不到 usage 就按错误处理：宁可走 fallback，也不猜测成本
        throw new ProviderError('invalid_response', 'provider returned no usage', true)
      }

      return { text: content, usage: { inputTokens, outputTokens } }
    },
  }
}

/** 成本折算成分（1 元 = 100 分），向上取整，避免预算被小数误差穿透。 */
export function estimateCostFen(usage: ProviderUsage, prices: ProviderPrices): number {
  const cny =
    (usage.inputTokens * prices.inputCnyPerMillion) / 1_000_000 +
    (usage.outputTokens * prices.outputCnyPerMillion) / 1_000_000
  return Math.ceil(cny * 100)
}
