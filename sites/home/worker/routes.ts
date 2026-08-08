import { isValidChainSlug } from '../../next-question/worker/router'

export type PortalRoute =
  | { kind: 'analytics' }
  | { kind: 'ai-judge' }
  | { kind: 'hold-button' }
  | { kind: 'next-question-api' }
  | { kind: 'next-question-shell'; slug: string }
  | { kind: 'rewrite'; pathname: '/tacit-test/' }
  | { kind: 'asset' }
  | { kind: 'api-not-found' }

export function classifyPortalRoute(url: URL): PortalRoute {
  const { pathname } = url

  if (pathname === '/api/events') return { kind: 'analytics' }
  if (pathname === '/api/ai-judge' || pathname.startsWith('/api/ai-judge/')) {
    return { kind: 'ai-judge' }
  }
  if (pathname === '/api/hold-button' || pathname.startsWith('/api/hold-button/')) {
    return { kind: 'hold-button' }
  }
  if (pathname === '/api/next-question' || pathname.startsWith('/api/next-question/')) {
    return { kind: 'next-question-api' }
  }
  if (pathname === '/api' || pathname.startsWith('/api/')) return { kind: 'api-not-found' }
  if (pathname === '/tacit-test/c' || pathname.startsWith('/tacit-test/c/')) {
    return { kind: 'rewrite', pathname: '/tacit-test/' }
  }
  if (pathname.startsWith('/next-question/c/')) {
    const slug = pathname.slice('/next-question/c/'.length)
    // 合法 slug 才进入链条 shell；非法路径交给静态资产 404，绝不访问 Durable Object
    if (isValidChainSlug(slug)) return { kind: 'next-question-shell', slug }
  }
  return { kind: 'asset' }
}
