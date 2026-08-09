/**
 * 按住不放的计时事实全部来自调用方传入的 monotonic 时钟（performance.now()），
 * 状态机本身不读系统时钟；shownMs 只用于显示，最终时长只由 startedAt 与结束时刻推导。
 */

export const PREPARATION_MS = 3_000
export const MAX_HOLD_MS = 20 * 60_000

export type FinishReason = 'released' | 'cancelled' | 'hidden' | 'blurred' | 'limit'

export type HoldState =
  | { phase: 'idle' }
  | { phase: 'preparing'; countdownStartedAt: number }
  | { phase: 'holding'; startedAt: number; shownMs: number }
  | { phase: 'finished'; durationMs: number; reason: FinishReason }

export function startPreparation(now: number): HoldState {
  return { phase: 'preparing', countdownStartedAt: now }
}

export function beginHolding(now: number): HoldState {
  return { phase: 'holding', startedAt: now, shownMs: 0 }
}

export function tickHold(state: HoldState, now: number): HoldState {
  if (state.phase !== 'holding') return state
  const elapsed = now - state.startedAt
  if (elapsed >= MAX_HOLD_MS) {
    return { phase: 'finished', durationMs: MAX_HOLD_MS, reason: 'limit' }
  }
  return { ...state, shownMs: Math.max(0, elapsed) }
}

export function finishHold(state: HoldState, now: number, reason: FinishReason): HoldState {
  if (state.phase !== 'holding') return state
  return { phase: 'finished', durationMs: Math.min(Math.max(0, now - state.startedAt), MAX_HOLD_MS), reason }
}
