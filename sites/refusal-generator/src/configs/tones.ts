export interface Tone {
  id: string
  label: string
}

export const TONES: readonly Tone[] = [
  { id: 'weiwan', label: '委婉体面' },
  { id: 'yinggang', label: '直球硬刚' },
  { id: 'fafeng', label: '发疯文学' },
  { id: 'wenyan', label: '文言文' },
  { id: 'heihua', label: '职场黑话' },
]
