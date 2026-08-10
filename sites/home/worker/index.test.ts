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
      doubles: [1, 0, 0, 0, 34, 0, 0, 0, 0],
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

  it('文书模式切换、编辑后复制与安全降级事件被接受', async () => {
    const { env, writeDataPoint } = makeEnv()
    for (const event of ['mode_selected', 'edited_before_copy', 'safety_mode'] as const) {
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
    expect(writeDataPoint).toHaveBeenCalledTimes(3)
  })

  it('按住不放挑战事件只记录桶与枚举，不携带精确时长与 token', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'challenge_finished',
          data: { bucket: 23, reason: 'released', device: 'touch', token: 'secret-token' },
          path: '/hold-button/',
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
        'challenge_finished',
        '/hold-button/',
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
        'released',
        'touch',
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
      doubles: [1, 0, 0, 0, 0, 0, 23, 0, 0],
    })
  })

  it('一秒钟世界事件只记录章节/来源 id 与时长桶，不携带精确秒数', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'chapter_viewed',
          data: { chapter: 'planet', seconds: 47 },
          path: '/one-second-world/',
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
        'chapter_viewed',
        '/one-second-world/',
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
        '',
        '',
        '',
        'planet',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      doubles: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    })
  })

  it('亲戚称呼事件只记录枚举 token 与方法，不携带关系链原文', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'relation_step_added',
          data: { relation: 'older-brother', path: 'mother>older-brother' },
          path: '/kinship-calculator/',
          sessionId: 'session-123',
        }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(202)
    const call = writeDataPoint.mock.calls[0][0] as { blobs: string[] }
    expect(call.blobs[0]).toBe('relation_step_added')
    expect(call.blobs[21]).toBe('older-brother')
    // 关系链原文没有对应列，不会落库
    expect(call.blobs.join('\u0001')).not.toContain('mother>older-brother')
  })

  it('拒绝 query_resolved 携带手机号或答案，且不写入 Analytics Engine', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'query_resolved',
          data: { phone: '13800138000', answer: '你的关系链原文' },
          path: '/kinship-calculator/',
          sessionId: 'session-123',
        }),
      }),
      env,
      ctx,
    )
    expect(response.status).toBe(400)
    expect(writeDataPoint).not.toHaveBeenCalled()
  })

  it('亲戚称呼纠错与反查事件被接受，方式枚举落 method 列', async () => {
    const { env, writeDataPoint } = makeEnv()
    for (const [event, data] of [
      ['query_started', { mode: 'popular' }],
      ['query_resolved', {}],
      ['query_unresolved', { reason: 'not-covered' }],
      ['reverse_used', { method: 'hit' }],
      ['region_pack_used', { region: 'pack-yue' }],
      ['correction_submitted', { method: 'copy' }],
    ] as const) {
      const response = await worker.fetch(
        new Request('https://example.com/api/events', {
          method: 'POST',
          body: JSON.stringify({
            event,
            data,
            path: '/kinship-calculator/',
            sessionId: 'session-123',
          }),
        }),
        env,
        ctx,
      )
      expect(response.status).toBe(202)
    }
    expect(writeDataPoint).toHaveBeenCalledTimes(6)
  })

  it('一秒钟世界来源、时长桶与快照事件被接受且不带精确时长', async () => {
    const { env, writeDataPoint } = makeEnv()
    for (const [event, data] of [
      ['source_opened', { source: 'osw-cn-express' }],
      ['engaged_time_bucket', { bucket: '45_119' }],
      ['snapshot_generated', { duration_bucket: 'gte120' }],
    ] as const) {
      const response = await worker.fetch(
        new Request('https://example.com/api/events', {
          method: 'POST',
          body: JSON.stringify({
            event,
            data,
            path: '/one-second-world/',
            sessionId: 'session-123',
          }),
        }),
        env,
        ctx,
      )
      expect(response.status).toBe(202)
    }
    expect(writeDataPoint).toHaveBeenCalledTimes(3)
  })

  it('年度报告答题事件只落题号与 answered|skipped，答案原文不落库', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'question_completed',
          data: { question: 'keyword', skipped: 'answered', text: '重启' },
          path: '/year-report/',
          sessionId: 'session-123',
        }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(202)
    const call = writeDataPoint.mock.calls[0][0] as { blobs: string[]; doubles: number[] }
    expect(call.blobs[0]).toBe('question_completed')
    expect(call.blobs[24]).toBe('keyword')
    expect(call.blobs[25]).toBe('answered')
    // 答案原文没有对应列，不会被默默写进去
    expect(call.blobs.join('\u0001')).not.toContain('重启')
  })

  it('年度报告分享事件只落字段数量与版本号', async () => {
    const { env, writeDataPoint } = makeEnv()
    const response = await worker.fetch(
      new Request('https://example.com/api/events', {
        method: 'POST',
        body: JSON.stringify({
          event: 'share_report_opened',
          data: { field_count: 4, version: 1, answers: { keyword: '重启' } },
          path: '/year-report/',
          sessionId: 'session-123',
        }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(202)
    const call = writeDataPoint.mock.calls[0][0] as { blobs: string[]; doubles: number[] }
    expect(call.doubles[7]).toBe(4)
    expect(call.doubles[8]).toBe(1)
    expect(JSON.stringify(call)).not.toContain('重启')
  })

  it('年度报告开始、草稿与建链事件全部被接受', async () => {
    const { env, writeDataPoint } = makeEnv()
    for (const [event, data] of [
      ['report_started', { mode: 'no-draft' }],
      ['draft_resumed', {}],
      ['draft_cleared', {}],
      ['share_link_created', { field_count: 5, version: 1 }],
      ['save_image', { card: 'year-report', field_count: 4 }],
    ] as const) {
      const response = await worker.fetch(
        new Request('https://example.com/api/events', {
          method: 'POST',
          body: JSON.stringify({ event, data, path: '/year-report/', sessionId: 'session-123' }),
        }),
        env,
        ctx,
      )
      expect(response.status).toBe(202)
    }
    expect(writeDataPoint).toHaveBeenCalledTimes(5)
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

  it('按住不放 API 已接入：预算开关关闭时返回 scores_disabled', async () => {
    const { env } = makeEnv()

    const response = await worker.fetch(
      new Request('https://example.com/api/hold-button/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deviceType: 'touch' }),
      }),
      env,
      ctx,
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'scores_disabled' })
  })

  it('按住不放未知子路由返回 JSON 404，不回退 HTML', async () => {
    const { env, fetchMock } = makeEnv()

    const response = await worker.fetch(new Request('https://example.com/api/hold-button/nope'), env, ctx)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'not_found' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('scheduled 清理依次删除 sessions、runs 与过期 histogram', async () => {
    const statements: string[] = []
    const db = {
      prepare: (sql: string) => ({
        bind: () => ({ run: async () => void statements.push(sql) }),
      }),
    }
    const { env } = makeEnv()
    const holdEnv = { ...env, HOLD_DB: db } as unknown as PortalEnv

    await worker.scheduled({} as ScheduledEvent, holdEnv, ctx)

    expect(statements).toHaveLength(3)
    expect(statements[0]).toContain('DELETE FROM sessions')
    expect(statements[1]).toContain('DELETE FROM runs')
    expect(statements[2]).toContain('DELETE FROM daily_histogram')
  })

  it('未配置 D1 时 scheduled 清理静默跳过', async () => {
    const { env } = makeEnv()
    await expect(worker.scheduled({} as ScheduledEvent, env, ctx)).resolves.toBeUndefined()
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
