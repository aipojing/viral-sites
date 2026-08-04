// Cloudflare Pages 高级模式 Worker：同源代理 umami 上报，其余请求走静态资源。
// 大陆用户跨境直连 gateway.umami.is 不稳，同源代理把统计可达性绑定到站点可达性上。
const UMAMI_ENDPOINT = 'https://gateway.umami.is/api/send'
const FORWARD_HEADERS = [
  'content-type',
  'user-agent',
  'x-umami-website-id',
  'x-umami-hostname',
  'x-umami-cache',
]

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/send' && request.method === 'POST') {
      const headers = {}
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
        return new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
    }
    if (url.pathname === '/c') {
      // 挑战链接 /c?d=... 回退到单页应用入口，query 原样保留
      return env.ASSETS.fetch(new Request(new URL('/', url.origin), request))
    }
    return env.ASSETS.fetch(request)
  },
}
