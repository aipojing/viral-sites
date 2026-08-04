export interface Scene {
  id: string
  label: string
  icon: string
  color: string
  span: 1 | 2
}

export const SCENES: readonly Scene[] = [
  { id: 'jieqian', label: '被借钱', icon: '💸', color: '#0d9488', span: 2 },
  { id: 'kanjia', label: '被拉群砍价', icon: '🔪', color: '#ea580c', span: 1 },
  { id: 'xiangqin', label: '被安排相亲', icon: '💘', color: '#db2777', span: 1 },
  { id: 'jiaban', label: '被叫周末加班', icon: '🧑‍💻', color: '#2563eb', span: 2 },
  { id: 'banka', label: '被推销办卡', icon: '💳', color: '#7c3aed', span: 1 },
  { id: 'fenziqian', label: '被要份子钱', icon: '🧧', color: '#dc2626', span: 1 },
  { id: 'banjia', label: '被要求帮忙搬家', icon: '📦', color: '#d97706', span: 1 },
  { id: 'tuanjian', label: '被拉去团建', icon: '🚌', color: '#16a34a', span: 2 },
]
