import type { PortalEnv } from './env'
import { handleAiJudgeApi } from '../../ai-judge/worker/router'
import { handleNextQuestionApi } from '../../next-question/worker/api'
import { collectProductEvent } from './analytics'
import { serveNextQuestionShell } from './next-question-shell'
import { classifyPortalRoute } from './routes'
import { apiNotFound, featureUnavailable } from './response'

// 声明式 exports：唯一主站 Worker 承载下一问的 SQLite-backed Durable Object。
export { NextQuestionChain } from '../../next-question/worker/question-chain'

// 统一主站 Worker：公共 API → 玩法 API → 深链接改写 → 未知 API JSON 404 → 静态资产。
export default {
  async fetch(request: Request, env: PortalEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const route = classifyPortalRoute(url)

    switch (route.kind) {
      case 'analytics':
        return collectProductEvent(request, env)
      case 'ai-judge':
        // AI 判官 handler 的所有绑定都是可选的：未配置生产资源时自动走开发态降级
        return handleAiJudgeApi(request, env, ctx)
      case 'hold-button':
        return featureUnavailable('hold-button')
      case 'next-question-api':
        return handleNextQuestionApi(request, env, ctx)
      case 'next-question-shell':
        return serveNextQuestionShell(request, env, route.slug)
      case 'rewrite': {
        const rewritten = new URL(request.url)
        rewritten.pathname = route.pathname
        return env.ASSETS.fetch(new Request(rewritten.toString(), request))
      }
      case 'api-not-found':
        return apiNotFound()
      case 'asset':
        return env.ASSETS.fetch(request)
    }
  },
}
