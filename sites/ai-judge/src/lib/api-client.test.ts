import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestVerdict } from './api-client'
import type { Verdict } from './verdict'

const VALID_VERDICT: Verdict = {
  crime: '拖延成瘾罪',
  verdict:
    '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零，收藏的教程从未打开第二次。本官念其态度尚可。',
  sentence: '判处早睡三个月，缓期执行',
  seal: '赛博衙门 · 即日生效',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  localStorage.clear()
  if (typeof AbortSignal.timeout !== 'function') {
    vi.stubGlobal('AbortSignal', { ...AbortSignal, timeout: () => new AbortController().signal })
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('requestVerdict', () => {
  it('提交昵称、简介与本地 dailyId，成功返回判词', async () => {
    const fetchMock = vi.fn(async (_input: string, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string) as Record<string, unknown>
      expect(body.nickname).toBe('阿福')
      expect(body.intro).toBe('爱熬夜')
      expect(typeof body.dailyId).toBe('string')
      expect((body.dailyId as string).length).toBeGreaterThan(0)
      return jsonResponse(200, { verdict: VALID_VERDICT, source: 'model' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await requestVerdict({ nickname: '阿福', intro: '爱熬夜' })
    expect(outcome).toEqual({ status: 'ok', result: { verdict: VALID_VERDICT, source: 'model' } })
    expect(fetchMock).toHaveBeenCalledWith('/api/ai-judge/verdict', expect.objectContaining({ method: 'POST' }))
  })

  it('响应判词越界：视为错误，不渲染不可信内容', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(200, { verdict: { ...VALID_VERDICT, crime: '超长罪名超过八个字' }, source: 'model' })),
    )
    expect(await requestVerdict({ nickname: '阿福', intro: '' })).toEqual({ status: 'error' })
  })

  it('source 不在白名单内：视为错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { verdict: VALID_VERDICT, source: 'evil' })))
    expect(await requestVerdict({ nickname: '阿福', intro: '' })).toEqual({ status: 'error' })
  })

  it('200 但响应体非 JSON：视为错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })))
    expect(await requestVerdict({ nickname: '阿福', intro: '' })).toEqual({ status: 'error' })
  })

  it('422 → refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(422, { code: 'case_refused' })))
    expect(await requestVerdict({ nickname: '阿福', intro: '' })).toEqual({ status: 'refused' })
  })

  it('429 rate_limited → rate_limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(429, { code: 'rate_limited' })))
    expect(await requestVerdict({ nickname: '阿福', intro: '' })).toEqual({ status: 'rate_limited' })
  })

  it('503 court_closed → paused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(503, { code: 'court_closed' })))
    expect(await requestVerdict({ nickname: '阿福', intro: '' })).toEqual({ status: 'paused' })
  })

  it('未知状态码 → error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, { code: 'boom' })))
    expect(await requestVerdict({ nickname: '阿福', intro: '' })).toEqual({ status: 'error' })
  })

  it('网络失败 → error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('network down'))))
    expect(await requestVerdict({ nickname: '阿福', intro: '' })).toEqual({ status: 'error' })
  })
})
