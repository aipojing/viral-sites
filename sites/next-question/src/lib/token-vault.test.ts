import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearCapabilityFragment,
  getInstallationId,
  ingestFragment,
  loadCapabilities,
  saveNextBatonToken,
  saveOwnerToken,
  saveParticipantToken,
} from './token-vault'

const SLUG = 'abcd1234abcd1234'

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size
    },
  }
}

function makeBrokenStorage(): Storage {
  const failing = () => {
    throw new Error('storage disabled')
  }
  return {
    getItem: failing,
    setItem: failing,
    removeItem: failing,
    clear: failing,
    key: failing,
    length: 0,
  } as unknown as Storage
}

beforeEach(() => {
  localStorage.clear()
})

describe('ingestFragment', () => {
  it('ingest #b= 保存 baton token', () => {
    const storage = makeMemoryStorage()
    const caps = ingestFragment(SLUG, '#b=baton-token', storage)
    expect(caps.batonToken).toBe('baton-token')
    expect(storage.getItem(`next-question:baton:${SLUG}`)).toBe('baton-token')
  })

  it('ingest #o= 保存 owner token', () => {
    const storage = makeMemoryStorage()
    const caps = ingestFragment(SLUG, '#o=owner-token', storage)
    expect(caps.ownerToken).toBe('owner-token')
    expect(storage.getItem(`next-question:owner:${SLUG}`)).toBe('owner-token')
  })

  it('同时出现 b 与 o 时都收下；未知 fragment 与空 token 忽略', () => {
    const storage = makeMemoryStorage()
    const both = ingestFragment(SLUG, '#b=baton&o=owner', storage)
    expect(both.batonToken).toBe('baton')
    expect(both.ownerToken).toBe('owner')

    const fresh = makeMemoryStorage()
    const unknown = ingestFragment(SLUG, '#x=1', fresh)
    expect(unknown.batonToken).toBeUndefined()
    expect(unknown.ownerToken).toBeUndefined()

    const empty = ingestFragment(SLUG, '#b=', fresh)
    expect(empty.batonToken).toBeUndefined()
  })

  it('storage 抛错时降级到内存 session，不中断体验', () => {
    const broken = makeBrokenStorage()
    const caps = ingestFragment(SLUG, '#b=baton-token', broken)
    expect(caps.batonToken).toBe('baton-token')
    const again = loadCapabilities(SLUG, broken)
    expect(again.batonToken).toBe('baton-token')
  })

  it('已有本机 token 与新 fragment 合并，不丢失历史 capability', () => {
    const storage = makeMemoryStorage()
    saveOwnerToken(SLUG, 'owner-token', storage)
    saveParticipantToken(SLUG, 2, 'p2-token', storage)
    const caps = ingestFragment(SLUG, '#b=baton-token', storage)
    expect(caps.ownerToken).toBe('owner-token')
    expect(caps.participantTokens[2]).toBe('p2-token')
    expect(caps.batonToken).toBe('baton-token')
  })
})

describe('loadCapabilities', () => {
  it('读取 owner/baton/participant/next 全部本机 capability', () => {
    const storage = makeMemoryStorage()
    saveOwnerToken(SLUG, 'owner-token', storage)
    saveParticipantToken(SLUG, 3, 'p3-token', storage)
    saveNextBatonToken(SLUG, 'next-token', storage)
    const caps = loadCapabilities(SLUG, storage)
    expect(caps.ownerToken).toBe('owner-token')
    expect(caps.participantTokens[3]).toBe('p3-token')
    expect(caps.nextBatonToken).toBe('next-token')
    expect(caps.batonToken).toBeUndefined()
  })
})

describe('clearCapabilityFragment', () => {
  it('ingest 后用 replaceState 清掉地址栏 fragment，保留 query', () => {
    const history = { replaceState: vi.fn() } as unknown as History
    clearCapabilityFragment(history, '/next-question/c/abcd1234abcd1234', '?from=share')
    expect(history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/next-question/c/abcd1234abcd1234?from=share',
    )
  })
})

describe('getInstallationId', () => {
  it('生成并持久化 UUID；同一 storage 多次调用保持一致', () => {
    const storage = makeMemoryStorage()
    const first = getInstallationId(storage)
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(getInstallationId(storage)).toBe(first)
  })
})
