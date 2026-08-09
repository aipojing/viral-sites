import { describe, expect, it } from 'vitest'
import {
  MAX_HOLD_MS,
  PREPARATION_MS,
  beginHolding,
  finishHold,
  startPreparation,
  tickHold,
  type HoldState,
} from './timer-machine'

describe('timer-machine', () => {
  it('startPreparation：记录 3 秒准备起点', () => {
    const state = startPreparation(1_000)
    expect(state).toEqual({ phase: 'preparing', countdownStartedAt: 1_000 })
    expect(PREPARATION_MS).toBe(3_000)
  })

  it('beginHolding：从任意状态进入 holding，shownMs 归零', () => {
    const state = beginHolding(4_500)
    expect(state).toEqual({ phase: 'holding', startedAt: 4_500, shownMs: 0 })
  })

  it('tickHold：只更新 shownMs，不改变 startedAt', () => {
    const holding = beginHolding(4_500)
    const ticked = tickHold(holding, 5_200)
    expect(ticked).toEqual({ phase: 'holding', startedAt: 4_500, shownMs: 700 })
  })

  it('tickHold：rAF 掉帧不影响最终时长，最终值只由 startedAt 与结束时刻决定', () => {
    let state: HoldState = beginHolding(10_000)
    // 模拟掉帧：tick 序列稀疏且间隔不均
    for (const now of [10_016, 10_800, 12_345, 18_000]) {
      state = tickHold(state, now)
    }
    const finished = finishHold(state, 23_333, 'released')
    expect(finished).toEqual({ phase: 'finished', durationMs: 13_333, reason: 'released' })
  })

  it('finishHold：所有中断原因都能结束 holding', () => {
    const holding = beginHolding(0)
    for (const reason of ['released', 'cancelled', 'hidden', 'blurred'] as const) {
      const finished = finishHold(tickHold(holding, 9_999), 9_999, reason)
      expect(finished).toEqual({ phase: 'finished', durationMs: 9_999, reason })
    }
  })

  it('finishHold：非 holding 状态不转换，重复 finish 幂等', () => {
    const idle: HoldState = { phase: 'idle' }
    expect(finishHold(idle, 5_000, 'released')).toEqual(idle)

    const preparing = startPreparation(0)
    expect(finishHold(preparing, 5_000, 'released')).toEqual(preparing)

    const finished: HoldState = { phase: 'finished', durationMs: 7_777, reason: 'released' }
    expect(finishHold(finished, 99_999, 'hidden')).toEqual(finished)
  })

  it('tickHold 与 finishHold：20 分钟封顶', () => {
    expect(MAX_HOLD_MS).toBe(20 * 60_000)
    const holding = beginHolding(0)
    // 达到上限时 tickHold 直接以 limit 结束
    expect(tickHold(holding, MAX_HOLD_MS + 500)).toEqual({
      phase: 'finished',
      durationMs: MAX_HOLD_MS,
      reason: 'limit',
    })
    // finish 晚于上限时刻也只计上限
    expect(finishHold(holding, MAX_HOLD_MS + 60_000, 'released')).toEqual({
      phase: 'finished',
      durationMs: MAX_HOLD_MS,
      reason: 'released',
    })
  })

  it('tickHold：idle/preparing/finished 原样返回', () => {
    const idle: HoldState = { phase: 'idle' }
    expect(tickHold(idle, 1_000)).toEqual(idle)
    const preparing = startPreparation(0)
    expect(tickHold(preparing, 1_000)).toEqual(preparing)
    const finished: HoldState = { phase: 'finished', durationMs: 1_000, reason: 'released' }
    expect(tickHold(finished, 2_000)).toEqual(finished)
  })

  it('纯函数：同样的 monotonic 输入得到同样结果，不依赖系统时钟', () => {
    const a = finishHold(tickHold(beginHolding(123_456), 130_000), 133_456, 'released')
    const b = finishHold(tickHold(beginHolding(123_456), 129_000), 133_456, 'released')
    expect(a).toEqual(b)
    expect(a).toEqual({ phase: 'finished', durationMs: 10_000, reason: 'released' })
  })
})
