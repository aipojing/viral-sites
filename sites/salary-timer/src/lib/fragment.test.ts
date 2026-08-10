import { describe, expect, it } from 'vitest'
import { durationBucket, finishFragment, normalizeCustomLabel, paidDurationsByScene, sceneLabel, startFragment } from './fragment'
import { hourlyEquivalent } from './pay-math'
import type { SalarySettings } from './settings'

const HOUR = 3_600_000

// 2026-08-10 周一。
function settings(overrides: Partial<SalarySettings> = {}): SalarySettings {
  return {
    version: 1,
    monthlySalary: 15_000,
    salaryBasis: 'net',
    workdays: [1, 2, 3, 4, 5],
    paidHoursPerDay: 8,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    lunchPaid: false,
    persistMode: 'local',
    effectiveFrom: '2026-08-10',
    ...overrides,
  }
}

describe('startFragment', () => {
  it('快照开始时的费率与带薪区间', () => {
    const s = settings()
    const active = startFragment('meeting', new Date(2026, 7, 10, 10), s)
    expect(active.scene).toBe('meeting')
    expect(active.rateAtStart).toBe(hourlyEquivalent(s))
    expect(active.paidIntervalsAtStart).toHaveLength(2)
    expect(active.settingsEffectiveFrom).toBe('2026-08-10')
    expect(active.id).not.toBe('')
  })

  it('每次开始生成不同 id', () => {
    const s = settings()
    const a = startFragment('idle', new Date(2026, 7, 10, 10), s)
    const b = startFragment('idle', new Date(2026, 7, 10, 10), s)
    expect(a.id).not.toBe(b.id)
  })

  it('custom 场景必须有名字，并做 NFC 归一与 12 code points 截断', () => {
    expect(() => startFragment('custom', new Date(2026, 7, 10, 10), settings())).toThrow()
    expect(() => startFragment('custom', new Date(2026, 7, 10, 10), settings(), '   ')).toThrow()

    const long = startFragment('custom', new Date(2026, 7, 10, 10), settings(), '这是一个非常长的自定义场景名字超过十二个字')
    expect(Array.from(long.customLabel!).length).toBe(12)

    // e + 组合重音符（NFD 两个 code point）归一为 1 个 code point
    const nfd = 'e\u0301'.repeat(20)
    const composed = startFragment('custom', new Date(2026, 7, 10, 10), settings(), nfd)
    expect(Array.from(composed.customLabel!).length).toBe(12)
    expect(composed.customLabel).toBe('\u00e9'.repeat(12))
  })

  it('内置场景不带 customLabel', () => {
    const active = startFragment('toilet', new Date(2026, 7, 10, 10), settings())
    expect(active.customLabel).toBeUndefined()
  })
})

describe('normalizeCustomLabel', () => {
  it('按 Unicode code point 截断，emoji 计 1', () => {
    const label = normalizeCustomLabel('带薪摸鱼🐟日记超过十二个字符长度')
    expect(Array.from(label).length).toBe(12)
    expect(label).toContain('🐟')
  })
})

describe('finishFragment', () => {
  it('工作时段内：时长与带薪时长一致', () => {
    const s = settings()
    const active = startFragment('meeting', new Date(2026, 7, 10, 10), s)
    const result = finishFragment(active, new Date(2026, 7, 10, 11))
    expect(result.durationMs).toBe(HOUR)
    expect(result.paidDurationMs).toBe(HOUR)
    expect(result.equivalent).toBeCloseTo(s.monthlySalary / ((52 / 12) * 5 * 8), 8)
  })

  it('跨午休：只计带薪交集，duration 与 paidDuration 分开', () => {
    const active = startFragment('meeting', new Date(2026, 7, 10, 11), settings())
    const result = finishFragment(active, new Date(2026, 7, 10, 14))
    expect(result.durationMs).toBe(3 * HOUR)
    expect(result.paidDurationMs).toBe(2 * HOUR) // 11-12 + 13-14
    expect(result.equivalent).toBeCloseTo((2 * hourlyEquivalent(settings())) / 1, 8)
  })

  it('跨下班：带薪部分截断在下班时刻', () => {
    const active = startFragment('queue', new Date(2026, 7, 10, 17, 30), settings())
    const result = finishFragment(active, new Date(2026, 7, 10, 19))
    expect(result.durationMs).toBe(1.5 * HOUR)
    expect(result.paidDurationMs).toBe(0.5 * HOUR)
  })

  it('下班后的片段：带薪时长为 0，等值为 0', () => {
    const active = startFragment('idle', new Date(2026, 7, 10, 19), settings())
    const result = finishFragment(active, new Date(2026, 7, 10, 20))
    expect(result.durationMs).toBe(HOUR)
    expect(result.paidDurationMs).toBe(0)
    expect(result.equivalent).toBe(0)
  })

  it('跨午夜班次：凌晨段仍计入前一天的带薪区间', () => {
    const night = settings({
      shiftStart: '22:00',
      shiftEnd: '06:00',
      lunchStart: undefined,
      lunchEnd: undefined,
    })
    const active = startFragment('meeting', new Date(2026, 7, 10, 23), night)
    const result = finishFragment(active, new Date(2026, 7, 11, 1))
    expect(result.paidDurationMs).toBe(2 * HOUR)
  })

  it('跨午夜班次：凌晨才开始的片段快照前一天班次区间', () => {
    const night = settings({
      shiftStart: '22:00',
      shiftEnd: '06:00',
      lunchStart: undefined,
      lunchEnd: undefined,
    })
    const active = startFragment('meeting', new Date(2026, 7, 11, 2), night)
    const result = finishFragment(active, new Date(2026, 7, 11, 3))
    expect(result.paidDurationMs).toBe(HOUR)
  })

  it('结束早于开始直接拒绝', () => {
    const active = startFragment('idle', new Date(2026, 7, 10, 10), settings())
    expect(() => finishFragment(active, new Date(2026, 7, 10, 9))).toThrow()
  })

  it('费率与区间来自开始时的快照：修改设置不重算历史', () => {
    const s = settings()
    const active = startFragment('meeting', new Date(2026, 7, 10, 10), s)
    // 用户之后把月薪翻倍
    const doubled = { ...s, monthlySalary: s.monthlySalary * 2 }
    const result = finishFragment(active, new Date(2026, 7, 10, 11))
    expect(result.rateAtStart).toBe(hourlyEquivalent(s))
    expect(result.rateAtStart).not.toBe(hourlyEquivalent(doubled))
  })

  it('结果是新的不可变对象，不改动进行中的片段', () => {
    const active = startFragment('meeting', new Date(2026, 7, 10, 10), settings())
    const result = finishFragment(active, new Date(2026, 7, 10, 11))
    expect(result).not.toBe(active)
    expect(active).not.toHaveProperty('endedAtMs')
  })
})

describe('sceneLabel', () => {
  it('内置场景用固定文案，自定义优先用户标签', () => {
    expect(sceneLabel({ scene: 'meeting' })).toBe('开会')
    expect(sceneLabel({ scene: 'custom', customLabel: '等外卖' })).toBe('等外卖')
    expect(sceneLabel({ scene: 'custom' })).toBe('自定义')
  })
})

describe('paidDurationsByScene', () => {
  function finished(scene: 'meeting' | 'custom', endedAt: Date, paidMs: number) {
    return finishFragment(
      {
        ...startFragment(scene, new Date(endedAt.getTime() - paidMs), settings(), scene === 'custom' ? '等外卖' : undefined),
      },
      endedAt,
    )
  }

  it('按场景汇总指定日期的带薪时长', () => {
    const fragments = [
      { ...finished('meeting', new Date(2026, 7, 10, 10, 10), 600_000), paidDurationMs: 600_000 },
      { ...finished('meeting', new Date(2026, 7, 10, 11, 5), 300_000), paidDurationMs: 300_000 },
      { ...finished('custom', new Date(2026, 7, 10, 14, 2), 120_000), paidDurationMs: 120_000 },
    ]
    const totals = paidDurationsByScene(fragments, '2026-08-10')
    expect(totals.meeting).toBe(900_000)
    expect(totals.custom).toBe(120_000)
    expect(totals.toilet).toBe(0)
  })

  it('其他日期的片段不计入', () => {
    const fragments = [finished('meeting', new Date(2026, 7, 9, 17), 600_000)]
    expect(paidDurationsByScene(fragments, '2026-08-10').meeting).toBe(0)
  })
})

describe('durationBucket', () => {
  it('按边界划分时长桶，只输出枚举', () => {
    expect(durationBucket(30_000)).toBe('lt1m')
    expect(durationBucket(60_000)).toBe('1to5m')
    expect(durationBucket(5 * 60_000 - 1)).toBe('1to5m')
    expect(durationBucket(5 * 60_000)).toBe('5to15m')
    expect(durationBucket(15 * 60_000)).toBe('15to30m')
    expect(durationBucket(30 * 60_000)).toBe('gt30m')
    expect(durationBucket(3 * HOUR)).toBe('gt30m')
  })
})
