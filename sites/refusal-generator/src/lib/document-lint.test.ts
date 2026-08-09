import { describe, expect, it } from 'vitest'
import type { DocumentCell, DocumentTemplate } from './document-schema'
import { lintDocumentTemplates } from './document-lint'

const CELL: DocumentCell = { type: 'apology', scene: 'late', audience: 'boss', tone: 'sincere' }

function makeTemplate(index: number, overrides: Partial<DocumentTemplate> = {}): DocumentTemplate {
  return {
    id: `ap-late-boss-sincere-${index}`,
    type: CELL.type,
    scene: CELL.scene,
    audience: CELL.audience,
    tone: CELL.tone,
    kind: 'usable',
    text: `抱歉{对象称呼}，这次{事由}是我的问题，给你添麻烦了，也打乱了你的安排。第 ${index} 条候选文案。`,
    reviewedBy: ['dev-a', 'dev-b'],
    ...overrides,
  }
}

const TRIPLE = [makeTemplate(1), makeTemplate(2), makeTemplate(3)]

describe('lintDocumentTemplates', () => {
  it('三个启用单元候选齐全的模板没有问题', () => {
    expect(lintDocumentTemplates(TRIPLE, [CELL])).toEqual([])
  })

  it('重复 id 报 duplicate-id', () => {
    const issues = lintDocumentTemplates(
      [makeTemplate(1), makeTemplate(1, { text: '抱歉{对象称呼}，这次{事由}是我的问题，换一条不同的文案。' }), makeTemplate(3)],
      [CELL],
    )
    expect(issues.some((issue) => issue.code === 'duplicate-id')).toBe(true)
  })

  it('启用单元缺失报 missing-cell，数量不是 3 报 candidate-count', () => {
    const otherCell: DocumentCell = { ...CELL, tone: 'brief' }
    const issues = lintDocumentTemplates(TRIPLE, [CELL, otherCell])
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'missing-cell', id: 'apology/late/boss/brief' }),
    )
    const two = lintDocumentTemplates(TRIPLE.slice(0, 2), [CELL])
    expect(two.some((issue) => issue.code === 'candidate-count')).toBe(true)
  })

  it('同单元出现重复正文视为候选不合格', () => {
    const issues = lintDocumentTemplates(
      [makeTemplate(1), makeTemplate(2, { text: TRIPLE[0].text }), makeTemplate(3)],
      [CELL],
    )
    expect(issues.some((issue) => issue.code === 'candidate-count')).toBe(true)
  })

  it('渲染后长度超出 40～180 报 length', () => {
    const issues = lintDocumentTemplates(
      [makeTemplate(1, { text: `抱歉{对象称呼}，${'很长'.repeat(100)}。` }), makeTemplate(2), makeTemplate(3)],
      [CELL],
    )
    expect(issues.some((issue) => issue.code === 'length')).toBe(true)
  })

  it('未知变量报 unknown-variable', () => {
    const issues = lintDocumentTemplates(
      [makeTemplate(1, { text: '抱歉{真实姓名}，这次{事由}是我的问题，给你添麻烦了，抱歉。' }), makeTemplate(2), makeTemplate(3)],
      [CELL],
    )
    expect(issues.some((issue) => issue.code === 'unknown-variable')).toBe(true)
  })

  it('tone 与 kind 不匹配报 kind-mismatch', () => {
    const issues = lintDocumentTemplates(
      [makeTemplate(1, { tone: 'wenyan', kind: 'usable' }), makeTemplate(2), makeTemplate(3)],
      [CELL],
    )
    expect(issues.some((issue) => issue.code === 'kind-mismatch')).toBe(true)
  })

  it('审核人缺失或相同报 missing-review', () => {
    const issues = lintDocumentTemplates(
      [makeTemplate(1, { reviewedBy: ['solo', 'solo'] }), makeTemplate(2), makeTemplate(3)],
      [CELL],
    )
    expect(issues.some((issue) => issue.code === 'missing-review')).toBe(true)
  })
})
