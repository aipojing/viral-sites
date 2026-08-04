export const PLACEHOLDER_ADDRESSEE = '{对方称呼}'
export const DEFAULT_ADDRESSEE = '亲'
export const ADDRESSEE_MAX_LENGTH = 12

export function normalizeAddressee(raw?: string): string {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return DEFAULT_ADDRESSEE
  return [...trimmed].slice(0, ADDRESSEE_MAX_LENGTH).join('')
}

export function hasAddresseePlaceholder(template: string): boolean {
  return template.includes(PLACEHOLDER_ADDRESSEE)
}

export function renderTemplate(template: string, addressee?: string): string {
  return template.split(PLACEHOLDER_ADDRESSEE).join(normalizeAddressee(addressee))
}
