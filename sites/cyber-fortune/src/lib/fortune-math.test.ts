import { describe, expect, it } from 'vitest'
import { POOLS } from '../content/pools'
import { drawFortune, fortuneSeed, normalizeNickname } from './fortune-math'

const D = new Date(Date.UTC(2026, 7, 4, 4, 0))

describe('normalizeNickname', () => {
  it('trim + 英文小写', () => {
    expect(normalizeNickname('  AFu ')).toBe('afu')
  })

  it('NFC 归一：组合字符与预组合字符等价', () => {
    expect(normalizeNickname('café')).toBe(normalizeNickname('café'))
  })
})

describe('fortuneSeed', () => {
  it('大小写/空白不敏感（同人同签的前提）', () => {
    expect(fortuneSeed(' AFu ', '2026-08-04')).toBe(fortuneSeed('afu', '2026-08-04'))
  })

  it('日期或版本号不同则 seed 不同', () => {
    expect(fortuneSeed('afu', '2026-08-04')).not.toBe(fortuneSeed('afu', '2026-08-05'))
    expect(fortuneSeed('afu', '2026-08-04', 'v1')).not.toBe(
      fortuneSeed('afu', '2026-08-04', 'v2'),
    )
  })
})

describe('drawFortune 确定性', () => {
  it('同人同天同签（两次独立调用完全一致 = 跨设备一致）', () => {
    expect(drawFortune('阿福', D)).toEqual(drawFortune('阿福', D))
  })

  it('昵称归一化后等价：「 AFu 」与「afu」同签', () => {
    const a = drawFortune(' AFu ', D)
    const b = drawFortune('afu', D)
    expect(a.poem).toEqual(b.poem)
    expect(a.yi).toEqual(b.yi)
    expect(a.ji).toEqual(b.ji)
  })

  it('结果字段完整且签诗等级与抽中等级一致', () => {
    const f = drawFortune('阿福', D)
    expect(f.dateKey).toBe('2026-08-04')
    expect(f.nickname).toBe('阿福')
    expect(f.poem.level).toBe(f.level)
    expect(f.yi).toHaveLength(2)
    expect(f.ji).toHaveLength(2)
  })
})

describe('drawFortune 约束扫描（500 个昵称）', () => {
  const fortunes = Array.from({ length: 500 }, (_, i) => drawFortune(`打工人${i}`, D))

  it('宜/忌各自不重复，贵人 ≠ 小人', () => {
    for (const f of fortunes) {
      expect(f.yi[0].id).not.toBe(f.yi[1].id)
      expect(f.ji[0].id).not.toBe(f.ji[1].id)
      expect(f.guiren.id).not.toBe(f.xiaoren.id)
    }
  })

  it('宜忌冲突黑名单生效：任何签都不含冲突对', () => {
    for (const f of fortunes) {
      const yiIds = new Set(f.yi.map((i) => i.id))
      const jiIds = new Set(f.ji.map((i) => i.id))
      for (const pair of POOLS.conflicts) {
        expect(yiIds.has(pair.yi) && jiIds.has(pair.ji)).toBe(false)
      }
    }
  })
})

describe('等级权重分布（2000 个昵称统计测试）', () => {
  it('大吉≈15% 中吉≈30% 小吉≈30% 平≈15% 小凶≈10%（各 ±5pp）', () => {
    const counts: Record<string, number> = {}
    for (let i = 0; i < 2000; i += 1) {
      const f = drawFortune(`用户${i}`, D)
      counts[f.level] = (counts[f.level] ?? 0) + 1
    }
    expect(counts['大吉']).toBeGreaterThanOrEqual(200)
    expect(counts['大吉']).toBeLessThanOrEqual(400)
    expect(counts['中吉']).toBeGreaterThanOrEqual(500)
    expect(counts['中吉']).toBeLessThanOrEqual(700)
    expect(counts['小吉']).toBeGreaterThanOrEqual(500)
    expect(counts['小吉']).toBeLessThanOrEqual(700)
    expect(counts['平']).toBeGreaterThanOrEqual(200)
    expect(counts['平']).toBeLessThanOrEqual(400)
    expect(counts['小凶']).toBeGreaterThanOrEqual(100)
    expect(counts['小凶']).toBeLessThanOrEqual(300)
  })
})
