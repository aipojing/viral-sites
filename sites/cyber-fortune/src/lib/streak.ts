import { dateKeyUTC8, yesterdayKeyUTC8 } from './date-utils'

export interface StreakState {
  lastDate: string
  count: number
}

export interface StreakAdvance {
  state: StreakState
  isRepeat: boolean
}

export const DEVOUT_STREAK = 7

export function advanceStreak(prev: StreakState | null, now: Date): StreakAdvance {
  const todayKey = dateKeyUTC8(now)
  if (prev && prev.lastDate === todayKey) {
    return { state: prev, isRepeat: true }
  }
  if (prev && prev.lastDate === yesterdayKeyUTC8(now)) {
    return { state: { lastDate: todayKey, count: prev.count + 1 }, isRepeat: false }
  }
  return { state: { lastDate: todayKey, count: 1 }, isRepeat: false }
}
