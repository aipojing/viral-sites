import { describe, expect, it } from 'vitest'
import {
  ADDRESSEE_MAX_LENGTH,
  hasAddresseePlaceholder,
  normalizeAddressee,
  renderTemplate,
} from './template'

describe('normalizeAddressee', () => {
  it('undefined → 默认「亲」', () => expect(normalizeAddressee()).toBe('亲'))
  it('空串 → 默认「亲」', () => expect(normalizeAddressee('')).toBe('亲'))
  it('纯空白 → 默认「亲」', () => expect(normalizeAddressee('  \t ')).toBe('亲'))
  it('两端空白被 trim', () => expect(normalizeAddressee(' 王总 ')).toBe('王总'))
  it('超过 12 字截断前 12 字', () => {
    expect(normalizeAddressee('尊敬的王总经理大人阁下您好呀')).toBe('尊敬的王总经理大人阁下您')
    expect(normalizeAddressee('尊敬的王总经理大人阁下您好呀')).toHaveLength(ADDRESSEE_MAX_LENGTH)
  })
  it('按 code point 截断，emoji 不被劈成半个', () => {
    expect(normalizeAddressee('😀'.repeat(13))).toBe('😀'.repeat(12))
  })
})

describe('renderTemplate', () => {
  it('基本替换', () => {
    expect(renderTemplate('{对方称呼}，这事我帮不上', '王总')).toBe('王总，这事我帮不上')
  })
  it('多处占位符全部替换', () => {
    expect(renderTemplate('{对方称呼}好，{对方称呼}再见', '哥')).toBe('哥好，哥再见')
  })
  it('未填称呼用默认「亲」', () => {
    expect(renderTemplate('{对方称呼}，不好意思')).toBe('亲，不好意思')
  })
  it('特殊字符原样替换，不转义', () => {
    expect(renderTemplate('{对方称呼}你好', '<b>老板&大人</b>')).toBe('<b>老板&大人</b>你好')
  })
  it('无占位符时原文返回', () => {
    expect(renderTemplate('不借。', '王总')).toBe('不借。')
  })
})

describe('hasAddresseePlaceholder', () => {
  it('含占位符 → true', () => expect(hasAddresseePlaceholder('{对方称呼}，你好')).toBe(true))
  it('不含 → false', () => expect(hasAddresseePlaceholder('不借。')).toBe(false))
})
