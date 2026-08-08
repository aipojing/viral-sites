import type { JudgeGate } from './judge-gate'

// 绑定与密钥全部由主站 sites/home/wrangler.jsonc 声明（AI_ 前缀）。
// 未配置生产资源时全部为 undefined，handler 必须走明确的开发态降级而不是报错。
export interface AiJudgeEnv {
  AI_VERDICT_CACHE?: KVNamespace
  AI_JUDGE_GATE?: DurableObjectNamespace<JudgeGate>
  AI_REQUEST_LIMITER?: RateLimit
  AI_LLM_API_KEY?: string
  AI_LLM_BASE_URL?: string
  AI_LLM_MODEL?: string
  AI_IDENTITY_SECRET?: string
  /** 每日预算（分），如 5000 = ¥50 */
  AI_DAILY_BUDGET_FEN?: string
  /** 输入价格：元 / 百万 token */
  AI_INPUT_CNY_PER_MILLION?: string
  /** 输出价格：元 / 百万 token */
  AI_OUTPUT_CNY_PER_MILLION?: string
  AI_ALERT_WEBHOOK_URL?: string
}
