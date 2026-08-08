import { describe, expect, it, vi } from 'vitest'
import { buildBatonUrl, buildOwnerUrl, buildPublicChainUrl } from './chain-url'

describe('chain-url', () => {
  it('public URL 不带任何 fragment 与 token', () => {
    expect(buildPublicChainUrl('https://guaihaowan.example', 'abc')).toBe(
      'https://guaihaowan.example/next-question/c/abc',
    )
    expect(buildPublicChainUrl('https://guaihaowan.example/', 'abc')).toBe(
      'https://guaihaowan.example/next-question/c/abc',
    )
  })

  it('baton URL 把一次性 token 放在 fragment', () => {
    expect(buildBatonUrl('https://guaihaowan.example', 'abc', 'secret')).toBe(
      'https://guaihaowan.example/next-question/c/abc#b=secret',
    )
  })

  it('owner URL 使用 #o= fragment', () => {
    expect(buildOwnerUrl('https://guaihaowan.example', 'abc', 'owner-token')).toBe(
      'https://guaihaowan.example/next-question/c/abc#o=owner-token',
    )
  })

  it('空 token 不生成带 fragment 的 URL', () => {
    expect(buildBatonUrl('https://guaihaowan.example', 'abc', '')).toBe(
      'https://guaihaowan.example/next-question/c/abc',
    )
  })
})
