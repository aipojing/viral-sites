import { describe, expect, it } from 'vitest'
import type { DocumentValues } from './document-render'
import { classifyDocumentInput } from './document-safety'

// fixture 仅在内存中使用，不写入快照、埋点或日志
function values(reason: string): DocumentValues {
  return { reason }
}

describe('classifyDocumentInput', () => {
  it('普通道歉/请假输入判定为 normal', () => {
    expect(classifyDocumentInput(values('发烧在家休息'))).toBe('normal')
    expect(classifyDocumentInput(values('忘记回复消息'))).toBe('normal')
    expect(
      classifyDocumentInput({
        addressee: '王总',
        reason: '临时有事',
        date: '下周一',
        remedy: '尽快补上',
      }),
    ).toBe('normal')
  })

  it('自伤倾向输入判定为 sensitive', () => {
    expect(classifyDocumentInput(values('最近很不想活'))).toBe('sensitive')
    expect(classifyDocumentInput(values('想结束自己'))).toBe('sensitive')
  })

  it('暴力威胁输入判定为 sensitive', () => {
    expect(classifyDocumentInput(values('我要报复他'))).toBe('sensitive')
    expect(classifyDocumentInput(values('带刀去找他'))).toBe('sensitive')
  })

  it('严重医疗状况输入判定为 sensitive', () => {
    expect(classifyDocumentInput(values('确诊癌症'))).toBe('sensitive')
    expect(classifyDocumentInput(values('昏迷住院'))).toBe('sensitive')
  })

  it('所有字段都参与判定', () => {
    expect(classifyDocumentInput({ reason: '请假', remedy: '想轻生' })).toBe('sensitive')
  })
})
