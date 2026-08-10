import { describe, expect, it } from 'vitest'
import type { FragmentResult } from './fragment'
import type { SalarySettings } from './settings'
import {
  STORAGE_KEY,
  clearSalaryData,
  loadSalaryData,
  pruneOldRecords,
  saveSalaryData,
  touchActiveDate,
  type SalaryLocalData,
} from './storage'

class FakeStorage implements Storage {
  private map = new Map<string, string>()
  throwOnSet = false

  get length(): number {
    return this.map.size
  }
  clear(): void {
    this.map.clear()
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new DOMException('QuotaExceededError')
    this.map.set(key, value)
  }
}

function settings(persistMode: 'session' | 'local' = 'local'): SalarySettings {
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
    persistMode,
    effectiveFrom: '2026-08-10',
  }
}

function data(overrides: Partial<SalaryLocalData> = {}): SalaryLocalData {
  return {
    version: 1,
    settings: settings(),
    fragments: [],
    firstVisitDate: '2026-08-03',
    activeDates: [],
    reportedReturnDays: [],
    ...overrides,
  }
}

function fragment(endedAtMs: number): FragmentResult {
  return {
    id: 'frag-1',
    scene: 'meeting',
    startedAtMs: endedAtMs - 3_600_000,
    rateAtStart: 86.5,
    paidIntervalsAtStart: [],
    settingsEffectiveFrom: '2026-08-10',
    endedAtMs,
    durationMs: 3_600_000,
    paidDurationMs: 3_600_000,
    equivalent: 86.5,
  }
}

describe('loadSalaryData / saveSalaryData', () => {
  it('按 persistMode 从对应容器读取', () => {
    const local = new FakeStorage()
    const session = new FakeStorage()
    saveSalaryData(data(), local, session)
    expect(local.getItem(STORAGE_KEY)).not.toBeNull()
    expect(session.getItem(STORAGE_KEY)).toBeNull()
    expect(loadSalaryData(local, session)?.settings.persistMode).toBe('local')

    const sessionOnly = data({ settings: settings('session') })
    saveSalaryData(sessionOnly, local, session)
    expect(session.getItem(STORAGE_KEY)).not.toBeNull()
    expect(loadSalaryData(local, session)?.settings.persistMode).toBe('session')
  })

  it('迁移保存方式时从旧容器删除数据', () => {
    const local = new FakeStorage()
    const session = new FakeStorage()
    saveSalaryData(data(), local, session) // 先 local
    saveSalaryData(data({ settings: settings('session') }), local, session) // 改为 session

    expect(local.getItem(STORAGE_KEY)).toBeNull()
    expect(session.getItem(STORAGE_KEY)).not.toBeNull()
    expect(loadSalaryData(local, session)?.settings.persistMode).toBe('session')
  })

  it('坏 JSON 与结构非法的数据视为不存在', () => {
    const local = new FakeStorage()
    local.setItem(STORAGE_KEY, '{oops')
    expect(loadSalaryData(local, new FakeStorage())).toBeNull()

    local.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }))
    expect(loadSalaryData(local, new FakeStorage())).toBeNull()
  })

  it('嵌套的设置、片段和日期缓存字段非法时视为不存在', () => {
    const local = new FakeStorage()
    const session = new FakeStorage()
    const invalidRecords: unknown[] = [
      data({ settings: { ...settings(), workdays: ['weekday'] } as unknown as SalarySettings }),
      data({
        fragments: [
          { ...fragment(new Date(2026, 7, 10, 11).getTime()), paidIntervalsAtStart: [{ startMs: 'bad', endMs: 2 }] },
        ] as unknown as readonly FragmentResult[],
      }),
      data({ activeDates: [123] as unknown as readonly string[] }),
      data({ reportedReturnDays: [1, '7'] as unknown as readonly number[] }),
    ]

    for (const invalid of invalidRecords) {
      local.setItem(STORAGE_KEY, JSON.stringify(invalid))
      expect(loadSalaryData(local, session)).toBeNull()
    }

    const historical = data({
      fragments: [fragment(new Date(2026, 7, 10, 11).getTime())],
      activeDates: ['2026-08-03', '2026-08-10'],
      reportedReturnDays: [1, 7],
    })
    local.setItem(STORAGE_KEY, JSON.stringify(historical))
    expect(loadSalaryData(local, session)).toEqual(historical)
  })

  it('存储写入异常返回 false 而不是抛出', () => {
    const local = new FakeStorage()
    local.throwOnSet = true
    expect(saveSalaryData(data(), local, new FakeStorage())).toBe(false)
  })

  it('片段保留开始时的费率快照字段', () => {
    const local = new FakeStorage()
    const saved = data({ fragments: [fragment(new Date(2026, 7, 10, 11).getTime())] })
    saveSalaryData(saved, local, new FakeStorage())
    const loaded = loadSalaryData(local, new FakeStorage())
    expect(loaded?.fragments[0].rateAtStart).toBe(86.5)
  })
})

describe('clearSalaryData', () => {
  it('同时清除两个容器', () => {
    const local = new FakeStorage()
    const session = new FakeStorage()
    local.setItem(STORAGE_KEY, JSON.stringify(data()))
    session.setItem(STORAGE_KEY, JSON.stringify(data()))
    clearSalaryData(local, session)
    expect(local.getItem(STORAGE_KEY)).toBeNull()
    expect(session.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('pruneOldRecords', () => {
  it('超过 31 个自然日的片段与活跃日被裁剪', () => {
    const now = new Date(2026, 7, 10)
    const old = fragment(new Date(2026, 6, 1).getTime()) // 40 天前
    const fresh = fragment(new Date(2026, 7, 9).getTime())
    const pruned = pruneOldRecords(
      data({ fragments: [old, fresh], activeDates: ['2026-06-01', '2026-08-09'] }),
      now,
    )
    expect(pruned.fragments).toEqual([fresh])
    expect(pruned.activeDates).toEqual(['2026-08-09'])
  })

  it('没有过期记录时返回原对象', () => {
    const now = new Date(2026, 7, 10)
    const original = data({ fragments: [fragment(new Date(2026, 7, 9).getTime())] })
    expect(pruneOldRecords(original, now)).toBe(original)
  })
})

describe('touchActiveDate', () => {
  it('登记今天的活跃日且不重复', () => {
    const now = new Date(2026, 7, 10)
    const once = touchActiveDate(data(), now)
    expect(once.activeDates).toEqual(['2026-08-10'])
    expect(touchActiveDate(once, now)).toBe(once)
  })
})
