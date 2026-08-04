import { describe, expect, it } from 'vitest'
import { lintPhraseLibrary, phraseLibrarySchema } from '@viral/shared'
import { PHRASES } from './phrases'
import { SCENES } from './scenes'
import { TONES } from './tones'

describe('话术库构建期 lint', () => {
  it('schema 校验通过（结构合法、单条 ≤80 字）', () => {
    expect(() => phraseLibrarySchema.parse([...PHRASES])).not.toThrow()
  })

  it('矩阵完整：8 场景 × 5 语气，每组 ≥3 条，占位符合法', () => {
    const issues = lintPhraseLibrary(PHRASES, {
      sceneIds: SCENES.map((s) => s.id),
      toneIds: TONES.map((t) => t.id),
      minPerGroup: 3,
      maxTextLength: 80,
      allowedPlaceholders: ['对方称呼'],
    })
    expect(issues).toEqual([])
  })

  it('总量恰好 120 条（8×5×3）', () => {
    expect(PHRASES).toHaveLength(120)
  })

  it('九宫格拼盘铺满：场景 span 合计 11（+1 许愿格 = 12 单元）', () => {
    expect(SCENES.reduce((sum, s) => sum + s.span, 0)).toBe(11)
  })
})
