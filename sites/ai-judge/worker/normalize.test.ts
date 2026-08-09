import { describe, expect, it } from 'vitest'
import {
  INTRO_MAX_CODE_POINTS,
  JudgeInputError,
  NICKNAME_MAX_CODE_POINTS,
  normalizeJudgeInput,
} from './normalize'

const DAILY_ID = '3f2c9a1e-8b4d-4c6e-9f0a-1b2c3d4e5f60'

describe('normalizeJudgeInput', () => {
  it('trim 并 NFC 归一化昵称与简介', () => {
    const input = normalizeJudgeInput({
      nickname: '  阿福  ',
      intro: ' 喜欢摸鱼 ',
      dailyId: DAILY_ID,
    })
    expect(input).toEqual({ nickname: '阿福', intro: '喜欢摸鱼', dailyId: DAILY_ID })
  })

  it('NFC 组合字符归一后保持一致', () => {
    // é 的分解形式（e + ́）归一为单码点
    const decomposed = 'e\u0301'
    const input = normalizeJudgeInput({ nickname: decomposed, dailyId: DAILY_ID })
    expect(input.nickname).toBe('\u00e9')
  })

  it('简介可缺省为空字符串', () => {
    const input = normalizeJudgeInput({ nickname: '阿福', dailyId: DAILY_ID })
    expect(input.intro).toBe('')
  })

  it('emoji 昵称按 code point 计数不被劈开', () => {
    const nickname = '猫猫🐱猫猫🐱猫猫🐱猫猫🐱'
    expect(Array.from(nickname)).toHaveLength(NICKNAME_MAX_CODE_POINTS)
    expect(normalizeJudgeInput({ nickname, dailyId: DAILY_ID }).nickname).toBe(nickname)
  })

  it('昵称超过 12 个 code point 拒绝', () => {
    expect(() =>
      normalizeJudgeInput({ nickname: '一二三四五六七八九十加再加', dailyId: DAILY_ID }),
    ).toThrow(JudgeInputError)
    expect(Array.from('一二三四五六七八九十加再加')).toHaveLength(NICKNAME_MAX_CODE_POINTS + 1)
  })

  it('简介超过 40 个 code point 拒绝', () => {
    const intro = '一'.repeat(INTRO_MAX_CODE_POINTS + 1)
    expect(() => normalizeJudgeInput({ nickname: '阿福', intro, dailyId: DAILY_ID })).toThrow(
      JudgeInputError,
    )
  })

  it('空昵称或纯空白昵称拒绝', () => {
    expect(() => normalizeJudgeInput({ nickname: '', dailyId: DAILY_ID })).toThrow(JudgeInputError)
    expect(() => normalizeJudgeInput({ nickname: '   ', dailyId: DAILY_ID })).toThrow(
      JudgeInputError,
    )
  })

  it('dailyId 必须是 UUID 格式', () => {
    expect(() => normalizeJudgeInput({ nickname: '阿福', dailyId: 'not-a-uuid' })).toThrow(
      JudgeInputError,
    )
    expect(() => normalizeJudgeInput({ nickname: '阿福' })).toThrow(JudgeInputError)
  })

  it('拒绝对象、数组与注入形态', () => {
    expect(() => normalizeJudgeInput(null)).toThrow(JudgeInputError)
    expect(() => normalizeJudgeInput([])).toThrow(JudgeInputError)
    expect(() => normalizeJudgeInput('阿福')).toThrow(JudgeInputError)
    expect(() =>
      normalizeJudgeInput({ nickname: { $ne: null }, dailyId: DAILY_ID }),
    ).toThrow(JudgeInputError)
    expect(() =>
      normalizeJudgeInput({ nickname: '阿福', intro: ['注入'], dailyId: DAILY_ID }),
    ).toThrow(JudgeInputError)
  })

  it('昵称与简介必须归一后仍用于展示（trim 不改写合法字符）', () => {
    const input = normalizeJudgeInput({
      nickname: '小明🐱',
      intro: '今天也想下班',
      dailyId: DAILY_ID,
    })
    expect(input.nickname).toBe('小明🐱')
    expect(input.intro).toBe('今天也想下班')
  })
})
