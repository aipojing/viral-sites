import { describe, expect, it } from 'vitest'
import { questionById } from '../content/questions'
import { isAnsweredValue, normalizeAnswer, normalizeAnswers, validateAnswers } from './answers'
import type { ReportAnswers } from './report-types'

describe('normalizeAnswer', () => {
  it('空白与 undefined 归一为跳过', () => {
    const keyword = questionById('keyword')
    expect(normalizeAnswer(keyword, undefined)).toBeUndefined()
    expect(normalizeAnswer(keyword, '')).toBeUndefined()
    expect(normalizeAnswer(keyword, '   \n ')).toBeUndefined()
  })

  it('按 Unicode code points 截断，不切碎 emoji', () => {
    const keyword = questionById('keyword')
    expect(normalizeAnswer(keyword, '一二三四五六七八九十')).toBe('一二三四五六七八')
    // 8 个 code point 的上限：9 个 emoji 截成 8 个完整 emoji
    expect(normalizeAnswer(keyword, '🌊'.repeat(9))).toBe('🌊'.repeat(8))
  })

  it('折叠换行与连续空白，保证排版稳定', () => {
    const place = questionById('place')
    expect(normalizeAnswer(place, ' 青海\n湖   边 ')).toBe('青海 湖 边')
  })

  it('量表只接受 1～5 的整数，越界夹紧、非数字视为跳过', () => {
    const scale = questionById('feeling-scale')
    expect(normalizeAnswer(scale, 3)).toBe(3)
    expect(normalizeAnswer(scale, 0)).toBe(1)
    expect(normalizeAnswer(scale, 9)).toBe(5)
    expect(normalizeAnswer(scale, 2.4)).toBe(2)
    expect(normalizeAnswer(scale, Number.NaN)).toBeUndefined()
    expect(normalizeAnswer(scale, 'three')).toBeUndefined()
  })

  it('目标题的完成度夹在 0～100，放下的事按上限截断', () => {
    const goal = questionById('goal-and-release')
    expect(normalizeAnswer(goal, { completion: 62, release: '没考完的证' })).toEqual({
      completion: 62,
      release: '没考完的证',
    })
    expect(normalizeAnswer(goal, { completion: -20, release: '' })).toEqual({ completion: 0, release: '' })
    expect(normalizeAnswer(goal, { completion: 260, release: '  ' })).toEqual({ completion: 100, release: '' })
    expect(normalizeAnswer(goal, { completion: 33.6, release: '啊'.repeat(80) })).toEqual({
      completion: 34,
      release: '啊'.repeat(50),
    })
  })

  it('目标题的非法输入视为跳过', () => {
    const goal = questionById('goal-and-release')
    expect(normalizeAnswer(goal, 'done')).toBeUndefined()
    expect(normalizeAnswer(goal, { completion: Number.NaN, release: '' })).toBeUndefined()
  })

  it('文本题不接受数字与对象', () => {
    const song = questionById('song')
    expect(normalizeAnswer(song, 12)).toBeUndefined()
    expect(normalizeAnswer(song, { completion: 1, release: '' })).toBeUndefined()
  })
})

describe('normalizeAnswers', () => {
  it('丢弃未知题号与被归一为空的答案', () => {
    const result = normalizeAnswers({
      keyword: '  重启  ',
      song: '   ',
      unknown: '偷渡的字段',
      'feeling-scale': 4,
    } as ReportAnswers)
    expect(result).toEqual({ keyword: '重启', 'feeling-scale': 4 })
  })
})

describe('validateAnswers', () => {
  it('合法答案没有问题', () => {
    expect(
      validateAnswers({
        keyword: '重启',
        'feeling-scale': 4,
        'goal-and-release': { completion: 40, release: '搁下的书' },
      }),
    ).toEqual([])
  })

  it('列出未知题号、类型错误、超长与越界', () => {
    const issues = validateAnswers({
      keyword: '八个字都不止的关键词',
      song: 42,
      'feeling-scale': 7,
      'goal-and-release': { completion: 120, release: '啊'.repeat(60) },
      ghost: 'x',
    } as unknown as ReportAnswers)
    expect(issues.length).toBeGreaterThanOrEqual(5)
    expect(issues.join('\n')).toContain('ghost')
    expect(issues.join('\n')).toContain('keyword')
    expect(issues.join('\n')).toContain('song')
    expect(issues.join('\n')).toContain('feeling-scale')
    expect(issues.join('\n')).toContain('goal-and-release')
  })

  it('问题描述不含答案原文，避免把隐私写进日志', () => {
    const issues = validateAnswers({ place: '广州市天河区某某小区' } as ReportAnswers)
    expect(issues.join('\n')).not.toContain('天河区')
  })
})

describe('isAnsweredValue', () => {
  it('空字符串与 undefined 都算未作答，0 分完成度算作答', () => {
    expect(isAnsweredValue(undefined)).toBe(false)
    expect(isAnsweredValue('')).toBe(false)
    expect(isAnsweredValue('重启')).toBe(true)
    expect(isAnsweredValue(3)).toBe(true)
    expect(isAnsweredValue({ completion: 0, release: '' })).toBe(true)
  })
})
