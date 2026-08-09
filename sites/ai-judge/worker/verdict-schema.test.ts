import { describe, expect, it } from 'vitest'
import { parseVerdict, VerdictSchemaError } from './verdict-schema'

function validPayload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    crime: '拖延成瘾罪',
    verdict:
      '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零，收藏的教程从未打开第二次。本官念其认错态度尚可，特判如下。',
    sentence: '判处早睡三个月，缓期执行',
    seal: '赛博衙门 · 即日生效',
    ...overrides,
  })
}

describe('parseVerdict', () => {
  it('解析合法 JSON 判词', () => {
    const verdict = parseVerdict(validPayload())
    expect(verdict.crime).toBe('拖延成瘾罪')
    expect(verdict.seal).toBe('赛博衙门 · 即日生效')
  })

  it('容忍首尾空白', () => {
    expect(parseVerdict(`  ${validPayload()}\n`).crime).toBe('拖延成瘾罪')
  })

  it('拒绝 markdown fence 包裹', () => {
    expect(() => parseVerdict('```json\n' + validPayload() + '\n```')).toThrow(VerdictSchemaError)
  })

  it('拒绝额外字段', () => {
    expect(() => parseVerdict(validPayload({ extra: 'x' }))).toThrow(VerdictSchemaError)
  })

  it('拒绝缺少字段与非字符串字段', () => {
    const parsed = JSON.parse(validPayload())
    delete parsed.seal
    expect(() => parseVerdict(JSON.stringify(parsed))).toThrow(VerdictSchemaError)
    expect(() => parseVerdict(validPayload({ crime: 123 }))).toThrow(VerdictSchemaError)
    expect(() => parseVerdict(validPayload({ verdict: ['不是字符串'] }))).toThrow(
      VerdictSchemaError,
    )
  })

  it('拒绝无效 JSON 与空字符串', () => {
    expect(() => parseVerdict('不是 JSON')).toThrow(VerdictSchemaError)
    expect(() => parseVerdict('')).toThrow(VerdictSchemaError)
  })

  it('拒绝空白字段', () => {
    expect(() => parseVerdict(validPayload({ crime: '   ' }))).toThrow(VerdictSchemaError)
  })

  it('罪名超过 8 个 code point 拒绝', () => {
    expect(() => parseVerdict(validPayload({ crime: '一二三四五六七八九' }))).toThrow(
      VerdictSchemaError,
    )
  })

  it('判词正文低于 60 或超过 90 个 code point 拒绝', () => {
    expect(() => parseVerdict(validPayload({ verdict: '太短了。'.repeat(5) }))).toThrow(
      VerdictSchemaError,
    )
    expect(() => parseVerdict(validPayload({ verdict: '长'.repeat(91) }))).toThrow(
      VerdictSchemaError,
    )
    expect(parseVerdict(validPayload({ verdict: '字'.repeat(60) })).verdict).toHaveLength(60)
    expect(parseVerdict(validPayload({ verdict: '字'.repeat(90) })).verdict).toHaveLength(90)
  })

  it('刑期梗超过 24、印章超过 16 个 code point 拒绝', () => {
    expect(() => parseVerdict(validPayload({ sentence: '一'.repeat(25) }))).toThrow(
      VerdictSchemaError,
    )
    expect(() => parseVerdict(validPayload({ seal: '一'.repeat(17) }))).toThrow(VerdictSchemaError)
  })

  it('按 Unicode code point 计数，emoji 不劈开', () => {
    // 7 个 code point：5 汉字 + 2 emoji，不超限
    expect(parseVerdict(validPayload({ crime: '拖延成瘾罪🐱🐱' })).crime).toBe('拖延成瘾罪🐱🐱')
    // 9 个 code point：7 汉字 + 2 emoji，超限
    expect(() => parseVerdict(validPayload({ crime: '拖延成瘾罪名定🐱🐱' }))).toThrow(
      VerdictSchemaError,
    )
  })
})
