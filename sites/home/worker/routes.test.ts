import { describe, expect, it } from 'vitest'
import { classifyPortalRoute } from './routes'

describe('classifyPortalRoute', () => {
  it('把 Umami 上报识别为 umami 代理', () => {
    expect(classifyPortalRoute(new URL('https://example.com/api/send'))).toEqual({
      kind: 'umami',
    })
  })

  it('把 AI 判官命名空间识别为 ai-judge', () => {
    expect(classifyPortalRoute(new URL('https://example.com/api/ai-judge/verdict'))).toEqual({
      kind: 'ai-judge',
    })
  })

  it('把按住不放命名空间识别为 hold-button', () => {
    expect(classifyPortalRoute(new URL('https://example.com/api/hold-button/session'))).toEqual({
      kind: 'hold-button',
    })
  })

  it('未知 API 路径必须显式 404，绝不回退首页', () => {
    expect(classifyPortalRoute(new URL('https://example.com/api/x'))).toEqual({
      kind: 'api-not-found',
    })
    expect(classifyPortalRoute(new URL('https://example.com/api/session'))).toEqual({
      kind: 'api-not-found',
    })
    expect(classifyPortalRoute(new URL('https://example.com/api/verdict'))).toEqual({
      kind: 'api-not-found',
    })
  })

  it('默契测试挑战深链接改写回玩法页并保留 query', () => {
    expect(
      classifyPortalRoute(new URL('https://example.com/tacit-test/c?d=abc')),
    ).toEqual({ kind: 'rewrite', pathname: '/tacit-test/' })
    expect(classifyPortalRoute(new URL('https://example.com/tacit-test/c'))).toEqual({
      kind: 'rewrite',
      pathname: '/tacit-test/',
    })
  })

  it('普通页面与静态资源交给静态资产', () => {
    expect(classifyPortalRoute(new URL('https://example.com/'))).toEqual({ kind: 'asset' })
    expect(classifyPortalRoute(new URL('https://example.com/life-grid/'))).toEqual({
      kind: 'asset',
    })
    expect(classifyPortalRoute(new URL('https://example.com/tacit-test/'))).toEqual({
      kind: 'asset',
    })
    expect(classifyPortalRoute(new URL('https://example.com/u.js'))).toEqual({ kind: 'asset' })
    expect(classifyPortalRoute(new URL('https://example.com/assets/x.png'))).toEqual({
      kind: 'asset',
    })
  })
})
