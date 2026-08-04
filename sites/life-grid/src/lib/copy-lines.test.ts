import { describe, expect, it } from 'vitest'
import type { LifeStats } from './life-math'
import { buildCopyLines, pickCardLine } from './copy-lines'

const normal: LifeStats = {
  age: 30,
  weeksLived: 1565,
  totalWeeks: 4056,
  percent: 38.6,
  blankWeeks: 2491,
  bonusWeeks: 0,
  meetingsPerYear: 2,
  parentMeetings: 40,
  springFestivals: 48,
  workdays: 7500,
}

describe('buildCopyLines', () => {
  it('正常模式 6 条且顺序符合设计', () => {
    const ids = buildCopyLines(normal).map((l) => l.id)
    expect(ids).toEqual(['percent', 'weeks', 'parents', 'festivals', 'workdays', 'blank'])
  })

  it('数字千分位格式化', () => {
    const weeks = buildCopyLines(normal).find((l) => l.id === 'weeks')!
    expect(weeks.text).toContain('1,565')
  })

  it('父母 ≥78 时换成暖文案，不出现数字 0', () => {
    const line = buildCopyLines({ ...normal, parentMeetings: 'every-one-counts' }).find(
      (l) => l.id === 'parents',
    )!
    expect(line.text).toBe('和父母的每一次见面，都是赚到')
  })

  it('退休后 workdays 换文案', () => {
    const line = buildCopyLines({ ...normal, workdays: 'done' }).find((l) => l.id === 'workdays')!
    expect(line.text).toBe('你已经熬过了所有工作日')
  })

  it('彩蛋模式只有 bonus 一条', () => {
    const lines = buildCopyLines({ ...normal, bonusWeeks: 100, blankWeeks: 0 })
    expect(lines).toHaveLength(1)
    expect(lines[0].id).toBe('bonus')
    expect(lines[0].text).toContain('100')
  })
})

describe('pickCardLine', () => {
  it('有父母数字时选父母条', () => {
    expect(pickCardLine(normal)).toContain('还能见父母')
  })
  it('父母条不可用时退回百分比条', () => {
    expect(pickCardLine({ ...normal, parentMeetings: 'every-one-counts' })).toContain('38.6%')
  })
  it('彩蛋模式选 bonus 条', () => {
    expect(pickCardLine({ ...normal, bonusWeeks: 100 })).toContain('奖励')
  })
})
