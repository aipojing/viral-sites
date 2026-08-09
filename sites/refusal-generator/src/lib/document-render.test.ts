import { describe, expect, it } from 'vitest'
import type { DocumentTemplate } from './document-schema'
import { normalizeDocumentValues, renderDocumentBatch } from './document-render'

function makeTemplate(index: number, text?: string): DocumentTemplate {
  return {
    id: `lv-sick-boss-sincere-${index}`,
    type: 'leave',
    scene: 'sick',
    audience: 'boss',
    tone: 'sincere',
    kind: 'usable',
    text: text ?? `{对象称呼}，我因{事由}想请假。[[预计{日期}返岗，]][[期间我会{补救动作}。]]候选 ${index}`,
    reviewedBy: ['dev-a', 'dev-b'],
  }
}

const TRIPLE = [makeTemplate(1), makeTemplate(2), makeTemplate(3)]
const VALUES = { reason: '身体不适', date: '明天', remedy: '及时回复消息' }

describe('normalizeDocumentValues', () => {
  it('称呼留空时保持留空，渲染层负责换成中性词', () => {
    expect(normalizeDocumentValues({ ...VALUES, addressee: '   ' }).addressee).toBe('')
  })

  it('事由等自由输入最多保留 30 个 code points', () => {
    const normalized = normalizeDocumentValues({ ...VALUES, reason: '因'.repeat(40) })
    expect(Array.from(normalized.reason)).toHaveLength(30)
  })

  it('全部字段去除首尾空白', () => {
    const normalized = normalizeDocumentValues({
      addressee: ' 王经理 ',
      reason: ' 身体不适 ',
      date: ' 明天 ',
      remedy: ' 补上进度 ',
    })
    expect(normalized).toEqual({
      addressee: '王经理',
      reason: '身体不适',
      date: '明天',
      remedy: '补上进度',
    })
  })
})

describe('renderDocumentBatch', () => {
  it('称呼留空时使用中性词', () => {
    const [first] = renderDocumentBatch(TRIPLE, VALUES)
    expect(first.text).toContain('你好')
  })

  it('可选的日期与补救动作缺失时整句自然消失', () => {
    const [first] = renderDocumentBatch(TRIPLE, { reason: '身体不适' })
    expect(first.text).toBe('你好，我因身体不适想请假。候选 1')
  })

  it('特殊字符保持纯文本插入', () => {
    const [first] = renderDocumentBatch(TRIPLE, { ...VALUES, reason: '<b>生病</b> & "难受"' })
    expect(first.text).toContain('<b>生病</b> & "难受"')
  })

  it('同一批三条候选互不重复且保留模板 id 与 kind', () => {
    const batch = renderDocumentBatch(TRIPLE, VALUES)
    expect(batch).toHaveLength(3)
    expect(new Set(batch.map((doc) => doc.text)).size).toBe(3)
    expect(batch.map((doc) => doc.id)).toEqual(TRIPLE.map((t) => t.id))
    expect(batch.every((doc) => doc.kind === 'usable')).toBe(true)
  })

  it('事由为空白时拒绝生成', () => {
    expect(() => renderDocumentBatch(TRIPLE, { reason: '   ' })).toThrowError(/事由/)
  })

  it('候选数量不是 3 条时拒绝生成', () => {
    expect(() => renderDocumentBatch(TRIPLE.slice(0, 2), VALUES)).toThrow()
  })
})
