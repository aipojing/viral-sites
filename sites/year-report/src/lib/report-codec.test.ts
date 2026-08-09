import { describe, expect, it } from 'vitest'
import {
  MAX_REPORT_FRAGMENT_LENGTH,
  REPORT_FRAGMENT_PREFIX,
  buildPublicReportUrl,
  decodePublicReport,
  encodePublicReport,
  readReportFragment,
} from './report-codec'
import type { PublicReportPayload } from './public-fields'

const PAYLOAD: PublicReportPayload = {
  version: 1,
  year: 2026,
  answers: {
    keyword: '重启',
    'small-win': '学会了游一百米',
    'feeling-scale': 4,
    'goal-and-release': { completion: 60, release: '没考完的证' },
    'next-year-message': '先睡够，再谈别的',
  },
}

describe('encode / decode', () => {
  it('中文与 emoji 都能原样往返', () => {
    const payload: PublicReportPayload = {
      version: 1,
      year: 2026,
      answers: { keyword: '重启🌊', 'next-year-message': '慢一点也行' },
    }
    expect(decodePublicReport(encodePublicReport(payload))).toEqual(payload)
  })

  it('编码结果只含 base64url 字符', () => {
    expect(encodePublicReport(PAYLOAD)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('完整字段集往返一致', () => {
    expect(decodePublicReport(encodePublicReport(PAYLOAD))).toEqual(PAYLOAD)
  })

  it('坏 base64、坏 JSON 与空串都抛错', () => {
    expect(() => decodePublicReport('')).toThrow()
    expect(() => decodePublicReport('!!!!')).toThrow()
    expect(() => decodePublicReport(btoa('{ not json').replace(/=+$/, ''))).toThrow()
  })

  it('校验位不匹配时抛错', () => {
    const encoded = encodePublicReport(PAYLOAD)
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))))
    json.c = 'deadbeef'
    const tampered = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(json))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(() => decodePublicReport(tampered)).toThrow()
  })

  it('未知版本、越界年份与未知字段都拒绝', () => {
    expect(() => decodePublicReport(encodePublicReport({ ...PAYLOAD, version: 2 as 1 }))).toThrow()
    expect(() => decodePublicReport(encodePublicReport({ ...PAYLOAD, year: 1899 }))).toThrow()
    expect(() =>
      decodePublicReport(
        encodePublicReport({
          ...PAYLOAD,
          answers: { ...PAYLOAD.answers, ghost: 'x' } as PublicReportPayload['answers'],
        }),
      ),
    ).toThrow()
  })

  it('超长答案在解码时被拒绝，不进入报告', () => {
    const encoded = encodePublicReport({
      version: 1,
      year: 2026,
      answers: { keyword: '超过八个字的关键词一定不合法' },
    })
    expect(() => decodePublicReport(encoded)).toThrow()
  })
})

describe('buildPublicReportUrl', () => {
  it('答案只出现在 fragment，query 与路径干净', () => {
    const url = buildPublicReportUrl(new URL('https://guaihaowan.com/year-report/?from=home'), PAYLOAD)
    expect(url).not.toBeNull()
    const parsed = new URL(url!)
    expect(parsed.search).toBe('')
    expect(parsed.pathname).toBe('/year-report/')
    expect(parsed.hash.startsWith(`#${REPORT_FRAGMENT_PREFIX}`)).toBe(true)
    expect(parsed.hash).not.toContain('重启')
    expect(url).not.toContain('?report')
  })

  it('payload 过长时返回 null，交给上层回退图片', () => {
    const huge: PublicReportPayload = {
      version: 1,
      year: 2026,
      answers: Object.fromEntries(
        Array.from({ length: 40 }, (_, index) => [`k${index}`, '啊'.repeat(50)]),
      ) as PublicReportPayload['answers'],
    }
    expect(buildPublicReportUrl(new URL('https://guaihaowan.com/year-report/'), huge)).toBeNull()
  })

  it('上限是 1800 个字符', () => {
    expect(MAX_REPORT_FRAGMENT_LENGTH).toBe(1800)
  })
})

describe('readReportFragment', () => {
  it('能从 hash 中读出 payload', () => {
    const encoded = encodePublicReport(PAYLOAD)
    expect(readReportFragment(`#${REPORT_FRAGMENT_PREFIX}${encoded}`)).toEqual(PAYLOAD)
  })

  it('没有 report fragment 时返回 null', () => {
    expect(readReportFragment('')).toBeNull()
    expect(readReportFragment('#')).toBeNull()
    expect(readReportFragment('#other=1')).toBeNull()
  })

  it('非法 fragment 返回 invalid 标记而不是抛错', () => {
    expect(readReportFragment(`#${REPORT_FRAGMENT_PREFIX}!!!`)).toBe('invalid')
  })
})
