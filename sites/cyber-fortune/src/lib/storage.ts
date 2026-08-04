import type { StreakState } from './streak'

const STREAK_KEY = 'cf.streak'
const NICKNAME_KEY = 'cf.nickname'
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

export function loadStreak(): StreakState | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { lastDate, count } = parsed as { lastDate?: unknown; count?: unknown }
    if (typeof lastDate !== 'string' || !DATE_KEY_RE.test(lastDate)) return null
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return null
    return { lastDate, count }
  } catch {
    return null
  }
}

export function saveStreak(state: StreakState): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(state))
  } catch {
    // 隐私模式/配额满：静默
  }
}

export function loadNickname(): string | null {
  try {
    return localStorage.getItem(NICKNAME_KEY)
  } catch {
    return null
  }
}

export function saveNickname(nickname: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname)
  } catch {
    // 静默
  }
}
