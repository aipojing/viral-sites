import type { NextQuestionChain } from '../../next-question/worker/question-chain'

export interface PortalEnv {
  ASSETS: Fetcher
  PRODUCT_ANALYTICS: AnalyticsEngineDataset
  NEXT_QUESTION_CHAINS: DurableObjectNamespace<NextQuestionChain>
  NEXT_QUESTION_CREATE_LIMITER: RateLimit
}
