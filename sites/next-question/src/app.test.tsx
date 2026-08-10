import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './app'
import type { ChainEntry, PublicChain, Slot, SubmitBatonResult } from '../worker/types'

vi.mock('@viral/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@viral/shared')>()
  return { ...actual, track: vi.fn(), startAnalytics: vi.fn() }
})

const {
  createChain,
  getChain,
  submitBaton,
  closeChain,
  redactChain,
  deleteChain,
  ApiError,
} = vi.hoisted(() => ({
  createChain: vi.fn(),
  getChain: vi.fn(),
  submitBaton: vi.fn(),
  closeChain: vi.fn(),
  redactChain: vi.fn(),
  deleteChain: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
    ) {
      super(code)
    }
  },
}))

vi.mock('./lib/api-client', () => ({
  createChain,
  getChain,
  submitBaton,
  closeChain,
  redactChain,
  deleteChain,
  ApiError,
}))

const SLUG = 'abcd1234abcd1234'

function makeEntry(slot: Slot, overrides: Partial<ChainEntry> = {}): ChainEntry {
  return {
    slot,
    nickname: `第${slot}席`,
    answer: slot === 1 ? null : `第${slot}席的回答`,
    question: `第${slot}席的问题`,
    submittedAt: 1_786_000_000_000 + slot * 1000,
    redacted: false,
    ...overrides,
  }
}

function makeChain(
  status: PublicChain['status'],
  nextSlot: PublicChain['nextSlot'],
  entries: ChainEntry[] = [],
): PublicChain {
  return {
    slug: SLUG,
    status,
    nextSlot,
    entries,
    createdAt: 1_786_000_000_000,
    updatedAt: 1_786_000_000_000,
    expiresAt: 1_786_604_800_000,
  }
}

function goTo(path: string) {
  window.history.replaceState(null, '', path)
}

async function fillField(label: RegExp, value: string) {
  const user = userEvent.setup()
  const field = screen.getByLabelText(label)
  await user.clear(field)
  if (value !== '') await user.type(field, value)
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  goTo('/next-question/')
})

describe('首页（发起页）', () => {
  it('只有昵称、第一问与创建入口，没有年龄/人数/模板', async () => {
    render(<App />)
    expect(await screen.findByText('留一个问题，看它会经过谁')).toBeInTheDocument()
    expect(screen.getByLabelText(/昵称/)).toBeInTheDocument()
    expect(screen.getByLabelText(/第一个问题/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发出第一问' })).toBeInTheDocument()
    expect(screen.queryByText(/年龄/)).not.toBeInTheDocument()
    expect(screen.queryByText(/人数/)).not.toBeInTheDocument()
    expect(screen.queryByText(/模板/)).not.toBeInTheDocument()
    expect(screen.getByText(/回答会出现在这条接力的结果页/)).toBeInTheDocument()
  })

  it('创建成功保存 owner 与 baton token，进入第 2 棒传棒页', async () => {
    createChain.mockResolvedValue({
      chain: makeChain('waiting', 2, [makeEntry(1)]),
      ownerToken: 'owner-token-value',
      batonToken: 'baton-token-value',
    })
    render(<App />)

    await fillField(/昵称/, '甲')
    await fillField(/第一个问题/, '你最近在想什么？')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '发出第一问' }))

    expect(await screen.findByText(/把第 2 棒交给一个人/)).toBeInTheDocument()
    expect(localStorage.getItem(`next-question:owner:${SLUG}`)).toBe('owner-token-value')
    expect(localStorage.getItem(`next-question:baton:${SLUG}`)).toBe('baton-token-value')
    expect(createChain).toHaveBeenCalledTimes(1)
    const input = createChain.mock.calls[0][0]
    expect(input.nickname).toBe('甲')
    expect(input.question).toBe('你最近在想什么？')
    expect(input.requestId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('创建失败保留草稿并显示服务端文案', async () => {
    createChain.mockRejectedValue(new ApiError(429, 'rate_limited'))
    render(<App />)
    await fillField(/昵称/, '甲')
    await fillField(/第一个问题/, '你最近在想什么？')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '发出第一问' }))

    expect(await screen.findByText(/今天发出的问题有点多/)).toBeInTheDocument()
    expect(screen.getByLabelText(/昵称/)).toHaveValue('甲')
    expect(screen.getByLabelText(/第一个问题/)).toHaveValue('你最近在想什么？')
  })
})

describe('接棒页', () => {
  it('带 baton fragment 打开时收取 token、清理地址栏并只展示当前问题', async () => {
    goTo(`/next-question/c/${SLUG}#b=baton-token-value`)
    getChain.mockResolvedValue(
      makeChain('waiting', 3, [makeEntry(1), makeEntry(2)]),
    )
    render(<App />)

    expect(await screen.findByText(/第 3 \/ 6 棒/)).toBeInTheDocument()
    // 当前问题是第 2 席留下的
    expect(screen.getByText('第2席的问题')).toBeInTheDocument()
    // 提交前不展示历史回答
    expect(screen.queryByText('第2席的回答')).not.toBeInTheDocument()
    expect(localStorage.getItem(`next-question:baton:${SLUG}`)).toBe('baton-token-value')
    expect(window.location.hash).toBe('')
  })

  it('第 3 席提交成功：保存席位 token 并进入第 4 棒传棒页', async () => {
    goTo(`/next-question/c/${SLUG}#b=baton-token-value`)
    getChain.mockResolvedValue(makeChain('waiting', 3, [makeEntry(1), makeEntry(2)]))
    submitBaton.mockResolvedValue({
      chain: makeChain('waiting', 4, [makeEntry(1), makeEntry(2), makeEntry(3)]),
      participantToken: 'participant-3-token',
      nextBatonToken: 'next-baton-token',
    } satisfies SubmitBatonResult)
    render(<App />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /接下这一棒/ }))
    await fillField(/昵称/, '丙')
    await fillField(/回答/, '在想一个人。')
    await fillField(/下一问/, '那你呢？')
    await user.click(screen.getByRole('button', { name: /提交/ }))

    expect(await screen.findByText(/把第 4 棒交给一个人/)).toBeInTheDocument()
    expect(localStorage.getItem(`next-question:participant:${SLUG}:3`)).toBe('participant-3-token')
    expect(submitBaton.mock.calls[0][0]).toBe(SLUG)
    expect(submitBaton.mock.calls[0][1]).toBe('baton-token-value')
  })

  it('第 6 席提交后显示问题已经回到起点，不再寻找第 7 人', async () => {
    goTo(`/next-question/c/${SLUG}#b=baton-token-value`)
    getChain.mockResolvedValue(
      makeChain('waiting', 6, [makeEntry(1), makeEntry(2), makeEntry(3), makeEntry(4), makeEntry(5)]),
    )
    submitBaton.mockResolvedValue({
      chain: makeChain('returned', 1, [
        makeEntry(1),
        makeEntry(2),
        makeEntry(3),
        makeEntry(4),
        makeEntry(5),
        makeEntry(6),
      ]),
      participantToken: 'participant-6-token',
      nextBatonToken: null,
    } satisfies SubmitBatonResult)
    render(<App />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /接下这一棒/ }))
    await fillField(/昵称/, '己')
    await fillField(/回答/, '我的回答。')
    await fillField(/下一问/, '回到起点的问题')
    await user.click(screen.getByRole('button', { name: /提交/ }))

    expect(await screen.findByText(/问题已经回到起点/)).toBeInTheDocument()
    expect(screen.queryByText(/第 7 棒/)).not.toBeInTheDocument()
  })

  it('409 抢棒失败后自动重新加载链条，显示谁已接走', async () => {
    goTo(`/next-question/c/${SLUG}#b=baton-token-value`)
    getChain
      .mockResolvedValueOnce(makeChain('waiting', 3, [makeEntry(1), makeEntry(2)]))
      .mockResolvedValueOnce(
        makeChain('waiting', 4, [makeEntry(1), makeEntry(2), makeEntry(3, { nickname: '抢先者' })]),
      )
    submitBaton.mockRejectedValue(new ApiError(409, 'chain_advanced'))
    render(<App />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /接下这一棒/ }))
    await fillField(/昵称/, '丙')
    await fillField(/回答/, '我的回答。')
    await fillField(/下一问/, '我的下一问')
    await user.click(screen.getByRole('button', { name: /提交/ }))

    expect(await screen.findByText(/这一棒已经被别人接走了/)).toBeInTheDocument()
    expect(screen.getByText('抢先者')).toBeInTheDocument()
    expect(getChain).toHaveBeenCalledTimes(2)
  })

  it('失效接棒 token 提交时给出可读提示并保留草稿', async () => {
    goTo(`/next-question/c/${SLUG}#b=stale-token`)
    getChain.mockResolvedValue(
      makeChain('waiting', 4, [makeEntry(1), makeEntry(2), makeEntry(3)]),
    )
    submitBaton.mockRejectedValue(new ApiError(403, 'invalid_token'))
    render(<App />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /接下这一棒/ }))
    await fillField(/昵称/, '丁')
    await fillField(/回答/, '我的回答。')
    await fillField(/下一问/, '我的下一问')
    await user.click(screen.getByRole('button', { name: /提交/ }))

    expect(await screen.findByText(/这不是当前可用的接力棒/)).toBeInTheDocument()
    expect(screen.getByLabelText(/昵称/)).toHaveValue('丁')
  })
})

describe('守环页与收尾', () => {
  it('returned 状态下 owner 看到 Q6 回答框，普通访客看不到', async () => {
    const returned = makeChain('returned', 1, [
      makeEntry(1),
      makeEntry(2),
      makeEntry(3),
      makeEntry(4),
      makeEntry(5),
      makeEntry(6),
    ])

    goTo(`/next-question/c/${SLUG}`)
    localStorage.setItem(`next-question:owner:${SLUG}`, 'owner-token-value')
    getChain.mockResolvedValue(returned)
    const { unmount } = render(<App />)
    expect(await screen.findByText(/回答最后一问/)).toBeInTheDocument()
    expect(screen.getByLabelText(/回答/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /删除这条接力/ })).toBeInTheDocument()
    unmount()

    vi.clearAllMocks()
    localStorage.removeItem(`next-question:owner:${SLUG}`)
    getChain.mockResolvedValue(returned)
    render(<App />)
    expect(await screen.findByText(/只等出发的人回答/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/回答/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /删除这条接力/ })).not.toBeInTheDocument()
  })

  it('owner 回答 Q6 后进入结果页', async () => {
    goTo(`/next-question/c/${SLUG}`)
    localStorage.setItem(`next-question:owner:${SLUG}`, 'owner-token-value')
    const returned = makeChain('returned', 1, [
      makeEntry(1),
      makeEntry(2),
      makeEntry(3),
      makeEntry(4),
      makeEntry(5),
      makeEntry(6),
    ])
    getChain.mockResolvedValue(returned)
    closeChain.mockResolvedValue(
      makeChain('completed', null, [
        makeEntry(1, { answer: '值得。' }),
        makeEntry(2),
        makeEntry(3),
        makeEntry(4),
        makeEntry(5),
        makeEntry(6),
      ]),
    )
    render(<App />)

    await screen.findByText(/回答最后一问/)
    const user = userEvent.setup()
    await fillField(/回答/, '值得。')
    await user.click(screen.getByRole('button', { name: /完成闭环/ }))

    expect(await screen.findByText(/一个问题走过六个人，又回到了起点/)).toBeInTheDocument()
    expect(screen.getByText('值得。')).toBeInTheDocument()
    expect(closeChain.mock.calls[0][1]).toBe('owner-token-value')
  })

  it('刷新后依靠 URL + token vault 恢复守环页', async () => {
    localStorage.setItem(`next-question:owner:${SLUG}`, 'owner-token-value')
    goTo(`/next-question/c/${SLUG}`)
    getChain.mockResolvedValue(makeChain('waiting', 3, [makeEntry(1), makeEntry(2)]))
    render(<App />)
    expect(await screen.findByText(/第 1 席/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /删除这条接力/ })).toBeInTheDocument()
  })
})

describe('结果页与失效状态', () => {
  it('completed 链条进入结果页，按 Q/A 配对展示并标注提问者与回答者', async () => {
    goTo(`/next-question/c/${SLUG}`)
    getChain.mockResolvedValue(
      makeChain('completed', null, [
        makeEntry(1, { answer: '值得。' }),
        makeEntry(2),
        makeEntry(3),
        makeEntry(4),
        makeEntry(5),
        makeEntry(6),
      ]),
    )
    render(<App />)
    expect(await screen.findByText(/一个问题走过六个人，又回到了起点/)).toBeInTheDocument()
    expect(screen.getByText('第1席的问题')).toBeInTheDocument()
    expect(screen.getByText('值得。')).toBeInTheDocument()
    // 第 6 席的问题由第 1 席回答
    expect(screen.getByText('第6席的问题')).toBeInTheDocument()
  })

  it('expired / cancelled / deleted / 404 各有独立文案', async () => {
    goTo(`/next-question/c/${SLUG}`)
    getChain.mockResolvedValue(makeChain('expired', null, []))
    const first = render(<App />)
    expect(await screen.findByText(/这条接力已经过期/)).toBeInTheDocument()
    first.unmount()

    vi.clearAllMocks()
    getChain.mockResolvedValue(makeChain('cancelled', null, [makeEntry(1)]))
    const second = render(<App />)
    expect(await screen.findByText(/有一棒撤回了问题，这条接力停在这里/)).toBeInTheDocument()
    second.unmount()

    vi.clearAllMocks()
    getChain.mockResolvedValue(makeChain('deleted', null, []))
    const third = render(<App />)
    expect(await screen.findByText(/这条问题不存在/)).toBeInTheDocument()
    third.unmount()

    vi.clearAllMocks()
    getChain.mockRejectedValue(new ApiError(404, 'chain_not_found'))
    render(<App />)
    expect((await screen.findAllByText(/这条问题不存在/)).length).toBeGreaterThan(0)
  })

  it('撤回内容在进度与结果中显示统一占位文案', async () => {
    goTo(`/next-question/c/${SLUG}`)
    getChain.mockResolvedValue(
      makeChain('completed', null, [
        makeEntry(1, { answer: '值得。' }),
        makeEntry(2, { redacted: true, nickname: '', answer: null, question: '' }),
        makeEntry(3),
        makeEntry(4),
        makeEntry(5),
        makeEntry(6),
      ]),
    )
    render(<App />)
    expect((await screen.findAllByText(/该内容已撤回/)).length).toBeGreaterThan(0)
    expect(screen.queryByText('第2席的回答')).not.toBeInTheDocument()
  })
})

describe('删除', () => {
  it('owner 确认后删除整条链并进入失效页', async () => {
    localStorage.setItem(`next-question:owner:${SLUG}`, 'owner-token-value')
    goTo(`/next-question/c/${SLUG}`)
    getChain.mockResolvedValue(makeChain('waiting', 3, [makeEntry(1), makeEntry(2)]))
    deleteChain.mockResolvedValue(undefined)
    render(<App />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /删除这条接力/ }))
    await user.click(await screen.findByRole('button', { name: /确认删除/ }))

    await waitFor(() => expect(deleteChain).toHaveBeenCalledTimes(1))
    expect(deleteChain.mock.calls[0][1]).toBe('owner-token-value')
    expect(await screen.findByText(/这条问题不存在/)).toBeInTheDocument()
  })

  it('进度页删除失败时保留页面并提示可重试', async () => {
    localStorage.setItem(`next-question:owner:${SLUG}`, 'owner-token-value')
    goTo(`/next-question/c/${SLUG}`)
    getChain.mockResolvedValue(makeChain('waiting', 3, [makeEntry(1), makeEntry(2)]))
    deleteChain.mockRejectedValue(new ApiError(500, 'internal_error'))
    render(<App />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /删除这条接力/ }))
    await user.click(screen.getByRole('button', { name: /确认删除/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/删除没有成功，请重试/)
    expect(screen.getByText(/这个问题正在路上/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /确认删除/ })).toBeEnabled()
  })

  it('结果页删除失败时保留页面并提示可重试', async () => {
    localStorage.setItem(`next-question:owner:${SLUG}`, 'owner-token-value')
    goTo(`/next-question/c/${SLUG}`)
    getChain.mockResolvedValue(
      makeChain('completed', null, [
        makeEntry(1, { answer: '值得。' }),
        makeEntry(2),
        makeEntry(3),
        makeEntry(4),
        makeEntry(5),
        makeEntry(6),
      ]),
    )
    deleteChain.mockRejectedValue(new ApiError(500, 'internal_error'))
    render(<App />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /删除这条接力/ }))
    await user.click(screen.getByRole('button', { name: /确认删除/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/删除没有成功，请重试/)
    expect(screen.getByText(/一个问题走过六个人，又回到了起点/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /确认删除/ })).toBeEnabled()
  })
})
