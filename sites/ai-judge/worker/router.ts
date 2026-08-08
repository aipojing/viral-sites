import type { AiJudgeEnv } from './env'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

/**
 * 只处理已经位于 /api/ai-judge/* 的请求；静态资源、Umami 与其他玩法
 * 由主站 Worker 负责。Task 5 用完整业务编排替换 501 占位。
 */
export async function handleAiJudgeApi(
  request: Request,
  _env: AiJudgeEnv,
  _ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname !== '/api/ai-judge/verdict') return json(404, { code: 'not_found' })
  if (request.method !== 'POST') return json(405, { code: 'method_not_allowed' })

  return json(501, { code: 'not_implemented' })
}
