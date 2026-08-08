import { afterEach, describe, expect, it, vi } from 'vitest'
import { resultExcerpts, shareOrCopy } from './share'
import type { ChainEntry, PublicChain } from '../../worker/types'

function defineNavigator(key: string, value: unknown) {
  Object.defineProperty(navigator, key, { configurable: true, value })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('shareOrCopy', () => {
  it('Web Share 可用时走系统分享', async () => {
    const share = vi.fn(async () => {})
    const writeText = vi.fn(async () => {})
    defineNavigator('share', share)
    defineNavigator('clipboard', { writeText })

    await expect(
      shareOrCopy({ title: '下一问', text: '接力', url: 'https://e.com/a' }),
    ).resolves.toBe('share')
    expect(share).toHaveBeenCalledWith({ title: '下一问', text: '接力', url: 'https://e.com/a' })
    expect(writeText).not.toHaveBeenCalled()
  })

  it('用户在系统分享面板取消时降级为复制链接', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    })
    const writeText = vi.fn(async () => {})
    defineNavigator('share', share)
    defineNavigator('clipboard', { writeText })

    await expect(
      shareOrCopy({ title: 't', text: 'x', url: 'https://e.com/a' }),
    ).resolves.toBe('copy')
    expect(writeText).toHaveBeenCalledWith('https://e.com/a')
  })

  it('Web Share 不可用时直接复制链接', async () => {
    const writeText = vi.fn(async () => {})
    defineNavigator('share', undefined)
    defineNavigator('clipboard', { writeText })

    await expect(
      shareOrCopy({ title: 't', text: 'x', url: 'https://e.com/b' }),
    ).resolves.toBe('copy')
    expect(writeText).toHaveBeenCalledWith('https://e.com/b')
  })

  it('剪贴板也失败时仍返回 copy，由界面提示手动复制', async () => {
    defineNavigator('share', undefined)
    defineNavigator('clipboard', {
      writeText: vi.fn(async () => {
        throw new Error('denied')
      }),
    })
    await expect(
      shareOrCopy({ title: 't', text: 'x', url: 'https://e.com/c' }),
    ).resolves.toBe('copy')
  })
})

function entry(slot: number, overrides: Partial<ChainEntry> = {}): ChainEntry {
  return {
    slot: slot as ChainEntry['slot'],
    nickname: `第${slot}席`,
    answer: `第${slot}席的回答`,
    question: `第${slot}席的问题`,
    submittedAt: slot,
    redacted: false,
    ...overrides,
  }
}

function chain(entries: ChainEntry[]): PublicChain {
  return {
    slug: 'abcd1234abcd1234',
    status: 'completed',
    nextSlot: null,
    entries,
    createdAt: 1,
    updatedAt: 2,
    expiresAt: 3,
  }
}

describe('resultExcerpts', () => {
  it('最多 6 条，每条不超过 24 个 code points 加省略号', () => {
    const entries = [1, 2, 3, 4, 5, 6].map((slot) => entry(slot, { answer: '长'.repeat(40) }))
    const excerpts = resultExcerpts(chain(entries))
    expect(excerpts).toHaveLength(6)
    for (const excerpt of excerpts) {
      expect(Array.from(excerpt).length).toBeLessThanOrEqual(25)
      expect(excerpt.endsWith('…')).toBe(true)
    }
  })

  it('短回答原样保留；撤回席位显示统一占位文案', () => {
    const excerpts = resultExcerpts(
      chain([entry(1, { answer: '很短' }), entry(2, { redacted: true, answer: null })]),
    )
    expect(excerpts[0]).toBe('很短')
    expect(excerpts[1]).toBe('该内容已撤回')
  })
})
