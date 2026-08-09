export type DocumentType = 'apology' | 'leave'

export interface DocumentTypeOption {
  id: DocumentType
  label: string
}

// 产品名称固定为「请假消息」，不生成任何证明类文件。
export const DOCUMENT_TYPES: readonly DocumentTypeOption[] = [
  { id: 'apology', label: '道歉' },
  { id: 'leave', label: '请假消息' },
]
