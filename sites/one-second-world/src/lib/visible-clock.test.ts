import { describe, expect, it } from 'vitest'
import { createVisibleClock, readElapsed, setClockVisible } from './visible-clock'

describe('visible-clock', () => {
  it('初始可见时从 0 开始累计', () => {
    const clock = createVisibleClock(1_000)
    expect(readElapsed(clock, 1_000)).toBe(0)
    expect(readElapsed(clock, 4_000)).toBe(3_000)
  })

  it('初始隐藏时不累计', () => {
    const clock = createVisibleClock(1_000, false)
    expect(readElapsed(clock, 9_000)).toBe(0)
  })

  it('隐藏时冻结，恢复后续算且不补跳后台时间', () => {
    let clock = createVisibleClock(0)
    // 看了 5 秒
    clock = setClockVisible(clock, false, 5_000)
    expect(readElapsed(clock, 5_000)).toBe(5_000)
    // 后台两小时，时间不增长
    expect(readElapsed(clock, 7_205_000)).toBe(5_000)
    // 恢复后再看 2 秒
    clock = setClockVisible(clock, true, 7_205_000)
    expect(readElapsed(clock, 7_207_000)).toBe(7_000)
  })

  it('重复的 visibility 事件幂等', () => {
    let clock = createVisibleClock(0)
    const once = setClockVisible(clock, true, 3_000)
    expect(once).toBe(clock) // 已经可见，返回原对象

    clock = setClockVisible(clock, false, 2_000)
    const twice = setClockVisible(clock, false, 9_000)
    expect(twice).toBe(clock) // 已经隐藏，不会重复累加
    expect(readElapsed(clock, 9_000)).toBe(2_000)
  })

  it('monotonic 时钟倒退时不产生负数', () => {
    let clock = createVisibleClock(10_000)
    clock = setClockVisible(clock, false, 9_000) // now 倒退
    expect(readElapsed(clock, 9_000)).toBe(0)

    const back = setClockVisible(clock, true, 8_000)
    expect(readElapsed(back, 7_000)).toBe(0)
  })

  it('setClockVisible 不原地修改旧状态', () => {
    const clock = createVisibleClock(0)
    const hidden = setClockVisible(clock, false, 4_000)
    expect(clock.accumulatedMs).toBe(0)
    expect(clock.visibleSince).toBe(0)
    expect(hidden.accumulatedMs).toBe(4_000)
    expect(hidden.visibleSince).toBeNull()
  })
})
