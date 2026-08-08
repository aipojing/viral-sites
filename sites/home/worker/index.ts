import type { PortalEnv } from './env'
import { collectProductEvent } from './analytics'
import { classifyPortalRoute } from './routes'
import { apiNotFound, featureUnavailable } from './response'

// 统一主站 Worker：公共 API → 玩法 API → 深链接改写 → 未知 API JSON 404 → 静态资产。
export default {
  async fetch(request: Request, env: PortalEnv, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const route = classifyPortalRoute(url)

    switch (route.kind) {
      case 'analytics':
        return collectProductEvent(request, env)
      case 'ai-judge':
        return featureUnavailable('ai-judge')
      case 'hold-button':
        return featureUnavailable('hold-button')
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
