import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy, type AnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'
import { DRAFT_STORAGE_KEY, type DraftV1 } from './lib/draft-storage'
import { encodePublicReport, REPORT_FRAGMENT_PREFIX } from './lib/report-codec'

type User = ReturnType<typeof userEvent.setup>

const YEAR = new Date().getFullYear()

let analyticsSpy: AnalyticsSpy

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  analyticsSpy = installAnalyticsSpy()
})

afterEach(() => {
  removeAnalyticsSpy()
  vi.restoreAllMocks()
})

function events(): string[] {
  return analyticsSpy.mock.calls.map(([event]) => event)
}

async function next(user: User) {
  await user.click(screen.getByRole('button', { name: '继续' }))
}

async function skip(user: User) {
  await user.click(screen.getByRole('button', { name: '跳过这题' }))
}

/** 走完十问：填四题、跳四题、量表选一档、目标用默认完成度 */
async function walkAllQuestions(user: User) {
  expect(screen.getByText('第一章 · 先从容易的开始')).toBeInTheDocument()
  await next(user)

  await user.type(screen.getByRole('textbox', { name: '今年的一个关键词' }), '重启')
  await next(user)
  await user.type(screen.getByRole('textbox', { name: '今年去过最远或最难忘的地方' }), '县城的老家')
  await next(user)

  expect(screen.getByText('第二章 · 生活的声音和味道')).toBeInTheDocument()
  await next(user)
  await skip(user)
  await skip(user)
  await skip(user)

  expect(screen.getByText('第三章 · 今年的天气')).toBeInTheDocument()
  await next(user)
  await user.type(screen.getByRole('textbox', { name: '今年做成的一件小事' }), '学会了游一百米')
  await next(user)
  await skip(user)
  await user.click(screen.getByRole('button', { name: /偏轻松/ }))
  await next(user)

  expect(screen.getByText('第四章 · 留给明年')).toBeInTheDocument()
  await next(user)
  await next(user)
  await user.type(screen.getByRole('textbox', { name: '写给明年自己的一句话' }), '先睡够，再谈别的')
  await next(user)
}

function storedDraft(): DraftV1 {
  return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!) as DraftV1
}

describe('App 答题主流程', () => {
  it('首屏 → 四次章节过渡 → 十问 → 复核 → 报告', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: '年度报告' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '开始回答（本机保存草稿）' }))
    await walkAllQuestions(user)

    expect(screen.getByRole('heading', { name: `${YEAR} 年，你写下的十条` })).toBeInTheDocument()
    expect(screen.getByText('重启')).toBeInTheDocument()
    expect(screen.getByText('偏轻松')).toBeInTheDocument()
    // 跳过的四题在复核页明确写「跳过了」，不编造内容
    expect(screen.getAllByText('跳过了')).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: '生成我的年度报告' }))
    expect(screen.getByRole('heading', { name: '你的年度报告' })).toBeInTheDocument()
    // 跳过的题整页省略：这份答案只生成封面/地方/天气/账单/结尾五页
    expect(screen.getByRole('status')).toHaveTextContent('第 1 / 5 页')
    expect(events()).toContain('generate')
  })

  it('复核页可以改一改，也可以删掉某条', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '开始回答（本机保存草稿）' }))
    await walkAllQuestions(user)

    await user.click(screen.getAllByRole('button', { name: '改一改' })[0]!)
    const input = screen.getByRole('textbox', { name: '今年的一个关键词' })
    expect(input).toHaveValue('重启')
    await user.clear(input)
    await user.type(input, '搬家')
    await next(user)
    // 从复核页进来的编辑，提交后直接回复核页，不会重走后面的题
    expect(screen.getByRole('heading', { name: `${YEAR} 年，你写下的十条` })).toBeInTheDocument()
    expect(screen.getByText('搬家')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '删掉这条' })[0]!)
    expect(screen.queryByText('搬家')).not.toBeInTheDocument()
    expect(screen.getAllByText('跳过了')).toHaveLength(5)
  })

  it('每题都上报题号与是否跳过，且不带答案内容', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '开始回答（本机保存草稿）' }))
    await next(user)
    await user.type(screen.getByRole('textbox', { name: '今年的一个关键词' }), '重启')
    await next(user)
    await skip(user)

    expect(analyticsSpy).toHaveBeenCalledWith('question_completed', {
      question: 'keyword',
      skipped: 'answered',
    })
    expect(analyticsSpy).toHaveBeenCalledWith('question_completed', {
      question: 'place',
      skipped: 'skipped',
    })
    expect(JSON.stringify(analyticsSpy.mock.calls)).not.toContain('重启')
  })
})

describe('App 草稿', () => {
  it('保存草稿模式下逐题写入本机，重进能续答', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await user.click(screen.getByRole('button', { name: '开始回答（本机保存草稿）' }))
    await next(user)
    await user.type(screen.getByRole('textbox', { name: '今年的一个关键词' }), '重启')
    await next(user)

    expect(storedDraft()).toMatchObject({
      version: 1,
      reportYear: YEAR,
      currentQuestion: 1,
      answers: { keyword: '重启' },
    })

    first.unmount()
    render(<App />)
    expect(screen.getByText('上次写到第 2 题')).toBeInTheDocument()
    expect(screen.getByText('已经写了 1 题，草稿只存在本机。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '继续上次' }))
    expect(screen.getByRole('textbox', { name: '今年去过最远或最难忘的地方' })).toBeInTheDocument()
    expect(events()).toContain('draft_resumed')
  })

  it('删掉草稿后首屏不再提示续答', async () => {
    const user = userEvent.setup()
    const draft: DraftV1 = {
      version: 1,
      reportYear: YEAR,
      currentQuestion: 3,
      answers: { keyword: '熬' },
      updatedAt: Date.now(),
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    render(<App />)

    expect(screen.getByText('上次写到第 4 题')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '删掉草稿重新写' }))
    expect(screen.queryByText('上次写到第 4 题')).not.toBeInTheDocument()
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    expect(events()).toContain('draft_cleared')
  })

  it('不保存草稿模式下一个字都不写进 localStorage', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '不保存草稿（公共设备）' }))
    await walkAllQuestions(user)

    expect(localStorage.length).toBe(0)
    expect(analyticsSpy).toHaveBeenCalledWith('report_started', { mode: 'no-draft' })
  })

  it('生成报告后草稿被清掉', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '开始回答（本机保存草稿）' }))
    await walkAllQuestions(user)
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull()

    await user.click(screen.getByRole('button', { name: '生成我的年度报告' }))
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
  })
})

describe('App 接收分享链接', () => {
  const fragment = `#${REPORT_FRAGMENT_PREFIX}${encodePublicReport({
    version: 1,
    year: 2026,
    answers: { keyword: '重启', 'feeling-scale': 4 },
  })}`

  it('合法链接只渲染接收者视图，并只上报字段数量', () => {
    render(<App fragment={fragment} />)

    expect(screen.getByRole('heading', { name: '别人分享给你的年度报告' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '开始回答（本机保存草稿）' })).not.toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('share_report_opened', { version: 1, field_count: 2 })
    expect(JSON.stringify(analyticsSpy.mock.calls)).not.toContain('重启')
  })

  it('接收者视图不读也不写本机草稿', () => {
    const draft: DraftV1 = {
      version: 1,
      reportYear: YEAR,
      currentQuestion: 3,
      answers: { keyword: '熬' },
      updatedAt: Date.now(),
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    render(<App fragment={fragment} />)

    expect(screen.queryByText('上次写到第 4 题')).not.toBeInTheDocument()
    expect(storedDraft()).toMatchObject({ answers: { keyword: '熬' } })
  })

  it('从接收者视图可以进自己的答题流程', async () => {
    const user = userEvent.setup()
    render(<App fragment={fragment} />)

    await user.click(screen.getByRole('button', { name: '我也写一份' }))
    expect(screen.getByRole('button', { name: '开始回答（本机保存草稿）' })).toBeInTheDocument()
  })

  it('损坏的链接直说读不出来，并给出自己写一份的入口', async () => {
    const user = userEvent.setup()
    render(<App fragment={`#${REPORT_FRAGMENT_PREFIX}broken!!!`} />)

    expect(screen.getByRole('heading', { name: '这份报告链接无法读取' })).toBeInTheDocument()
    expect(screen.getByText(/我们这边没有备份/)).toBeInTheDocument()
    expect(events()).not.toContain('share_report_opened')

    await user.click(screen.getByRole('button', { name: '我自己写一份' }))
    expect(screen.getByRole('button', { name: '开始回答（本机保存草稿）' })).toBeInTheDocument()
  })

  it('不是分享链接的 hash 照常显示首屏', () => {
    render(<App fragment="#section-2" />)
    expect(screen.getByRole('heading', { name: '年度报告' })).toBeInTheDocument()
  })
})

describe('App 全局说明', () => {
  it('页脚固定说明答案只留在本机', () => {
    render(<App fragment="" />)
    expect(screen.getByText(/答案只留在这台设备上，服务器不保存任何一条/)).toBeInTheDocument()
  })
})
