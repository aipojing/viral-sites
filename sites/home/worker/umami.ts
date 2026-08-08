import { methodNotAllowed } from './response'

// 同源代理 umami 上报：大陆用户跨境直连 gateway.umami.is 不稳，
// 同源代理把统计可达性绑定到站点可达性上。
export const UMAMI_ENDPOINT = 'https://gateway.umami.is/api/send'

const FORWARD_HEADERS = [
  'content-type',
  'user-agent',
  'x-umami-website-id',
  'x-umami-hostname',
  'x-umami-cache',
] as const

export async function proxyUmami(request: Request): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()

  const headers: Record<string, string> = {}
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers[name] = value
  }
  const clientIp = request.headers.get('cf-connecting-ip')
  if (clientIp) headers['x-forwarded-for'] = clientIp

  try {
    return await fetch(UMAMI_ENDPOINT, {
      method: 'POST',
      headers,
      body: await request.text(),
    })
  } catch {
    // 上游不可达时静默成功，统计丢失不影响用户
    return new Response(null, { status: 202 })
  }
}
