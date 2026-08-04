const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export function dateKeyUTC8(now: Date): string {
  const shifted = new Date(now.getTime() + UTC8_OFFSET_MS)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function yesterdayKeyUTC8(now: Date): string {
  return dateKeyUTC8(new Date(now.getTime() - DAY_MS))
}
