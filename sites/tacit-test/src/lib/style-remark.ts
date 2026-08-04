export type StyleId = 'single-minded' | 'unpredictable' | 'steady' | 'classic'

export const STYLE_REMARKS: Record<StyleId, string> = {
  'single-minded': '答题像盖章，认准一个选项就不撒手——这份执拗，对方肯定领教过',
  unpredictable: '四个选项雨露均沾，出题人都摸不透你，何况屏幕对面那位',
  steady: '一连好几题不换选项，你是把你们的日常答成了肌肉记忆',
  classic: '选得有来有回，看得出你认真回忆了你们的每一件小事',
}

export function classifyStyle(answers: readonly number[]): StyleId {
  const counts = [0, 0, 0, 0]
  for (const a of answers) counts[a] += 1
  const max = Math.max(...counts)
  const used = counts.filter((c) => c > 0).length
  let streak = 1
  let longest = 1
  for (let i = 1; i < answers.length; i += 1) {
    streak = answers[i] === answers[i - 1] ? streak + 1 : 1
    longest = Math.max(longest, streak)
  }
  if (max >= 7) return 'single-minded'
  if (used === 4 && max <= 4) return 'unpredictable'
  if (longest >= 4) return 'steady'
  return 'classic'
}

export function styleRemark(answers: readonly number[]): string {
  return STYLE_REMARKS[classifyStyle(answers)]
}
