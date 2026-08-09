import { describe, expect, it } from 'vitest'
import { MILESTONES, TITLES, milestoneAt, titleAt } from './milestones'

const MINUTE = 60_000

describe('milestones', () => {
  it('至少 25 个节点且严格递增', () => {
    expect(MILESTONES.length).toBeGreaterThanOrEqual(25)
    for (let i = 1; i < MILESTONES.length; i += 1) {
      expect(MILESTONES[i].atMs).toBeGreaterThan(MILESTONES[i - 1].atMs)
    }
  })

  it('首个节点 ≤3 秒，最后覆盖 20 分钟，并覆盖关键节点', () => {
    expect(MILESTONES[0].atMs).toBeLessThanOrEqual(3_000)
    expect(MILESTONES[MILESTONES.length - 1].atMs).toBe(20 * MINUTE)
    const points = new Set(MILESTONES.map((m) => m.atMs))
    for (const required of [3_000, 10_000, 30_000, 2 * MINUTE, 5 * MINUTE, 10 * MINUTE, 20 * MINUTE]) {
      expect(points.has(required)).toBe(true)
    }
  })

  it('每条文案 ≤32 code points，且不含羞辱或身体能力词', () => {
    const forbidden = ['手残', '废物', '残疾', '太慢', '不行', '笨', '弱鸡', '废', '菜', '垃圾', '身体', '体力']
    for (const { text } of MILESTONES) {
      expect([...text].length).toBeLessThanOrEqual(32)
      for (const word of forbidden) {
        expect(text.includes(word)).toBe(false)
      }
    }
  })

  it('milestoneAt 返回 atMs <= durationMs 的最后一个节点', () => {
    expect(milestoneAt(3_000)).toEqual(expect.objectContaining({ atMs: 3_000 }))
    expect(milestoneAt(3_001)).toEqual(expect.objectContaining({ atMs: 3_000 }))
    expect(milestoneAt(20 * MINUTE)).toEqual(expect.objectContaining({ atMs: 20 * MINUTE }))
    expect(milestoneAt(21 * MINUTE)).toEqual(expect.objectContaining({ atMs: 20 * MINUTE }))
    // 小于首个节点时回落到首个节点
    expect(milestoneAt(0)).toBe(MILESTONES[0])
  })
})

describe('titles', () => {
  it('称号阈值固定并覆盖五档', () => {
    expect(TITLES.map((t) => t.title)).toEqual([
      '路过按了一下',
      '有点耐心',
      '按钮研究员',
      '另一只手生活家',
      '人类通关',
    ])
  })

  it('titleAt 按阈值取最高称号', () => {
    expect(titleAt(0).title).toBe('路过按了一下')
    expect(titleAt(29_999).title).toBe('路过按了一下')
    expect(titleAt(30_000).title).toBe('有点耐心')
    expect(titleAt(2 * MINUTE).title).toBe('按钮研究员')
    expect(titleAt(5 * MINUTE).title).toBe('另一只手生活家')
    expect(titleAt(20 * MINUTE).title).toBe('人类通关')
    expect(titleAt(60 * MINUTE).title).toBe('人类通关')
  })
})
