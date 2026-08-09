import type { DocumentKind } from '../lib/document-schema'

export interface DocumentTone {
  id: string
  label: string
  kind: DocumentKind
}

// kind 是构建期强制字段：正式语气只能 usable，娱乐语气只能 joke，两者不可混批。
export const DOCUMENT_TONES: readonly DocumentTone[] = [
  { id: 'sincere', label: '诚恳', kind: 'usable' },
  { id: 'brief', label: '简短', kind: 'usable' },
  { id: 'gentle', label: '委婉', kind: 'usable' },
  { id: 'wenyan', label: '文言文', kind: 'joke' },
  { id: 'fafeng', label: '发疯文学', kind: 'joke' },
]
