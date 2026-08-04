import { describe, expect, it } from 'vitest'
import { wrapByLength } from './text'

describe('wrapByLength', () => {
  it('不超长时单行原样返回', () =>
    expect(wrapByLength('班味清新', 10)).toEqual(['班味清新']))

  it('超长按 maxChars 硬切', () =>
    expect(wrapByLength('一二三四五六七八九十甲乙', 5)).toEqual(['一二三四五', '六七八九十', '甲乙']))

  it('空串返回一个空行（调用方好统一按行推进 y）', () =>
    expect(wrapByLength('', 10)).toEqual(['']))

  it('emoji 代理对不被拆开', () =>
    expect(wrapByLength('😀😀😀', 2)).toEqual(['😀😀', '😀']))

  it('maxChars 非正数抛错', () =>
    expect(() => wrapByLength('x', 0)).toThrow('maxChars 必须为正整数'))
})
