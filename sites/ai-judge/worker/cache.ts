import type { NormalizedJudgeInput } from './normalize'
import { inspectVerdict } from './safety'
import type { Verdict } from './types'
import { parseVerdict } from './verdict-schema'

export const CACHE_TTL_SECONDS = 24 * 60 * 60

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * cache key = HMAC(secret, 昵称\n简介)。
 * dailyId 不参与（缓存按内容而非身份），key 与存储值都不含原始输入。
 */
export async function cacheKey(input: NormalizedJudgeInput, secret: string): Promise<string> {
  return hmacHex(secret, `${input.nickname}\n${input.intro}`)
}

export async function readCachedVerdict(
  kv: KVNamespace,
  key: string,
): Promise<Verdict | null> {
  const raw = await kv.get(key, 'text')
  if (!raw) return null
  try {
    // 读回也重新校验：不信任存储里的历史数据
    const verdict = parseVerdict(raw)
    return inspectVerdict(verdict).length === 0 ? verdict : null
  } catch {
    return null
  }
}

/** 只缓存已通过 schema 与安全过滤的判词。 */
export async function writeCachedVerdict(
  kv: KVNamespace,
  key: string,
  verdict: Verdict,
): Promise<void> {
  if (inspectVerdict(verdict).length > 0) return
  try {
    parseVerdict(JSON.stringify(verdict))
  } catch {
    return
  }
  await kv.put(key, JSON.stringify(verdict), { expirationTtl: CACHE_TTL_SECONDS })
}
