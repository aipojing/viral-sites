import { ChainError } from './question-chain'
import { parseNextQuestionApiPath } from './router'
import { toBase64Url } from './tokens'
import {
  InputError,
  parseCloseChainInput,
  parseCreateChainInput,
  parseRequestId,
  parseSubmitBatonInput,
} from './validation'
import type { NextQuestionEnv } from './env'
import type { Slot } from './types'

type ChainStub = ReturnType<NextQuestionEnv['NEXT_QUESTION_CHAINS']['get']>

const MAX_BODY_BYTES = 16 * 1024

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header || !header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token === '' ? null : token
}

// slug 由 requestId 确定性派生：幂等重试永远命中同一个 Durable Object。
export async function slugForRequestId(requestId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`next-question:${requestId.toLowerCase()}`),
  )
  return toBase64Url(new Uint8Array(digest)).slice(0, 16)
}

// 限流 key 仅保存 SHA-256 摘要，绝不把原始 IP 写入存储或日志。
async function rateLimitKey(scope: 'ip' | 'installation', value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`next-question:${scope}:${value}`),
  )
  return toBase64Url(new Uint8Array(digest))
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

function validationFailed(): Response {
  return json(400, { code: 'validation_failed' })
}

function invalidToken(): Response {
  return json(403, { code: 'invalid_token' })
}

function methodNotAllowed(): Response {
  return json(405, { code: 'method_not_allowed' })
}

function notFound(): Response {
  return json(404, { code: 'not_found' })
}

function mapChainError(error: unknown): Response {
  // 跨 DO RPC 时自定义错误类可能退化为普通 Error，code 始终保留在 message 中。
  const code = error instanceof ChainError ? error.code : error instanceof Error ? error.message : ''
  switch (code) {
    case 'invalid_token':
      return json(403, { code: 'invalid_token' })
    case 'chain_not_found':
      return json(404, { code: 'chain_not_found' })
    case 'chain_advanced':
      return json(409, { code: 'chain_advanced' })
    case 'chain_expired':
      return json(410, { code: 'chain_expired' })
    case 'chain_cancelled':
      return json(410, { code: 'chain_cancelled' })
    default:
      return json(500, { code: 'internal_error' })
  }
}

async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return validationFailed()
  let text: string
  try {
    text = await request.text()
  } catch {
    return validationFailed()
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return validationFailed()
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return validationFailed()
    return parsed as Record<string, unknown>
  } catch {
    return validationFailed()
  }
}

function parseSlot(value: unknown): Slot | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 6) return null
  return value as Slot
}

export async function handleNextQuestionApi(
  request: Request,
  env: NextQuestionEnv,
  _ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url)
  const route = parseNextQuestionApiPath(url.pathname)
  if (route.kind === 'unknown') return notFound()

  try {
    if (route.kind === 'create') return await handleCreate(request, env)

    const stub = env.NEXT_QUESTION_CHAINS.get(env.NEXT_QUESTION_CHAINS.idFromName(route.slug))

    if (route.kind === 'chain') {
      if (request.method === 'GET') {
        const chain = await stub.getPublic(Date.now())
        if (!chain) return json(404, { code: 'chain_not_found' })
        return json(200, chain)
      }
      if (request.method === 'DELETE') return await handleDelete(request, stub)
      return methodNotAllowed()
    }

    if (request.method !== 'POST') return methodNotAllowed()
    const token = bearerToken(request)
    if (!token) return invalidToken()
    const body = await readBody(request)
    if (body instanceof Response) return body

    if (route.kind === 'baton') {
      const input = parseSubmitBatonInput(body)
      return json(200, await stub.submitBaton(token, input, Date.now()))
    }
    if (route.kind === 'close') {
      const input = parseCloseChainInput(body)
      return json(200, await stub.close(token, input, Date.now()))
    }
    // route.kind === 'redact'
    const requestId = parseRequestId(body.requestId)
    const slot = parseSlot(body.slot)
    if (slot === null) return validationFailed()
    return json(200, await stub.redact(token, slot, requestId, Date.now()))
  } catch (error) {
    if (error instanceof InputError) return validationFailed()
    // ChainError 跨 DO RPC 后会失去原型，code 保留在 message 中，统一走映射
    return mapChainError(error)
  }
}

async function handleCreate(request: Request, env: NextQuestionEnv): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  const body = await readBody(request)
  if (body instanceof Response) return body

  const input = parseCreateChainInput(body)

  const ip = request.headers.get('cf-connecting-ip') ?? ''
  const ipKey = await rateLimitKey('ip', ip)
  const installationKey = await rateLimitKey('installation', input.installationId)
  const ipOutcome = await env.NEXT_QUESTION_CREATE_LIMITER.limit({ key: ipKey })
  if (!ipOutcome.success) return json(429, { code: 'rate_limited' })
  const installationOutcome = await env.NEXT_QUESTION_CREATE_LIMITER.limit({ key: installationKey })
  if (!installationOutcome.success) return json(429, { code: 'rate_limited' })

  const slug = await slugForRequestId(input.requestId)
  const stub = env.NEXT_QUESTION_CHAINS.get(env.NEXT_QUESTION_CHAINS.idFromName(slug))
  const result = await stub.create(slug, input, Date.now())
  return json(201, result)
}

async function handleDelete(request: Request, stub: ChainStub): Promise<Response> {
  const token = bearerToken(request)
  if (!token) return invalidToken()
  const body = await readBody(request)
  if (body instanceof Response) return body
  const requestId = parseRequestId(body.requestId)
  await stub.deleteChain(token, requestId, Date.now())
  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  })
}
