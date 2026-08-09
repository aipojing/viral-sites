import { describe, expect, it } from 'vitest'
import { buildChallengeUrl, parseChallengeTarget } from './challenge'

const MINUTE = 60_000

describe('challenge url', () => {
  it('固定生成同源 /hold-button/?beat=<ms>', () => {
    const url = buildChallengeUrl(new URL('https://example.com/hold-button/'), 30_000)
    expect(url).toBe('https://example.com/hold-button/?beat=30000')
  })

  it('从任意页面路径构造都指向 /hold-button/，不会生成根路径', () => {
    const url = buildChallengeUrl(new URL('https://example.com/other/page'), 1_000)
    expect(url).toBe('https://example.com/hold-button/?beat=1000')
  })

  it('挑战值 clamp 到 0～20 分钟', () => {
    expect(buildChallengeUrl(new URL('https://example.com/'), -50)).toBe(
      'https://example.com/hold-button/?beat=0',
    )
    expect(buildChallengeUrl(new URL('https://example.com/'), 60 * MINUTE)).toBe(
      'https://example.com/hold-button/?beat=1200000',
    )
  })

  it('parseChallengeTarget 解析合法 beat', () => {
    expect(parseChallengeTarget(new URL('https://example.com/hold-button/?beat=45000'))).toBe(45_000)
    expect(parseChallengeTarget(new URL('https://example.com/hold-button/?beat=0'))).toBe(0)
  })

  it('parseChallengeTarget 非法值返回 null', () => {
    expect(parseChallengeTarget(new URL('https://example.com/hold-button/'))).toBeNull()
    expect(parseChallengeTarget(new URL('https://example.com/hold-button/?beat=abc'))).toBeNull()
    expect(parseChallengeTarget(new URL('https://example.com/hold-button/?beat=-1'))).toBeNull()
    expect(parseChallengeTarget(new URL('https://example.com/hold-button/?beat=12.5'))).toBeNull()
  })

  it('parseChallengeTarget 超界值 clamp 到 20 分钟', () => {
    expect(parseChallengeTarget(new URL('https://example.com/hold-button/?beat=99999999'))).toBe(
      20 * MINUTE,
    )
  })
})
