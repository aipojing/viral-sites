import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DRAFT_STORAGE_KEY, clearDraft, loadDraft, saveDraft } from './draft-storage'
import type { DraftV1 } from './draft-storage'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

function draftOf(overrides: Partial<DraftV1> = {}): DraftV1 {
  return {
    version: 1,
    reportYear: 2026,
    currentQuestion: 3,
    answers: { keyword: '重启', 'feeling-scale': 4 },
    updatedAt: 1_760_000_000_000,
    ...overrides,
  }
}

describe('saveDraft / loadDraft', () => {
  let storage: Storage

  beforeEach(() => {
    storage = memoryStorage()
  })

  it('存下来的草稿能按年份恢复', () => {
    expect(saveDraft(storage, draftOf())).toBe(true)
    const result = loadDraft(storage, 2026)
    expect(result.status).toBe('found')
    if (result.status !== 'found') return
    expect(result.draft.currentQuestion).toBe(3)
    expect(result.draft.answers).toEqual({ keyword: '重启', 'feeling-scale': 4 })
  })

  it('使用固定的版本化 key', () => {
    saveDraft(storage, draftOf())
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeTruthy()
    expect(DRAFT_STORAGE_KEY).toBe('viral:year-report:draft:v1')
  })

  it('跨年不恢复上一年的草稿', () => {
    saveDraft(storage, draftOf({ reportYear: 2025 }))
    expect(loadDraft(storage, 2026).status).toBe('missing')
  })

  it('没有草稿时返回 missing', () => {
    expect(loadDraft(storage, 2026).status).toBe('missing')
  })

  it('坏 JSON 返回 invalid', () => {
    storage.setItem(DRAFT_STORAGE_KEY, '{ not json')
    expect(loadDraft(storage, 2026).status).toBe('invalid')
  })

  it('未知版本返回 invalid', () => {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draftOf(), version: 2 }))
    expect(loadDraft(storage, 2026).status).toBe('invalid')
  })

  it('非法答案返回 invalid，且不把答案交给 UI', () => {
    storage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ ...draftOf(), answers: { keyword: '超过八个字的关键词肯定不合法' } }),
    )
    expect(loadDraft(storage, 2026).status).toBe('invalid')
  })

  it('题号越界返回 invalid', () => {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draftOf(), currentQuestion: 99 }))
    expect(loadDraft(storage, 2026).status).toBe('invalid')
  })

  it('storage 写入抛错时只返回 false，不冒泡', () => {
    const broken = memoryStorage()
    vi.spyOn(broken, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })
    expect(saveDraft(broken, draftOf())).toBe(false)
  })

  it('storage 读取抛错时返回 invalid', () => {
    const broken = memoryStorage()
    vi.spyOn(broken, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(loadDraft(broken, 2026).status).toBe('invalid')
  })
})

describe('clearDraft', () => {
  it('清除幂等，重复调用都返回 true', () => {
    const storage = memoryStorage()
    saveDraft(storage, draftOf())
    expect(clearDraft(storage)).toBe(true)
    expect(clearDraft(storage)).toBe(true)
    expect(loadDraft(storage, 2026).status).toBe('missing')
  })

  it('清除抛错时返回 false', () => {
    const broken = memoryStorage()
    vi.spyOn(broken, 'removeItem').mockImplementation(() => {
      throw new Error('nope')
    })
    expect(clearDraft(broken)).toBe(false)
  })
})

describe('不保存草稿模式', () => {
  it('storage 为 null 时完全不触碰存储', () => {
    const storage = memoryStorage()
    const getItem = vi.spyOn(storage, 'getItem')
    const setItem = vi.spyOn(storage, 'setItem')

    expect(loadDraft(null, 2026).status).toBe('disabled')
    expect(saveDraft(null, draftOf())).toBe(false)
    expect(clearDraft(null)).toBe(false)
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })
})
