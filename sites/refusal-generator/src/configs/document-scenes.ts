import type { DocumentType } from './document-types'

export interface DocumentScene {
  id: string
  type: DocumentType
  label: string
  icon: string
  color: string
}

export const DOCUMENT_SCENES: readonly DocumentScene[] = [
  { id: 'late', type: 'apology', label: '迟到', icon: '⏰', color: '#ea580c' },
  { id: 'forgot-reply', type: 'apology', label: '忘回消息', icon: '💬', color: '#0d9488' },
  { id: 'forgot-day', type: 'apology', label: '忘记重要日子', icon: '📅', color: '#db2777' },
  { id: 'no-show', type: 'apology', label: '临时爽约', icon: '🪑', color: '#7c3aed' },
  { id: 'missed-work', type: 'apology', label: '工作遗漏', icon: '📎', color: '#2563eb' },
  { id: 'delayed', type: 'apology', label: '交付延期', icon: '📦', color: '#d97706' },
  { id: 'sick', type: 'leave', label: '身体不适', icon: '🌡️', color: '#dc2626' },
  { id: 'family', type: 'leave', label: '家庭事务', icon: '🏠', color: '#16a34a' },
  { id: 'personal', type: 'leave', label: '个人事务', icon: '🧾', color: '#0d9488' },
  { id: 'comp-off', type: 'leave', label: '临时调休', icon: '🔁', color: '#2563eb' },
  { id: 'rest', type: 'leave', label: '需要短暂休息', icon: '🫧', color: '#7c3aed' },
]
