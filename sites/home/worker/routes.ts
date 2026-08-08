export type PortalRoute =
  | { kind: 'umami' }
  | { kind: 'ai-judge' }
  | { kind: 'hold-button' }
  | { kind: 'rewrite'; pathname: '/tacit-test/' }
  | { kind: 'asset' }
  | { kind: 'api-not-found' }

export function classifyPortalRoute(url: URL): PortalRoute {
  const { pathname } = url

  if (pathname === '/api/send') return { kind: 'umami' }
  if (pathname === '/api/ai-judge' || pathname.startsWith('/api/ai-judge/')) {
    return { kind: 'ai-judge' }
  }
  if (pathname === '/api/hold-button' || pathname.startsWith('/api/hold-button/')) {
    return { kind: 'hold-button' }
  }
  if (pathname === '/api' || pathname.startsWith('/api/')) return { kind: 'api-not-found' }
  if (pathname === '/tacit-test/c' || pathname.startsWith('/tacit-test/c/')) {
    return { kind: 'rewrite', pathname: '/tacit-test/' }
  }
  return { kind: 'asset' }
}
