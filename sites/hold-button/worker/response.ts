// 统一 JSON 响应：no-store，错误不回显 token 或 SQL。
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function methodNotAllowed(): Response {
  return jsonResponse(405, { code: 'method_not_allowed' })
}

export function notFound(): Response {
  return jsonResponse(404, { code: 'not_found' })
}
