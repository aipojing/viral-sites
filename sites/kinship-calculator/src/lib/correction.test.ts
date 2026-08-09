import { describe, expect, it } from 'vitest'
import { buildCorrectionText, getCorrectionUrl } from './correction'

describe('getCorrectionUrl', () => {
  it('配置了 VITE_CORRECTION_URL 时返回表单地址', () => {
    expect(getCorrectionUrl({ VITE_CORRECTION_URL: 'https://forms.example.com/kinship' })).toBe(
      'https://forms.example.com/kinship',
    )
  })

  it('缺失、空串或非字符串时返回 null，触发复制降级', () => {
    expect(getCorrectionUrl({})).toBeNull()
    expect(getCorrectionUrl({ VITE_CORRECTION_URL: '' })).toBeNull()
    expect(getCorrectionUrl({ VITE_CORRECTION_URL: '   ' })).toBeNull()
    expect(getCorrectionUrl({ VITE_CORRECTION_URL: 123 })).toBeNull()
  })
})

describe('buildCorrectionText', () => {
  it('只包含条目 id、候选称呼与用户说明，不含关系链原文', () => {
    const text = buildCorrectionText('kc-maternal-uncle', ['舅舅'], '我们这里叫舅父')
    expect(text).toContain('条目：kc-maternal-uncle')
    expect(text).toContain('当前称呼：舅舅')
    expect(text).toContain('我的说明：我们这里叫舅父')
  })

  it('用户没写说明时不带说明行，说明两端空白会被裁掉', () => {
    expect(buildCorrectionText('kc-x', ['堂哥', '堂弟'], '')).not.toContain('我的说明')
    expect(buildCorrectionText('kc-x', ['堂哥'], '  hi  ')).toContain('我的说明：hi')
  })
})
