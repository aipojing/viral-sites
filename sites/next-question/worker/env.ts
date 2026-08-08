import type { NextQuestionChain } from './question-chain'

export interface NextQuestionEnv {
  NEXT_QUESTION_CHAINS: DurableObjectNamespace<NextQuestionChain>
  NEXT_QUESTION_CREATE_LIMITER: RateLimit
}
