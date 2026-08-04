import { describe, expect, it } from 'vitest'
import { OPTION_COUNT, QUESTION_COUNT, QUIZZES } from './questions'

describe('QUIZZES', () => {
  it('恰好两套题库：friend 与 couple', () => {
    expect(Object.keys(QUIZZES).sort()).toEqual(['couple', 'friend'])
  })

  it.each(['friend', 'couple'] as const)('%s：固定 10 题、每题 4 个非空选项', (id) => {
    const quiz = QUIZZES[id]
    expect(quiz.id).toBe(id)
    expect(quiz.questions).toHaveLength(QUESTION_COUNT)
    for (const q of quiz.questions) {
      expect(q.text.length).toBeGreaterThan(0)
      expect(q.options).toHaveLength(OPTION_COUNT)
      for (const opt of q.options) {
        expect(opt.length).toBeGreaterThan(0)
        expect(opt.length).toBeLessThanOrEqual(20) // 一屏一题与卡片排版上限
      }
    }
  })

  it.each(['friend', 'couple'] as const)('%s：题目文本不重复', (id) => {
    const texts = QUIZZES[id].questions.map((q) => q.text)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('入口文案与挑战宣言非空', () => {
    for (const quiz of Object.values(QUIZZES)) {
      expect(quiz.name.length).toBeGreaterThan(0)
      expect(quiz.intro.length).toBeGreaterThan(0)
      expect(quiz.declaration.length).toBeGreaterThan(0)
    }
  })
})
