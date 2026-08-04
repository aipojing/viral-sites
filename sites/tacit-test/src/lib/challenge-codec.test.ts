import { describe, expect, it } from 'vitest'
import {
  buildChallengeUrl,
  clampNickname,
  decodeChallenge,
  encodeChallenge,
} from './challenge-codec'

const ANSWERS = [0, 2, 1, 3, 0, 1, 2, 3, 0, 1]

/** 测试专用：把任意对象按同一管线编成 base64url，用于构造非法 payload */
function rawEncode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('clampNickname', () => {
  it('8 字以内原样保留（trim 后）', () => expect(clampNickname(' 阿福 ')).toBe('阿福'))
  it('超长按 code point 截断到 8', () =>
    expect(clampNickname('一二三四五六七八九十')).toBe('一二三四五六七八'))
  it('emoji 算 1 字不被劈开', () => expect(clampNickname('猫猫🐱🐱猫猫🐱🐱九')).toBe('猫猫🐱🐱猫猫🐱🐱'))
})

describe('encode → decode roundtrip', () => {
  it('中文昵称', () => {
    const d = encodeChallenge('friend', '阿福', ANSWERS)
    expect(decodeChallenge(d)).toEqual({ v: 1, q: 'friend', n: '阿福', a: ANSWERS })
  })

  it('emoji 昵称', () => {
    const d = encodeChallenge('couple', '小明🐱', ANSWERS)
    expect(decodeChallenge(d)?.n).toBe('小明🐱')
  })

  it('超长昵称编码前截断', () => {
    const d = encodeChallenge('friend', '一二三四五六七八九十', ANSWERS)
    expect(decodeChallenge(d)?.n).toBe('一二三四五六七八')
  })

  it('产物 URL 安全：只含 A-Za-z0-9_-', () => {
    const d = encodeChallenge('couple', '猫🐱与狗', ANSWERS)
    expect(d).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('encodeChallenge 非法入参快速失败', () => {
  it('答案数组长度不是 10 抛错', () =>
    expect(() => encodeChallenge('friend', '阿福', [0, 1])).toThrow())
  it('答案取值越界抛错', () =>
    expect(() => encodeChallenge('friend', '阿福', [...ANSWERS.slice(0, 9), 4])).toThrow())
})

describe('decodeChallenge 严格校验（全部返回 null，绝不抛错）', () => {
  it('坏 base64', () => expect(decodeChallenge('%%%not-base64%%%')).toBeNull())
  it('base64 合法但不是 UTF-8 JSON', () => expect(decodeChallenge('_v7_')).toBeNull())
  it('JSON 合法但不是对象', () => expect(decodeChallenge(rawEncode([1, 2, 3]))).toBeNull())
  it('空对象', () => expect(decodeChallenge(rawEncode({}))).toBeNull())
  it('未知版本号', () =>
    expect(decodeChallenge(rawEncode({ v: 2, q: 'friend', n: 'x', a: ANSWERS }))).toBeNull())
  it('未知题库', () =>
    expect(decodeChallenge(rawEncode({ v: 1, q: 'enemy', n: 'x', a: ANSWERS }))).toBeNull())
  it('昵称不是字符串', () =>
    expect(decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 42, a: ANSWERS }))).toBeNull())
  it('篡改：答案数组长度 9', () =>
    expect(
      decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: ANSWERS.slice(0, 9) })),
    ).toBeNull())
  it('篡改：答案取值 4 越界', () =>
    expect(
      decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: [...ANSWERS.slice(0, 9), 4] })),
    ).toBeNull())
  it('篡改：负数与小数', () => {
    expect(
      decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: [...ANSWERS.slice(0, 9), -1] })),
    ).toBeNull()
    expect(
      decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: [...ANSWERS.slice(0, 9), 1.5] })),
    ).toBeNull()
  })
  it('篡改：a 不是数组', () =>
    expect(decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: 'abc' }))).toBeNull())
  it('手改超长昵称：解码后仍截断到 8 字', () => {
    const d = rawEncode({ v: 1, q: 'friend', n: '一二三四五六七八九十', a: ANSWERS })
    expect(decodeChallenge(d)?.n).toBe('一二三四五六七八')
  })
})

describe('buildChallengeUrl', () => {
  it('拼接 /c?d=', () =>
    expect(buildChallengeUrl('https://tacit-test.pages.dev', 'abc')).toBe(
      'https://tacit-test.pages.dev/c?d=abc',
    ))
})
