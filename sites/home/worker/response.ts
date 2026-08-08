const COMMON_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  // 主站禁止被 iframe 嵌套，任何玩法也不得以 iframe 方式集成
  'x-frame-options': 'DENY',
}

export function withCommonHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  return { ...COMMON_HEADERS, ...headers }
}

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCommonHeaders({ 'content-type': 'application/json; charset=utf-8', ...headers }),
  })
}

export function apiNotFound(): Response {
  return jsonResponse(404, { code: 'not_found' })
}

export function methodNotAllowed(): Response {
  return jsonResponse(405, { code: 'method_not_allowed' })
}

export function featureUnavailable(feature: string): Response {
  return jsonResponse(503, { code: 'feature_unavailable', feature })
}
