import { describe, expect, it, vi } from 'vitest'
import worker from './index'
import type { PortalEnv } from './env'

function makeEnv(assetResponse = new Response('asset', { status: 200 })) {
  const fetchMock = vi.fn<(input: Request | string | URL, init?: RequestInit) => Promise<Response>>(
    async () => assetResponse,
  )
  const writeDataPoint = vi.fn()
  const env = {
    ASSETS: { fetch: fetchMock },
    PRODUCT_ANALYTICS: { writeDataPoint },
  } as unknown as PortalEnv
  return { env, fetchMock, writeDataPoint }
}

const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext

describe('portal worker entry', () => {
  it('校验并写入第一方产品事件后返回 202', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'generate',
          data: { slug: 'wang-gan', age: 34, ignored: 'secret' },
          path: '/internet-age/',
          referrer: 'https://example.cn/somewhere?q=private',
          sessionId: 'session-123',
        }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(202)
    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['session-123'],
      blobs: [
        'generate',
        '/internet-age/',
        'example.cn',
        'wang-gan',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      doubles: [1, 0, 0, 0, 34, 0],
    })
  })

  it('上班回本片段结束事件只记录场景与时长桶枚举', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'scene_finished',
          data: { slug: 'salary-timer', scene: 'meeting', duration_bucket: '5to15m' },
          path: '/salary-timer/',
          sessionId: 'session-123',
        }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(202)
    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        blobs: [
          'scene_finished',
          '/salary-timer/',
          '',
          'salary-timer',
          '',
          '',
          '',
          'meeting',
          '',
          '',
          '',
          '',
          '',
          '',
          '5to15m',
        ],
      }),
    )
  })

  it('睡眠银行时间账本事件被接受且不带任何作息数值', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'time_ledger_generated',
          path: '/life-grid/',
          sessionId: 'session-123',
        }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(202)
    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        blobs: [
          'time_ledger_generated',
          '/life-grid/',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
      }),
    )
  })

  it('道歉与请假复制事件只记录枚举，不携带称呼与正文', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'copy',
          data: {
            mode: 'document',
            type: 'leave',
            scene: 'sick',
            audience: 'boss',
            tone: 'sincere',
            kind: 'usable',
          },
          path: '/refusal-generator/',
          sessionId: 'session-123',
        }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(202)
    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        blobs: [
          'copy',
          '/refusal-generator/',
          '',
          '',
          'document',
          '',
          '',
          'sick',
          'sincere',
          'leave',
          'boss',
          'usable',
          '',
          '',
          '',
        ],
      }),
    )
  })

  it('文书模式切换与编辑后复制事件被接受', async () => {
    const { env, writeDataPoint } = makeEnv()
    for (const event of ['mode_selected', 'edited_before_copy'] as const) {
      const response = await worker.fetch(
        new Request('https://example.com/api/events', {
          method: 'POST',
          body: JSON.stringify({
            event,
            data: { mode: 'document', tone: 'sincere' },
            path: '/refusal-generator/',
            sessionId: 'session-123',
          }),
        }),
        env,
        ctx,
      )
      expect(response.status).toBe(202)
    }
    expect(writeDataPoint).toHaveBeenCalledTimes(2)
  })

  it('拒绝未知事件且不写入统计', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({ event: 'steal_everything', path: '/', sessionId: 'session-123' }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ code: 'invalid_event' })
    expect(writeDataPoint).not.toHaveBeenCalled()
  })

  it('产品事件接口只接受 POST', async () => {
    const { env } = makeEnv()
    const response = await worker.fetch(new Request('https://example.com/api/events'), env, ctx)
    expect(response.status).toBe(405)
  })

  it('未知 API 返回 JSON 404，不回退静态资产', async () => {
    const { env, fetchMock } = makeEnv()

    const response = await worker.fetch(new Request('https://example.com/api/nope'), env, ctx)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'not_found' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('AI 判官 API 已接入：无绑定的开发态返回 fallback 判词', async () => {
    const { env } = makeEnv()

    const response = await worker.fetch(
      new Request('https://example.com/api/ai-judge/verdict', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nickname: '阿福',
          intro: '爱熬夜',
          dailyId: '3f2c9a1e-8b4d-4c6e-9f0a-1b2c3d4e5f60',
        }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { source?: string; verdict?: unknown }
    expect(body.source).toBe('fallback')
    expect(body.verdict).toBeTruthy()
  })

  it('AI 判官未知子路由返回 JSON 404，不回退 HTML', async () => {
    const { env, fetchMock } = makeEnv()

    const response = await worker.fetch(new Request('https://example.com/api/ai-judge/nope'), env, ctx)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'not_found' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('尚未接入的玩法 API 返回 503 feature_unavailable', async () => {
    const { env } = makeEnv()

    const hold = await worker.fetch(new Request('https://example.com/api/hold-button/session'), env, ctx)
    expect(hold.status).toBe(503)
    expect(await hold.json()).toEqual({ code: 'feature_unavailable', feature: 'hold-button' })
  })

  it('深链接改写为玩法页并保留 query 后交给静态资产', async () => {
    const { env, fetchMock } = makeEnv()

    await worker.fetch(new Request('https://example.com/tacit-test/c?d=abc'), env, ctx)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const forwarded = fetchMock.mock.calls[0][0] as Request
    expect(forwarded.url).toContain('/tacit-test/')
    expect(new URL(forwarded.url).pathname).toBe('/tacit-test/')
    expect(new URL(forwarded.url).searchParams.get('d')).toBe('abc')
  })

  it('普通路径直接交给静态资产', async () => {
    const { env, fetchMock } = makeEnv()

    const response = await worker.fetch(new Request('https://example.com/life-grid/'), env, ctx)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await response.text()).toBe('asset')
  })
})
