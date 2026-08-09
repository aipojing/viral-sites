import type { DeviceType } from './time'

export interface SessionPayload {
  nonce: string
  startedAt: number
  expiresAt: number
  deviceType: DeviceType
}

const encoder = new TextEncoder()

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new Error('invalid token encoding')
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function importKey(secret: string, usages: readonly ('sign' | 'verify')[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [...usages],
  )
}

/** token 格式固定为 `<base64url(UTF-8 JSON)>.<base64url(HMAC-SHA256)>` */
export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const key = await importKey(secret, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`
}

function assertPayloadShape(value: unknown): SessionPayload {
  if (typeof value !== 'object' || value === null) throw new Error('invalid payload')
  const candidate = value as Record<string, unknown>
  if (typeof candidate.nonce !== 'string' || candidate.nonce.length === 0) {
    throw new Error('invalid payload')
  }
  if (typeof candidate.startedAt !== 'number' || !Number.isFinite(candidate.startedAt)) {
    throw new Error('invalid payload')
  }
  if (typeof candidate.expiresAt !== 'number' || !Number.isFinite(candidate.expiresAt)) {
    throw new Error('invalid payload')
  }
  if (candidate.deviceType !== 'touch' && candidate.deviceType !== 'desktop') {
    throw new Error('invalid payload')
  }
  return {
    nonce: candidate.nonce,
    startedAt: candidate.startedAt,
    expiresAt: candidate.expiresAt,
    deviceType: candidate.deviceType,
  }
}

export async function verifySession(
  token: string,
  secret: string,
  now: number,
): Promise<SessionPayload> {
  const parts = token.split('.')
  if (parts.length !== 2) throw new Error('invalid token')
  const [body, signaturePart] = parts
  const signature = base64UrlToBytes(signaturePart)

  const key = await importKey(secret, ['verify'])
  const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(body))
  if (!valid) throw new Error('invalid signature')

  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)))
  } catch {
    throw new Error('invalid token body')
  }
  const payload = assertPayloadShape(parsed)
  if (now > payload.expiresAt) throw new Error('session expired')
  return payload
}
