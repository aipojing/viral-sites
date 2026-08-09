/**
 * 前台有效时间时钟（纯函数）。
 * 只累计视口可见时间：隐藏时冻结、恢复后续算、后台绝不补跳，刷新归零。
 */
export interface VisibleClockState {
  /** 已经累计的有效毫秒数 */
  accumulatedMs: number
  /** 当前可见段起点（performance 时钟）；隐藏中为 null */
  visibleSince: number | null
}

export function createVisibleClock(now: number, visible = true): VisibleClockState {
  return { accumulatedMs: 0, visibleSince: visible ? now : null }
}

/**
 * 切换可见性。所有返回都是新对象；重复事件幂等；
 * monotonic 时钟倒退时用 0 兜底，绝不产生负数。
 */
export function setClockVisible(state: VisibleClockState, visible: boolean, now: number): VisibleClockState {
  if (visible) {
    if (state.visibleSince !== null) return state
    return { ...state, visibleSince: now }
  }
  if (state.visibleSince === null) return state
  const segment = Math.max(0, now - state.visibleSince)
  return { accumulatedMs: state.accumulatedMs + segment, visibleSince: null }
}

/** 读取截至 now 的有效停留毫秒数 */
export function readElapsed(state: VisibleClockState, now: number): number {
  const ongoing = state.visibleSince === null ? 0 : Math.max(0, now - state.visibleSince)
  return state.accumulatedMs + ongoing
}
