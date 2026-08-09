import { describe, expect, it } from 'vitest'
import { CHAPTER_ORDER, MAX_FREE_TEXT_LENGTH, QUESTIONS, questionById } from './questions'
import type { ChapterId, QuestionId } from '../lib/report-types'

describe('十问配置', () => {
  it('恰好十问且 id 唯一', () => {
    expect(QUESTIONS).toHaveLength(10)
    const ids = new Set(QUESTIONS.map((question) => question.id))
    expect(ids.size).toBe(10)
  })

  it('顺序对应产品文档的十问', () => {
    const expected: readonly QuestionId[] = [
      'keyword',
      'place',
      'song',
      'comfort-food',
      'important-person',
      'small-win',
      'hard-moment',
      'feeling-scale',
      'goal-and-release',
      'next-year-message',
    ]
    expect(QUESTIONS.map((question) => question.id)).toEqual(expected)
  })

  it('四个章节顺序固定，且题目按章节连续排列', () => {
    const expected: readonly ChapterId[] = ['opening', 'life', 'feeling', 'forward']
    expect(CHAPTER_ORDER).toEqual(expected)

    const appearance: ChapterId[] = []
    for (const question of QUESTIONS) {
      if (appearance.at(-1) !== question.chapter) appearance.push(question.chapter)
    }
    expect(appearance).toEqual(expected)
  })

  it('每题都可跳过，最难熬的一刻也可跳过', () => {
    expect(QUESTIONS.every((question) => question.optional)).toBe(true)
    expect(questionById('hard-moment').optional).toBe(true)
  })

  it('示例非空且不含价值判断词', () => {
    for (const question of QUESTIONS) {
      expect(question.example.trim().length).toBeGreaterThan(0)
      expect(question.prompt.trim().length).toBeGreaterThan(0)
      expect(question.example).not.toMatch(/应该|必须|成功|优秀|失败者/)
    }
  })

  it('所有自由文本题都有明确上限且不超过 60', () => {
    for (const question of QUESTIONS) {
      if (question.kind === 'scale') {
        expect(question.maxLength).toBeUndefined()
        continue
      }
      expect(question.maxLength).toBeDefined()
      expect(question.maxLength!).toBeGreaterThan(0)
      expect(question.maxLength!).toBeLessThanOrEqual(MAX_FREE_TEXT_LENGTH)
    }
  })

  it('各题上限与设计约定一致', () => {
    expect(questionById('keyword').maxLength).toBe(8)
    for (const id of ['place', 'song', 'comfort-food', 'important-person'] as const) {
      expect(questionById(id).maxLength).toBe(24)
    }
    for (const id of ['small-win', 'hard-moment', 'goal-and-release'] as const) {
      expect(questionById(id).maxLength).toBe(50)
    }
    expect(questionById('next-year-message').maxLength).toBe(30)
  })

  it('关键词题给出可选词但仍允许自填，量表题给出五档', () => {
    const keyword = questionById('keyword')
    expect(keyword.kind).toBe('keyword')
    expect(keyword.presets?.length).toBeGreaterThanOrEqual(6)

    const scale = questionById('feeling-scale')
    expect(scale.kind).toBe('scale')
    expect(scale.scaleLabels).toHaveLength(5)
  })

  it('题面不诱导标准人生，也不承诺分析人格', () => {
    const text = QUESTIONS.map((question) => `${question.prompt}${question.example}${question.hint ?? ''}`).join('')
    expect(text).not.toMatch(/人格|性格分析|诊断|MBTI|评分你|打分你/)
  })

  it('questionById 对未知 id 抛错', () => {
    expect(() => questionById('nope' as QuestionId)).toThrow()
  })
})
