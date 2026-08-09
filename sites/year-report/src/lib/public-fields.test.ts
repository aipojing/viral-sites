import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PUBLIC_FIELDS,
  PUBLIC_FIELD_LABELS,
  SENSITIVE_PUBLIC_FIELDS,
  publicFieldCount,
  selectPublicAnswers,
  togglePublicField,
} from './public-fields'
import { QUESTION_IDS } from '../content/questions'
import type { ReportAnswers } from './report-types'

const FULL: ReportAnswers = {
  keyword: '重启',
  place: '县城的老家',
  song: '同一首歌',
  'comfort-food': '楼下的牛肉面',
  'important-person': '老同学 K',
  'small-win': '学会了游一百米',
  'hard-moment': '三月那通电话',
  'feeling-scale': 4,
  'goal-and-release': { completion: 60, release: '没考完的证' },
  'next-year-message': '先睡够，再谈别的',
}

describe('默认公开字段', () => {
  it('严格是关键词、小胜利、年度评分和明年留言', () => {
    expect([...DEFAULT_PUBLIC_FIELDS]).toEqual(['keyword', 'small-win', 'feeling-scale', 'next-year-message'])
  })

  it('地点、重要的人和艰难时刻默认关闭', () => {
    for (const id of SENSITIVE_PUBLIC_FIELDS) {
      expect(DEFAULT_PUBLIC_FIELDS).not.toContain(id)
    }
    expect([...SENSITIVE_PUBLIC_FIELDS]).toEqual(['place', 'important-person', 'hard-moment'])
  })

  it('每个题号都有面向用户的字段名', () => {
    for (const id of QUESTION_IDS) {
      expect(PUBLIC_FIELD_LABELS[id]).toBeTruthy()
    }
  })
})

describe('selectPublicAnswers', () => {
  it('只保留勾选且已作答的字段', () => {
    const selected = selectPublicAnswers(FULL, DEFAULT_PUBLIC_FIELDS)
    expect(selected).toEqual({
      keyword: '重启',
      'small-win': '学会了游一百米',
      'feeling-scale': 4,
      'next-year-message': '先睡够，再谈别的',
    })
  })

  it('未作答的字段即便被勾选也不出现', () => {
    const selected = selectPublicAnswers({ keyword: '重启' }, ['keyword', 'place', 'small-win'])
    expect(selected).toEqual({ keyword: '重启' })
  })

  it('没有勾选任何字段时返回空对象', () => {
    expect(selectPublicAnswers(FULL, [])).toEqual({})
  })

  it('勾选敏感字段后才会带上敏感内容', () => {
    const selected = selectPublicAnswers(FULL, ['important-person', 'place'])
    expect(selected).toEqual({ 'important-person': '老同学 K', place: '县城的老家' })
  })

  it('不修改原始答案', () => {
    const source: ReportAnswers = { ...FULL }
    selectPublicAnswers(source, DEFAULT_PUBLIC_FIELDS)
    expect(source).toEqual(FULL)
  })
})

describe('togglePublicField', () => {
  it('勾选后按题号顺序排列，取消后移除', () => {
    const added = togglePublicField(['small-win'], 'keyword')
    expect([...added]).toEqual(['keyword', 'small-win'])
    expect([...togglePublicField(added, 'keyword')]).toEqual(['small-win'])
  })
})

describe('publicFieldCount', () => {
  it('只数真正会公开出去的字段', () => {
    expect(publicFieldCount({ keyword: '重启' }, ['keyword', 'place'])).toBe(1)
    expect(publicFieldCount(FULL, DEFAULT_PUBLIC_FIELDS)).toBe(4)
  })
})
