export function wrapByLength(text: string, maxChars: number): string[] {
  if (!Number.isInteger(maxChars) || maxChars <= 0) {
    throw new Error('maxChars 必须为正整数')
  }
  const chars = Array.from(text)
  if (chars.length === 0) return ['']
  const lines: string[] = []
  for (let i = 0; i < chars.length; i += maxChars) {
    lines.push(chars.slice(i, i + maxChars).join(''))
  }
  return lines
}
