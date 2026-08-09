import type { AiJudgeEnv } from '../../ai-judge/worker/env'
import type { HoldButtonEnv } from '../../hold-button/worker/env'
import type { NextQuestionEnv } from '../../next-question/worker/env'

interface BasePortalEnv {
  ASSETS: Fetcher
  PRODUCT_ANALYTICS: AnalyticsEngineDataset
}

// AI 判官的绑定与 secrets 都挂在同一个主站 Worker 上（AI_ 前缀）。
// AiJudgeEnv 全部可选：未配置生产资源时 handler 走开发态降级。
// 下一问的 Durable Object 与创建限流绑定同样挂在主站 Worker（NEXT_QUESTION_ 前缀）。
// 按住不放的 D1/限流/密钥同样挂在主站 Worker（HOLD_ 前缀），未配置时走 scores_disabled。
export type PortalEnv = BasePortalEnv & AiJudgeEnv & NextQuestionEnv & HoldButtonEnv
