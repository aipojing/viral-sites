export interface DocumentAudience {
  id: string
  label: string
}

export const DOCUMENT_AUDIENCES: readonly DocumentAudience[] = [
  { id: 'boss', label: '老板' },
  { id: 'teacher', label: '老师' },
  { id: 'client', label: '客户' },
  { id: 'colleague', label: '同事' },
  { id: 'partner', label: '对象' },
  { id: 'friend', label: '朋友' },
]
