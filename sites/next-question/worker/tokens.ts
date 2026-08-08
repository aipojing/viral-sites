const TOKEN_BYTES = 32
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

export function randomSecret(): string {
  const bytes = new Uint8Array(TOKEN_BYTES)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

export function isValidTokenFormat(token: string): boolean {
  return TOKEN_PATTERN.test(token)
}

// 由 chainSecret + purpose 确定性派生 capability token：
// 同一个幂等提交在网络重试后仍能恢复出同一枚下一棒 token。
export async function deriveCapability(chainSecret: string, purpose: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64Url(chainSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(purpose))
  return toBase64Url(new Uint8Array(signature))
}

// 常量时间比较：先长度判断（长度本身不是秘密，token 固定 43 位），再逐位 XOR 累计差异。
export function equalCapability(actual: string, expected: string): boolean {
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let index = 0; index < expected.length; index += 1) {
    diff |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return diff === 0
}
