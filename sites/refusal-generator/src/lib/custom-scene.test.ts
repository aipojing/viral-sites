import { describe, expect, it } from 'vitest'
import { buildCustomPhrases, normalizeSituation } from './custom-scene'

describe('normalizeSituation', () => {
  it('trim 并限制 40 个 code point', () => {
    expect(normalizeSituation(`  ${'事'.repeat(70)}  `)).toBe('事'.repeat(40))
  })
  it('空输入返回空串', () => expect(normalizeSituation('   ')).toBe(''))
})

describe('buildCustomPhrases', () => {
  it('每种语气生成 3 条，保留称呼变量并写入具体处境', () => {
    const phrases = buildCustomPhrases('weiwan', '同事让我替他背锅')
    expect(phrases).toHaveLength(3)
    expect(phrases.every((phrase) => phrase.scene === 'custom')).toBe(true)
    expect(phrases.every((phrase) => phrase.tone === 'weiwan')).toBe(true)
    expect(phrases.some((phrase) => phrase.text.includes('同事让我替他背锅'))).toBe(true)
    expect(phrases.some((phrase) => phrase.text.includes('{对方称呼}'))).toBe(true)
  })

  it('五种语气各有且只有 3 条本地兜底', () => {
    for (const tone of ['weiwan', 'yinggang', 'fafeng', 'wenyan', 'heihua']) {
      expect(buildCustomPhrases(tone, '临时安排')).toHaveLength(3)
    }
  })
})
