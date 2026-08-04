import { describe, expect, it } from 'vitest'
import type { Phrase } from './schema'
import { lintPhraseLibrary, type PhraseLintConfig } from './lint'

const config: PhraseLintConfig = {
  sceneIds: ['s1', 's2'],
  toneIds: ['t1'],
  minPerGroup: 2,
  maxTextLength: 80,
  allowedPlaceholders: ['对方称呼'],
}

const full: Phrase[] = [
  { scene: 's1', tone: 't1', text: '第一条' },
  { scene: 's1', tone: 't1', text: '{对方称呼}，第二条' },
  { scene: 's2', tone: 't1', text: '第三条' },
  { scene: 's2', tone: 't1', text: '第四条' },
]

describe('lintPhraseLibrary', () => {
  it('完整矩阵零问题', () => {
    expect(lintPhraseLibrary(full, config)).toEqual([])
  })

  it('整组缺失 → group-too-small', () => {
    const issues = lintPhraseLibrary(full.slice(0, 2), config)
    expect(issues.map((i) => i.code)).toContain('group-too-small')
    expect(issues.some((i) => i.message.includes('s2'))).toBe(true)
  })

  it('某组数量不足 → group-too-small', () => {
    const issues = lintPhraseLibrary(full.slice(0, 3), config)
    expect(issues.filter((i) => i.code === 'group-too-small')).toHaveLength(1)
  })

  it('超长文案 → text-too-long', () => {
    const issues = lintPhraseLibrary(
      [...full, { scene: 's1', tone: 't1', text: '长'.repeat(81) }],
      config,
    )
    expect(issues.map((i) => i.code)).toContain('text-too-long')
  })

  it('非法占位符名 → illegal-placeholder', () => {
    const issues = lintPhraseLibrary(
      [...full, { scene: 's1', tone: 't1', text: '{对方昵称}你好' }],
      config,
    )
    expect(issues.map((i) => i.code)).toContain('illegal-placeholder')
  })

  it('花括号不配对 → illegal-placeholder', () => {
    const issues = lintPhraseLibrary(
      [...full, { scene: 's1', tone: 't1', text: '你好{对方称呼' }],
      config,
    )
    expect(issues.map((i) => i.code)).toContain('illegal-placeholder')
  })

  it('未知场景/语气 id → unknown-scene / unknown-tone', () => {
    const issues = lintPhraseLibrary(
      [...full, { scene: 'sX', tone: 'tX', text: '游离条目' }],
      config,
    )
    expect(issues.map((i) => i.code)).toContain('unknown-scene')
    expect(issues.map((i) => i.code)).toContain('unknown-tone')
  })
})
