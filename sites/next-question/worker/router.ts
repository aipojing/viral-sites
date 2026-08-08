export type NextQuestionApiRoute =
  | { kind: 'create' }
  | { kind: 'chain'; slug: string }
  | { kind: 'baton'; slug: string }
  | { kind: 'close'; slug: string }
  | { kind: 'redact'; slug: string }
  | { kind: 'unknown' }

const SLUG_PATTERN = /^[A-Za-z0-9_-]{16}$/
const API_PATH_PATTERN =
  /^\/api\/next-question\/chains(?:\/([A-Za-z0-9_-]{16}))?(?:\/(baton|close|redact))?$/

export function isValidChainSlug(value: string): boolean {
  return SLUG_PATTERN.test(value)
}

// 只识别固定的六条路由；任何其他形态一律 unknown，由上层返回 JSON 404。
export function parseNextQuestionApiPath(pathname: string): NextQuestionApiRoute {
  const match = API_PATH_PATTERN.exec(pathname)
  if (!match) return { kind: 'unknown' }
  const [, slug, action] = match
  if (!slug) return { kind: 'create' }
  if (action === 'baton' || action === 'close' || action === 'redact') {
    return { kind: action, slug }
  }
  return { kind: 'chain', slug }
}
