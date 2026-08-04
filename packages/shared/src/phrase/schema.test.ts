import { describe, expect, it } from 'vitest'
import { phraseLibrarySchema, phraseSchema } from './schema'

describe('phraseSchema', () => {
  it('合法条目通过', () => {
    expect(() =>
      phraseSchema.parse({ scene: 'jieqian', tone: 'weiwan', text: '不借。' }),
    ).not.toThrow()
  })
  it('空 text 拒绝', () => {
    expect(() => phraseSchema.parse({ scene: 'a', tone: 'b', text: '' })).toThrow()
  })
  it('超过 80 字拒绝', () => {
    expect(() =>
      phraseSchema.parse({ scene: 'a', tone: 'b', text: '啊'.repeat(81) }),
    ).toThrow()
  })
  it('恰好 80 字放行', () => {
    expect(() =>
      phraseSchema.parse({ scene: 'a', tone: 'b', text: '啊'.repeat(80) }),
    ).not.toThrow()
  })
})

describe('phraseLibrarySchema', () => {
  it('数组整体校验', () => {
    expect(() =>
      phraseLibrarySchema.parse([{ scene: 'a', tone: 'b', text: '好' }]),
    ).not.toThrow()
    expect(() => phraseLibrarySchema.parse({ not: 'array' })).toThrow()
  })
})
