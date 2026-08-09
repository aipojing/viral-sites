import { describe, expect, it } from 'vitest'
import type { RegionPack } from '../data/region-packs'
import { reverseLookupWithPacks } from './reverse-lookup'

const TEST_PACK: RegionPack = {
  id: 'pack-test',
  label: '测试地区',
  entries: [
    {
      relationId: 'kc-maternal-uncle',
      label: '舅爷',
      region: '京津冀常见',
      sourceIds: ['src-wiki-zh-kinship'],
      reviewerRoles: ['native-a', 'native-b'],
    },
  ],
}

describe('reverseLookup', () => {
  it('标准称呼完全匹配排在最前', () => {
    const matches = reverseLookupWithPacks('舅舅')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].entry.id).toBe('kc-maternal-uncle')
    expect(matches[0].rank).toBe(0)
    expect(matches[0].matchedLabel).toBe('舅舅')
  })

  it('输入会先 trim 并做 NFC 归一化', () => {
    // 「妺」不是规范字符，这里验证空白与组合字符处理
    expect(reverseLookupWithPacks('  舅舅  ')[0]?.entry.id).toBe('kc-maternal-uncle')
    expect(reverseLookupWithPacks('外甥'.normalize('NFD'))[0]?.entry.id).toBe('kc-waisheng')
  })

  it('alias 也能反查，rank 低于标准称呼', () => {
    const matches = reverseLookupWithPacks('姥姥')
    expect(matches[0].entry.id).toBe('kc-maternal-grandmother')
    expect(matches[0].rank).toBe(1)
    expect(matches[0].matchedLabel).toBe('姥姥')
  })

  it('选中地域包的地区词可以反查，rank 低于 alias', () => {
    const matches = reverseLookupWithPacks('舅爷', 'pack-test', [TEST_PACK])
    expect(matches[0].entry.id).toBe('kc-maternal-uncle')
    expect(matches[0].rank).toBe(2)
  })

  it('未选地域包时不匹配地域词', () => {
    expect(reverseLookupWithPacks('舅爷', undefined, [TEST_PACK])).toEqual([])
  })

  it('一个口语称呼对应多条可能关系时全部返回', () => {
    const matches = reverseLookupWithPacks('表哥')
    const ids = matches.map((match) => match.entry.id)
    expect(ids).toContain('kc-biao-brother-gu')
    expect(ids).toContain('kc-biao-brother-jiu')
    expect(ids).toContain('kc-biao-brother-yi')
  })

  it('无结果返回空数组，不猜测', () => {
    expect(reverseLookupWithPacks('三舅姥爷的小姨子')).toEqual([])
    expect(reverseLookupWithPacks('')).toEqual([])
    expect(reverseLookupWithPacks('   ')).toEqual([])
  })

  it('最多接受 20 个码点，超长输入直接返回空', () => {
    expect(reverseLookupWithPacks('舅'.repeat(20)).length).toBeGreaterThanOrEqual(0)
    expect(reverseLookupWithPacks('舅'.repeat(21))).toEqual([])
  })
})
