import type {
  CloseChainInput,
  CreateChainInput,
  CreateChainResult,
  PublicChain,
  Slot,
  SubmitBatonInput,
  SubmitBatonResult,
} from '../../worker/types'

// 稳定错误类型：status 是 HTTP 状态（0 表示未收到响应），code 与服务端错误码一致。
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code)
  }
}

const TIMEOUT_MS = 10_000
const BASE = '/api/next-question'

interface RequestOptions {
  method: 'GET' | 'POST' | 'DELETE'
  token?: string
  body?: unknown
}

async function readErrorCode(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const code = (body as { code?: unknown }).code
      if (typeof code === 'string' && code !== '') return code
    }
    return 'invalid_response'
  } catch {
    return 'invalid_response'
  }
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.token !== undefined) headers.authorization = `Bearer ${options.token}`

  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      credentials: 'omit',
    })
  } catch (error) {
    const name = typeof (error as { name?: unknown })?.name === 'string'
      ? ((error as { name: string }).name)
      : ''
    throw new ApiError(0, name === 'AbortError' ? 'timeout' : 'network_error')
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorCode(response))
  }
  if (response.status === 204) return undefined as T
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError(502, 'invalid_response')
  }
}

export function createChain(input: CreateChainInput): Promise<CreateChainResult> {
  return request('/chains', { method: 'POST', body: input })
}

export function getChain(slug: string): Promise<PublicChain> {
  return request(`/chains/${slug}`, { method: 'GET' })
}

export function submitBaton(
  slug: string,
  token: string,
  input: SubmitBatonInput,
): Promise<SubmitBatonResult> {
  return request(`/chains/${slug}/baton`, { method: 'POST', token, body: input })
}

export function closeChain(slug: string, token: string, input: CloseChainInput): Promise<PublicChain> {
  return request(`/chains/${slug}/close`, { method: 'POST', token, body: input })
}

export function redactChain(
  slug: string,
  token: string,
  input: { requestId: string; slot: Slot },
): Promise<PublicChain> {
  return request(`/chains/${slug}/redact`, { method: 'POST', token, body: input })
}

export function deleteChain(slug: string, token: string, requestId: string): Promise<void> {
  return request(`/chains/${slug}`, { method: 'DELETE', token, body: { requestId } })
}
