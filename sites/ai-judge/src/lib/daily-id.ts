const STORAGE_KEY = 'ai_judge_daily_id'

interface StoredDailyId {
  dateKey: string
  id: string
}

/** 北京时间（UTC+8）日期键，与 Worker 侧 DO 的日切保持一致 */
export function dateKeyBeijing(now: Date): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

function randomId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    // RFC 4122 v4: version 4 + RFC variant bits, compatible with Worker normalize。
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
}

/**
 * 每日随机身份：只用于本玩法的当日次数限制，不跨站复用。
 * localStorage 损坏或跨日时重新生成，绝不让异常打断玩法。
 */
export function getDailyId(now: Date = new Date()): string {
  const dateKey = dateKeyBeijing(now)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredDailyId
      if (parsed && parsed.dateKey === dateKey && typeof parsed.id === 'string' && parsed.id.length > 0) {
        return parsed.id
      }
    }
    const id = randomId()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dateKey, id }))
    return id
  } catch {
    return randomId()
  }
}
