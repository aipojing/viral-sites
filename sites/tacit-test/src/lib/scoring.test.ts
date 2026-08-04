import { describe, expect, it } from 'vitest'
import { QUIZZES } from './questions'
import { buildComparison, computeScore, pickHighlightRow, tierFor } from './scoring'

const A = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]

/** 与 A 恰好错开 n 题的答案数组 */
function mismatch(n: number): number[] {
  return A.map((v, i) => (i < n ? (v + 1) % 4 : v))
}

describe('computeScore', () => {
  it('全对 100', () => expect(computeScore(A, [...A])).toBe(100))
  it('全错 0', () => expect(computeScore(A, mismatch(10))).toBe(0))
  it('7 题一致 70', () => expect(computeScore(A, mismatch(3))).toBe(70))
  it('长度不等抛错', () => expect(() => computeScore(A, [0, 1])).toThrow())
})

describe('tierFor 档位边界（0/29/30/49/50/69/70/89/90/100）', () => {
  it.each([
    [100, 'soulmate'],
    [90, 'soulmate'],
    [89, 'mutual'],
    [70, 'mutual'],
    [69, 'grinding'],
    [50, 'grinding'],
    [49, 'parallel'],
    [30, 'parallel'],
    [29, 'plastic'],
    [0, 'plastic'],
  ] as const)('%i 分 → %s', (score, id) => {
    expect(tierFor(score, 'friend').id).toBe(id)
  })

  it('称号：90+ 灵魂共振 / 70+ 双向奔赴 / 50+ 还在磨合 / 30+ 各过各的', () => {
    expect(tierFor(90, 'friend').title).toBe('灵魂共振')
    expect(tierFor(70, 'couple').title).toBe('双向奔赴')
    expect(tierFor(50, 'friend').title).toBe('还在磨合')
    expect(tierFor(30, 'couple').title).toBe('各过各的')
  })

  it('最低档称号按题库分流', () => {
    expect(tierFor(0, 'friend').title).toBe('塑料情谊')
    expect(tierFor(0, 'couple').title).toBe('建议聊聊')
  })

  it('每档带非空锐评与档位强调色', () => {
    for (const score of [95, 75, 55, 35, 5]) {
      for (const quiz of ['friend', 'couple'] as const) {
        const tier = tierFor(score, quiz)
        expect(tier.remark.length).toBeGreaterThan(0)
        expect(tier.accent).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('高低档锐评不同（题库内差异化）', () => {
    expect(tierFor(95, 'couple').remark).not.toBe(tierFor(5, 'couple').remark)
    expect(tierFor(5, 'friend').remark).not.toBe(tierFor(5, 'couple').remark)
  })
})

describe('buildComparison', () => {
  it('10 行，一致的行 matched 且带双方选项原文', () => {
    const rows = buildComparison('friend', A, mismatch(3))
    expect(rows).toHaveLength(10)
    expect(rows[0].matched).toBe(false)
    expect(rows[9].matched).toBe(true)
    expect(rows[0].question).toBe(QUIZZES.friend.questions[0].text)
    expect(rows[0].initiatorOption).toBe(QUIZZES.friend.questions[0].options[A[0]])
    expect(rows[0].challengerOption).toBe(QUIZZES.friend.questions[0].options[(A[0] + 1) % 4])
  })
})

describe('pickHighlightRow', () => {
  it('优先取第一条一致的题', () => {
    const rows = buildComparison('friend', A, mismatch(3))
    expect(pickHighlightRow(rows).index).toBe(3)
    expect(pickHighlightRow(rows).matched).toBe(true)
  })
  it('全不一致取第 1 题', () => {
    const rows = buildComparison('friend', A, mismatch(10))
    expect(pickHighlightRow(rows).index).toBe(0)
  })
})
