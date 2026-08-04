import { describe, expect, it } from 'vitest'
import { STYLE_REMARKS, classifyStyle, styleRemark } from './style-remark'

describe('classifyStyle', () => {
  it('同一选项 ≥7 次 → single-minded', () =>
    expect(classifyStyle([0, 0, 0, 0, 0, 0, 0, 1, 2, 3])).toBe('single-minded'))
  it('四选项全用且最高 ≤4 → unpredictable', () =>
    expect(classifyStyle([0, 1, 2, 3, 0, 1, 2, 3, 0, 1])).toBe('unpredictable'))
  it('连续 ≥4 同选项（未触发前两条）→ steady', () =>
    expect(classifyStyle([0, 0, 0, 0, 1, 2, 1, 2, 1, 2])).toBe('steady'))
  it('其余 → classic', () => expect(classifyStyle([0, 1, 0, 1, 2, 0, 1, 0, 1, 0])).toBe('classic'))
  it('优先级：满 10 同选项归 single-minded 而非 steady', () =>
    expect(classifyStyle(Array(10).fill(2))).toBe('single-minded'))
})

describe('styleRemark', () => {
  it('四种风格锐评各不相同且非空', () => {
    const texts = Object.values(STYLE_REMARKS)
    expect(new Set(texts).size).toBe(4)
    for (const t of texts) expect(t.length).toBeGreaterThan(0)
  })
  it('返回对应风格的文案', () =>
    expect(styleRemark(Array(10).fill(0))).toBe(STYLE_REMARKS['single-minded']))
})
