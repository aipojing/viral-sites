import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextQuestionMeta, serveNextQuestionShell } from './next-question-shell'
import type { PortalEnv } from './env'
import type { PublicChain } from '../../next-question/worker/types'

const SLUG = 'abcd1234abcd1234'

const SHELL_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>下一问 — 怪好玩</title>
    <meta name="description" content="占位描述" />
    <meta property="og:title" content="占位 OG 标题" />
    <meta property="og:description" content="占位 OG 描述" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

function makeChain(overrides: Partial<PublicChain> = {}): PublicChain {
  return {
    slug: SLUG,
    status: 'waiting',
    nextSlot: 3,
    entries: [
      {
        slot: 1,
        nickname: '甲',
        answer: null,
        question: '秘密问题正文',
        submittedAt: 1,
        redacted: false,
      },
      {
        slot: 2,
        nickname: '乙',
        answer: '秘密回答正文',
        question: '另一个秘密问题',
        submittedAt: 2,
        redacted: false,
      },
    ],
    createdAt: 1,
    updatedAt: 2,
    expiresAt: 3,
    ...overrides,
  }
}

interface RewrittenMeta {
  title?: string
  description?: string
  ogTitle?: string
  ogDescription?: string
}

// 最小 HTMLRewriter 替身：只覆盖 shell 用到的四个选择器。
class FakeElement {
  constructor(
    private apply: (value: string) => void,
  ) {}
  setInnerContent(content: string) {
    this.apply(content)
  }
  setAttribute(_name: string, value: string) {
    this.apply(value)
  }
}
class FakeHTMLRewriter {
  static last: FakeHTMLRewriter | null = null

  handlers = new Map<string, (element: FakeElement) => void>()
  lastMeta: RewrittenMeta = {}

  constructor() {
    FakeHTMLRewriter.last = this
  }

  on(selector: string, handler: { element(element: FakeElement): void }) {
    this.handlers.set(selector, handler.element)
    return this
  }

  transform(response: Response): Response {
    const meta: RewrittenMeta = {}
    for (const [selector, handler] of this.handlers) {
      handler(
        new FakeElement((value) => {
          if (selector === 'title') meta.title = value
          else if (selector === 'meta[name="description"]') meta.description = value
          else if (selector === 'meta[property="og:title"]') meta.ogTitle = value
          else if (selector === 'meta[property="og:description"]') meta.ogDescription = value
        }),
      )
    }
    this.lastMeta = meta
    return response
  }
}

function makeEnv(chain: PublicChain | null) {
  const idFromName = vi.fn((name: string) => ({ toString: () => name }))
  const getPublic = vi.fn(async () => chain)
  const assetsFetch = vi.fn(
    async (_input: Request | string | URL) =>
      new Response(SHELL_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
  )
  const env = {
    ASSETS: { fetch: assetsFetch },
    NEXT_QUESTION_CHAINS: {
      idFromName,
      get: () => ({ getPublic }),
    },
  } as unknown as PortalEnv
  return { env, idFromName, getPublic, assetsFetch }
}

beforeEach(() => {
  FakeHTMLRewriter.last = null
  vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter)
})

function rewrittenMeta(): RewrittenMeta {
  if (!FakeHTMLRewriter.last) throw new Error('HTMLRewriter 未被使用')
  return FakeHTMLRewriter.last.lastMeta
}

describe('nextQuestionMeta', () => {
  it('只根据状态与棒数生成 metadata，绝不引用用户文本', () => {
    expect(nextQuestionMeta(null)).toEqual({
      title: '下一问 · 六人问题接力',
      description: '回答上一棒，再把下一问交给一个人。六个人后，问题回到起点。',
    })
    const waiting = nextQuestionMeta(makeChain({ status: 'waiting', nextSlot: 3 }))
    expect(waiting.title).toBe('一个问题已经走到第 3 / 6 棒')
    expect(nextQuestionMeta(makeChain({ status: 'returned', nextSlot: 1 })).title).toBe(
      '问题已经回到起点',
    )
    expect(nextQuestionMeta(makeChain({ status: 'completed', nextSlot: null })).title).toBe(
      '一个问题走过六个人，又回到了起点',
    )
    for (const meta of [
      nextQuestionMeta(makeChain()),
      nextQuestionMeta(makeChain({ status: 'returned', nextSlot: 1 })),
      nextQuestionMeta(makeChain({ status: 'completed', nextSlot: null })),
      nextQuestionMeta(makeChain({ status: 'expired', nextSlot: null, entries: [] })),
      nextQuestionMeta(makeChain({ status: 'cancelled', nextSlot: null })),
      nextQuestionMeta(makeChain({ status: 'deleted', nextSlot: null, entries: [] })),
    ]) {
      expect(JSON.stringify(meta)).not.toContain('秘密')
      expect(JSON.stringify(meta)).not.toContain('甲')
      expect(JSON.stringify(meta)).not.toContain('乙')
    }
  })
})

describe('serveNextQuestionShell', () => {
  it('按 slug 取链条、用 ASSETS 的 /next-question/ 页面替换 metadata', async () => {
    const { env, idFromName, assetsFetch } = makeEnv(makeChain())
    const response = await serveNextQuestionShell(
      new Request(`https://guaihaowan.example/next-question/c/${SLUG}`),
      env,
      SLUG,
    )
    expect(idFromName).toHaveBeenCalledWith(SLUG)
    expect(assetsFetch).toHaveBeenCalledTimes(1)
    const forwarded = assetsFetch.mock.calls[0][0]
    expect(new URL((forwarded as Request).url).pathname).toBe('/next-question/')
    expect(response.status).toBe(200)
    expect(rewrittenMeta().title).toBe('一个问题已经走到第 3 / 6 棒')
    expect(rewrittenMeta().description).not.toBe('占位描述')
    expect(rewrittenMeta().ogTitle).toBe('一个问题已经走到第 3 / 6 棒')
  })

  it('未知链条使用缺省 metadata', async () => {
    const { env } = makeEnv(null)
    await serveNextQuestionShell(
      new Request(`https://guaihaowan.example/next-question/c/${SLUG}`),
      env,
      SLUG,
    )
    expect(rewrittenMeta().title).toBe('下一问 · 六人问题接力')
  })

  it('链条 shell 携带 no-store、noindex、no-referrer、nosniff', async () => {
    const { env } = makeEnv(makeChain())
    const response = await serveNextQuestionShell(
      new Request(`https://guaihaowan.example/next-question/c/${SLUG}`),
      env,
      SLUG,
    )
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })
})
