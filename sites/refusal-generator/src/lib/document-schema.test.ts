import { describe, expect, it } from 'vitest'
import { DOCUMENT_TONES } from '../configs/document-tones'
import type { DocumentTemplate } from './document-schema'
import { documentTemplatesSchema } from './document-schema'

function makeTemplate(overrides: Partial<DocumentTemplate> = {}): DocumentTemplate {
  return {
    id: 'ap-late-boss-sincere-1',
    type: 'apology',
    scene: 'late',
    audience: 'boss',
    tone: 'sincere',
    kind: 'usable',
    text: '抱歉{对象称呼}，这次{事由}是我的问题，影响了安排。[[我会{补救动作}，]]后面不会再出现这种情况。',
    reviewedBy: ['dev-a', 'dev-b'],
    ...overrides,
  }
}

describe('documentTemplatesSchema', () => {
  it('接受一条合法的正式模板', () => {
    expect(() => documentTemplatesSchema.parse([makeTemplate()])).not.toThrow()
  })

  it('正文按 code points 计算，过短或超过 180 失败', () => {
    expect(() => documentTemplatesSchema.parse([makeTemplate({ text: '太短了。' })])).toThrow()
    expect(() =>
      documentTemplatesSchema.parse([makeTemplate({ text: `{事由}${'长'.repeat(200)}` })]),
    ).toThrow()
  })

  it('允许变量仅为 对象称呼/事由/日期/补救动作', () => {
    expect(() =>
      documentTemplatesSchema.parse([makeTemplate({ text: `${'凑字数'.repeat(14)}{真实姓名}。` })]),
    ).toThrow()
  })

  it('拒绝嵌套可选块', () => {
    expect(() =>
      documentTemplatesSchema.parse([
        makeTemplate({ text: `${'凑字数'.repeat(14)}[[外层[[{事由}]]]]` }),
      ]),
    ).toThrow()
  })

  it('tone 与 kind 绑定：正式语气只能 usable，娱乐语气只能 joke', () => {
    expect(() =>
      documentTemplatesSchema.parse([makeTemplate({ tone: 'wenyan', kind: 'usable' })]),
    ).toThrow()
    expect(() =>
      documentTemplatesSchema.parse([makeTemplate({ tone: 'sincere', kind: 'joke' })]),
    ).toThrow()
  })

  it('审核人必须是两个不同的非空标识', () => {
    expect(() => documentTemplatesSchema.parse([makeTemplate({ reviewedBy: ['', 'b'] })])).toThrow()
    expect(() =>
      documentTemplatesSchema.parse([makeTemplate({ reviewedBy: ['same', 'same'] })]),
    ).toThrow()
  })

  it('DOCUMENT_TONES 的 kind 与计划一致', () => {
    expect(DOCUMENT_TONES.map((t) => [t.id, t.kind])).toEqual([
      ['sincere', 'usable'],
      ['brief', 'usable'],
      ['gentle', 'usable'],
      ['wenyan', 'joke'],
      ['fafeng', 'joke'],
    ])
  })
})
