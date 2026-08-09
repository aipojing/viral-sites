import { describe, expect, it } from 'vitest'
import { makeBaseFact } from './fact-lint'
import { formatFactValue } from './format-value'
import type { WorldFact } from '../data/fact-types'

/** 每秒发生 timesPerSecond 次的便捷事实 */
function perSecondFact(timesPerSecond: number, overrides: Partial<WorldFact> = {}): WorldFact {
  return makeBaseFact({
    value: timesPerSecond,
    period: { unit: 'custom-seconds', seconds: 1 },
    ...overrides,
  })
}

describe('formatFactValue', () => {
  it('累计值 <1 时返回 waiting 与平均还需秒数', () => {
    // 每秒 0.5 次：还需 ceil((1-0)/0.5)=2 秒
    const slow = perSecondFact(0.5)
    const display = formatFactValue(slow, 0)
    expect(display.kind).toBe('waiting')
    expect(display).toMatchObject({ secondsRemaining: 2, text: '平均还需 2 秒' })

    // 已积累 0.5，还差 0.5，需要 ceil(0.5/0.5)=1 秒
    expect(formatFactValue(slow, 1_000)).toMatchObject({ kind: 'waiting', secondsRemaining: 1 })
  })

  it('waiting 大数字带千分位', () => {
    const moon = makeBaseFact({
      value: 4,
      period: { unit: 'year', referenceYear: 2025 },
      outputUnit: '厘米',
    })
    const display = formatFactValue(moon, 0)
    expect(display.kind).toBe('waiting')
    if (display.kind === 'waiting') {
      expect(display.secondsRemaining).toBe(Math.ceil(31_536_000 / 4))
      expect(display.text).toBe('平均还需 7,884,000 秒')
    }
  })

  it('累计值 >=1 时按个位数与指定小数展示', () => {
    const heart = perSecondFact(1.2, { decimals: 1, outputUnit: '次' })
    expect(formatFactValue(heart, 1_000)).toMatchObject({ kind: 'count', text: '1.2 次', raw: 1.2 })
  })

  it('千分位分隔', () => {
    const fast = perSecondFact(3_785.2, { decimals: 0, outputUnit: '件' })
    expect(formatFactValue(fast, 1_000)).toMatchObject({ kind: 'count', text: '3,785 件' })

    // 万单位换算后仍然保留千分位
    const bigger = perSecondFact(12_345_678, { decimals: 0, outputUnit: '件' })
    expect(formatFactValue(bigger, 1_000)).toMatchObject({ kind: 'count', text: '1,235万 件' })
  })

  it('超大数使用万、亿、万亿中文单位', () => {
    expect(formatFactValue(perSecondFact(12_345.6, { decimals: 1 }), 1_000)).toMatchObject({
      kind: 'count',
      text: '1.2万 件',
    })
    expect(formatFactValue(perSecondFact(378_523.4, { decimals: 0 }), 1_000)).toMatchObject({
      kind: 'count',
      text: '38万 件',
    })
    expect(formatFactValue(perSecondFact(456_789_012, { decimals: 1 }), 1_000)).toMatchObject({
      kind: 'count',
      text: '4.6亿 件',
    })
    expect(formatFactValue(perSecondFact(2.5e12, { decimals: 1 }), 1_000)).toMatchObject({
      kind: 'count',
      text: '2.5万亿 件',
    })
  })

  it('删除末尾无意义 0', () => {
    expect(formatFactValue(perSecondFact(2, { decimals: 2 }), 1_000)).toMatchObject({ kind: 'count', text: '2 件' })
    expect(formatFactValue(perSecondFact(2.5, { decimals: 2 }), 1_000)).toMatchObject({ kind: 'count', text: '2.5 件' })
  })

  it('无效 elapsed 不产生 NaN，也不显示分数个体', () => {
    const display = formatFactValue(perSecondFact(0.5), Number.NaN)
    expect(display.kind).toBe('waiting')
    expect(display.text).not.toContain('NaN')
    expect(formatFactValue(perSecondFact(1), -100)).toMatchObject({ kind: 'waiting' })
  })
})
