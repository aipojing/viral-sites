import { afterEach, describe, expect, it, vi } from 'vitest'
import { CACHE_TTL_SECONDS, cacheKey, readCachedVerdict, writeCachedVerdict } from './cache'
import type { NormalizedJudgeInput } from './normalize'
import type { Verdict } from './types'

const SECRET = 'test-secret'

const input = (nickname: string, intro: string, dailyId = '3f2c9a1e-8b4d-4c6e-9f0a-1b2c3d4e5f60'): NormalizedJudgeInput => ({
  nickname,
  intro,
  dailyId,
})

const SAFE_VERDICT: Verdict = {
  crime: '拖延成瘾罪',
  verdict:
    '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零，收藏的教程从未打开第二次。本官念其态度尚可。',
  sentence: '判处早睡三个月，缓期执行',
  seal: '赛博衙门 · 即日生效',
}

function fakeKv() {
  const store = new Map<string, { value: string; ttl?: number }>()
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
    put: vi.fn(async (key: string, value: string, options?: { expirationTtl?: number }) => {
      store.set(key, { value, ttl: options?.expirationTtl })
    }),
  } as unknown as KVNamespace & { store: Map<string, { value: string; ttl?: number }> }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cacheKey', () => {
  it('同昵称与简介得到同 key，dailyId 不参与', async () => {
    const a = await cacheKey(input('阿福', '爱熬夜', '11111111-1111-4111-8111-111111111111'), SECRET)
    const b = await cacheKey(input('阿福', '爱熬夜', '22222222-2222-4222-8222-222222222222'), SECRET)
    expect(a).toBe(b)
  })

  it('不同输入分叉', async () => {
    const a = await cacheKey(input('阿福', '爱熬夜'), SECRET)
    const b = await cacheKey(input('阿福', '爱早起'), SECRET)
    const c = await cacheKey(input('小明', '爱熬夜'), SECRET)
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })

  it('key 不含原文且随 secret 变化', async () => {
    const key = await cacheKey(input('阿福', '爱熬夜'), SECRET)
    expect(key).not.toContain('阿福')
    expect(key).not.toContain('爱熬夜')
    expect(await cacheKey(input('阿福', '爱熬夜'), 'other-secret')).not.toBe(key)
  })
})

describe('readCachedVerdict / writeCachedVerdict', () => {
  it('写入使用 24 小时 TTL', async () => {
    const kv = fakeKv()
    await writeCachedVerdict(kv, 'key-1', SAFE_VERDICT)
    expect(kv.store.get('key-1')?.ttl).toBe(CACHE_TTL_SECONDS)
    expect(CACHE_TTL_SECONDS).toBe(86400)
  })

  it('读回合法判词', async () => {
    const kv = fakeKv()
    await writeCachedVerdict(kv, 'key-1', SAFE_VERDICT)
    expect(await readCachedVerdict(kv, 'key-1')).toEqual(SAFE_VERDICT)
  })

  it('不写入越界判词', async () => {
    const kv = fakeKv()
    await writeCachedVerdict(kv, 'key-1', { ...SAFE_VERDICT, sentence: '判处弄死你' })
    expect(kv.store.has('key-1')).toBe(false)
  })

  it('读回损坏或越界数据时返回 null', async () => {
    const kv = fakeKv()
    kv.store.set('bad-json', { value: 'not json' })
    kv.store.set(
      'unsafe',
      {
        value: JSON.stringify({ ...SAFE_VERDICT, crime: '肥猪罪' }),
      },
    )
    expect(await readCachedVerdict(kv, 'bad-json')).toBeNull()
    expect(await readCachedVerdict(kv, 'unsafe')).toBeNull()
    expect(await readCachedVerdict(kv, 'missing')).toBeNull()
  })
})
