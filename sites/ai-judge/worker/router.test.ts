import { describe, expect, it } from 'vitest'
import type { AiJudgeEnv } from './env'
import { handleAiJudgeApi } from './router'

const env = {} as AiJudgeEnv
const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext

describe('ai-judge router', () => {
  it('POST /api/ai-judge/verdict 进入业务占位', async () => {
    const response = await handleAiJudgeApi(
      new Request('https://example.com/api/ai-judge/verdict', { method: 'POST' }),
      env,
      ctx,
    )
    expect(response.status).toBe(501)
    expect(await response.json()).toEqual({ code: 'not_implemented' })
  })

  it('verdict 上的非 POST 方法返回 405', async () => {
    const response = await handleAiJudgeApi(
      new Request('https://example.com/api/ai-judge/verdict'),
      env,
      ctx,
    )
    expect(response.status).toBe(405)
    expect(await response.json()).toEqual({ code: 'method_not_allowed' })
  })

  it('其他子路径返回 JSON 404', async () => {
    const response = await handleAiJudgeApi(
      new Request('https://example.com/api/ai-judge/admin', { method: 'POST' }),
      env,
      ctx,
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: 'not_found' })
  })
})
