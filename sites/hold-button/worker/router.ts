import { handleFinish, handleSession, handleToday } from './api'
import type { HoldButtonEnv } from './env'
import { methodNotAllowed, notFound } from './response'

/**
 * 只处理已经位于 /api/hold-button/* 的请求；静态资源、统计与其他玩法
 * 由主站 Worker 负责。业务编排在 api.ts。
 */
export async function handleHoldButtonApi(
  request: Request,
  env: HoldButtonEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/api/hold-button/')) return notFound()

  switch (url.pathname) {
    case '/api/hold-button/session':
      if (request.method !== 'POST') return methodNotAllowed()
      return handleSession(request, env, ctx)
    case '/api/hold-button/finish':
      if (request.method !== 'POST') return methodNotAllowed()
      return handleFinish(request, env, ctx)
    case '/api/hold-button/today':
      if (request.method !== 'GET') return methodNotAllowed()
      return handleToday(request, env, ctx)
    default:
      return notFound()
  }
}
