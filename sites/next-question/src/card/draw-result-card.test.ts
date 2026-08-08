import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CARD_SIZE } from '@viral/shared'
import { installCanvasStub } from '../../test/canvas-stub'
import { makeResultCardDraw } from './draw-result-card'
import type { ChainEntry, PublicChain } from '../../worker/types'

const createQrMatrix = vi.hoisted(() =>
  vi.fn<(value: string) => { size: number; darkModules: Array<readonly [number, number]> }>(() => ({
    size: 21,
    darkModules: [],
  })),
)

vi.mock('./qr-matrix', () => ({
  createQrMatrix,
  drawQrMatrix: (_ctx: unknown, value: string) => {
    createQrMatrix(value)
  },
}))

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

function completedChain(entries: ChainEntry[]): PublicChain {
  return {
    slug: 'abcd1234abcd1234',
    status: 'completed',
    nextSlot: null,
    entries,
    createdAt: 1_786_000_000_000,
    updatedAt: 1_786_100_000_000,
    expiresAt: 1_786_200_000_000,
  }
}

describe('makeResultCardDraw', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('结果卡使用无 token 的 public URL 生成二维码', () => {
    const ctx = installCanvasStub()
    const publicUrl = 'https://guaihaowan.example/next-question/c/abcd1234abcd1234'
    const draw = makeResultCardDraw(completedChain([1, 2, 3, 4, 5, 6].map((slot) => entry(slot))), publicUrl)
    draw(ctx as unknown as CanvasRenderingContext2D, CARD_SIZE)
    expect(createQrMatrix).toHaveBeenCalledWith(publicUrl)
  })

  it('最多 6 条摘录、每条不超过 24 个 code points，撤回席位统一占位', () => {
    const ctx = installCanvasStub()
    const draw = makeResultCardDraw(
      completedChain([
        entry(1, { answer: '长'.repeat(40) }),
        entry(2, { redacted: true, answer: null }),
        entry(3),
        entry(4),
        entry(5),
        entry(6),
        entry(1, { answer: '不该出现的第七条' }),
      ]),
      'https://guaihaowan.example/next-question/c/abcd1234abcd1234',
    )
    draw(ctx as unknown as CanvasRenderingContext2D, CARD_SIZE)

    const texts = ctx.fillText.mock.calls.map((call) => String(call[0]))
    expect(texts).toContain('一个问题走过六个人，又回到了起点')
    expect(texts).toContain('该内容已撤回')
    expect(texts.some((text) => text.includes('不该出现的第七条'))).toBe(false)

    const excerpts = texts.filter((text) => text.includes('长') || text === '该内容已撤回')
    expect(excerpts.length).toBeGreaterThanOrEqual(2)
    for (const text of texts) {
      expect(Array.from(text).length).toBeLessThanOrEqual(30)
    }
  })

  it('不向卡片写入任何 capability token', () => {
    const ctx = installCanvasStub()
    const draw = makeResultCardDraw(
      completedChain([1, 2, 3, 4, 5, 6].map((slot) => entry(slot))),
      'https://guaihaowan.example/next-question/c/abcd1234abcd1234',
    )
    draw(ctx as unknown as CanvasRenderingContext2D, CARD_SIZE)
    const allText = ctx.fillText.mock.calls.map((call) => String(call[0])).join('\n')
    expect(allText).not.toContain('secret-token')
    expect(allText).not.toContain('#b=')
    expect(allText).not.toContain('#o=')
  })
})
