import { describe, expect, it } from 'vitest'
import { isValidChainSlug, parseNextQuestionApiPath } from './router'

const SLUG = 'abcd1234abcd1234'

describe('parseNextQuestionApiPath', () => {
  it('识别创建、链条读取、接棒、收尾、撤回与删除路由', () => {
    expect(parseNextQuestionApiPath('/api/next-question/chains')).toEqual({ kind: 'create' })
    expect(parseNextQuestionApiPath(`/api/next-question/chains/${SLUG}`)).toEqual({
      kind: 'chain',
      slug: SLUG,
    })
    expect(parseNextQuestionApiPath(`/api/next-question/chains/${SLUG}/baton`)).toEqual({
      kind: 'baton',
      slug: SLUG,
    })
    expect(parseNextQuestionApiPath(`/api/next-question/chains/${SLUG}/close`)).toEqual({
      kind: 'close',
      slug: SLUG,
    })
    expect(parseNextQuestionApiPath(`/api/next-question/chains/${SLUG}/redact`)).toEqual({
      kind: 'redact',
      slug: SLUG,
    })
  })

  it('拒绝非法 slug 与未知子路由', () => {
    expect(parseNextQuestionApiPath('/api/next-question/chains/short')).toEqual({ kind: 'unknown' })
    expect(parseNextQuestionApiPath(`/api/next-question/chains/${SLUG}extra`)).toEqual({
      kind: 'unknown',
    })
    expect(parseNextQuestionApiPath(`/api/next-question/chains/${SLUG}/hack`)).toEqual({
      kind: 'unknown',
    })
    expect(parseNextQuestionApiPath('/api/next-question')).toEqual({ kind: 'unknown' })
    expect(parseNextQuestionApiPath('/api/next-question/other')).toEqual({ kind: 'unknown' })
  })
})

describe('isValidChainSlug', () => {
  it('只接受 16 位 base64url slug', () => {
    expect(isValidChainSlug(SLUG)).toBe(true)
    expect(isValidChainSlug('Ab-_1234abcd5678')).toBe(true)
    expect(isValidChainSlug('abc')).toBe(false)
    expect(isValidChainSlug(`${SLUG}x`)).toBe(false)
    expect(isValidChainSlug('abcd1234abcd123+')).toBe(false)
  })
})
