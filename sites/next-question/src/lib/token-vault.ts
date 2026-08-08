import type { Slot } from '../../worker/types'

export interface ChainCapabilities {
  ownerToken?: string
  batonToken?: string
  participantTokens: Partial<Record<Slot, string>>
  nextBatonToken?: string
}

const INSTALLATION_KEY = 'next-question:installation-id'
const OWNER_PREFIX = 'next-question:owner:'
const BATON_PREFIX = 'next-question:baton:'
const PARTICIPANT_PREFIX = 'next-question:participant:'
const NEXT_PREFIX = 'next-question:next:'
const ALL_SLOTS = [1, 2, 3, 4, 5, 6] as const

// storage 不可用（隐私模式等）时降级为当前内存 session；页面会提示不要刷新。
const memorySession = new Map<string, string>()

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return memorySession.get(key) ?? null
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // storage 不可用：降级到当前内存 session
    memorySession.set(key, value)
  }
}

export function saveOwnerToken(slug: string, token: string, storage: Storage): void {
  safeSet(storage, `${OWNER_PREFIX}${slug}`, token)
}

export function saveBatonToken(slug: string, token: string, storage: Storage): void {
  safeSet(storage, `${BATON_PREFIX}${slug}`, token)
}

export function saveParticipantToken(slug: string, slot: Slot, token: string, storage: Storage): void {
  safeSet(storage, `${PARTICIPANT_PREFIX}${slug}:${slot}`, token)
}

export function saveNextBatonToken(slug: string, token: string, storage: Storage): void {
  safeSet(storage, `${NEXT_PREFIX}${slug}`, token)
}

export function loadCapabilities(slug: string, storage: Storage): ChainCapabilities {
  const capabilities: ChainCapabilities = { participantTokens: {} }
  const ownerToken = safeGet(storage, `${OWNER_PREFIX}${slug}`)
  if (ownerToken) capabilities.ownerToken = ownerToken
  const batonToken = safeGet(storage, `${BATON_PREFIX}${slug}`)
  if (batonToken) capabilities.batonToken = batonToken
  const nextBatonToken = safeGet(storage, `${NEXT_PREFIX}${slug}`)
  if (nextBatonToken) capabilities.nextBatonToken = nextBatonToken
  for (const slot of ALL_SLOTS) {
    const token = safeGet(storage, `${PARTICIPANT_PREFIX}${slug}:${slot}`)
    if (token) capabilities.participantTokens[slot] = token
  }
  return capabilities
}

// 读取 URL fragment 中的 capability 并立刻入库；调用方随后用 clearCapabilityFragment 清地址栏。
export function ingestFragment(slug: string, hash: string, storage: Storage): ChainCapabilities {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const baton = params.get('b')
  const owner = params.get('o')
  if (baton) saveBatonToken(slug, baton, storage)
  if (owner) saveOwnerToken(slug, owner, storage)
  return loadCapabilities(slug, storage)
}

export function clearCapabilityFragment(history: History, pathname: string, search = ''): void {
  history.replaceState(null, '', `${pathname}${search}`)
}

export function getInstallationId(storage: Storage): string {
  const existing = safeGet(storage, INSTALLATION_KEY)
  if (existing) return existing
  const installationId = crypto.randomUUID()
  safeSet(storage, INSTALLATION_KEY, installationId)
  return installationId
}
