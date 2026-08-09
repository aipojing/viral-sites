import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'
import type { Verdict } from './lib/verdict'

const VALID_VERDICT: Verdict = {
  crime: '拖延成瘾罪',
  verdict:
    '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零，收藏的教程从未打开第二次。本官念其态度尚可。',
  sentence: '判处早睡三个月，缓期执行',
  seal: '赛博衙门 · 即日生效',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function mockApi(response: Response | (() => Response)): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => (typeof response === 'function' ? response() : response))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('App', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  async function submitCase() {
    await userEvent.type(screen.getByLabelText(/你的名号/), '阿福')
    await userEvent.click(screen.getByRole('button', { name: /升.*堂/ }))
  }

  it('成功链路：落地 → 升堂 → 判词，记录 generate', async () => {
    const fetchMock = mockApi(json(200, { verdict: VALID_VERDICT, source: 'model' }))
    render(<App />)
    await submitCase()

    expect(await screen.findByRole('heading', { name: '拖延成瘾罪' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(analyticsSpy).toHaveBeenCalledWith('generate', { slug: 'ai-judge' })
    expect(analyticsSpy.mock.calls.map((c) => c[0])).not.toContain('fallback_used')
  })

  it('cache 命中只记录 generate，不记 fallback_used', async () => {
    mockApi(json(200, { verdict: VALID_VERDICT, source: 'cache' }))
    render(<App />)
    await submitCase()
    await screen.findByRole('heading', { name: '拖延成瘾罪' })
    expect(analyticsSpy.mock.calls.map((c) => c[0])).not.toContain('fallback_used')
  })

  it('fallback 结果：另记 fallback_used 且页面给降级说明', async () => {
    mockApi(json(200, { verdict: VALID_VERDICT, source: 'fallback' }))
    render(<App />)
    await submitCase()
    await screen.findByRole('heading', { name: '拖延成瘾罪' })
    expect(analyticsSpy).toHaveBeenCalledWith('fallback_used', { slug: 'ai-judge' })
    expect(screen.getByText(/官印判词库/)).toBeInTheDocument()
  })

  it('422 命中禁区：温和拒绝且不记 generate', async () => {
    mockApi(json(422, { code: 'case_refused' }))
    render(<App />)
    await submitCase()
    expect(await screen.findByText('本官不审此案')).toBeInTheDocument()
    expect(analyticsSpy.mock.calls.map((c) => c[0])).not.toContain('generate')
  })

  it('429 超过每日次数：熔断文案 + rate_limited 事件', async () => {
    mockApi(json(429, { code: 'rate_limited' }))
    render(<App />)
    await submitCase()
    expect(await screen.findByText('本官今日已阅卷过多')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('rate_limited', { slug: 'ai-judge' })
  })

  it('503 预算暂停：衙门下班文案 + budget_paused 事件', async () => {
    mockApi(json(503, { code: 'court_closed' }))
    render(<App />)
    await submitCase()
    expect(await screen.findByText('衙门今日已下班')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('budget_paused', { slug: 'ai-judge' })
  })

  it('网络错误：展示重试并可再次提交', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new TypeError('network down')
      return json(200, { verdict: VALID_VERDICT, source: 'model' })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await submitCase()

    expect(await screen.findByText('堂上传讯出了岔子')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重试' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: '拖延成瘾罪' })).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('再审一案回到落地屏', async () => {
    mockApi(json(200, { verdict: VALID_VERDICT, source: 'model' }))
    render(<App />)
    await submitCase()
    await screen.findByRole('heading', { name: '拖延成瘾罪' })
    await userEvent.click(screen.getByRole('button', { name: /再\s*审\s*一\s*案/ }))
    expect(screen.getByRole('button', { name: /升.*堂/ })).toBeInTheDocument()
  })
})
