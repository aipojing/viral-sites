import { parseClock } from './time-local'

export type SalaryBasis = 'gross' | 'net'
export type PersistMode = 'session' | 'local'
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface SalarySettings {
  version: 1
  monthlySalary: number
  salaryBasis: SalaryBasis
  workdays: readonly Weekday[]
  paidHoursPerDay: number
  shiftStart: string
  shiftEnd: string
  lunchStart?: string
  lunchEnd?: string
  lunchPaid: boolean
  persistMode: PersistMode
  effectiveFrom: string
}

// 月薪上限仅用于防输入错误，不做税务推算。
export const MAX_MONTHLY_SALARY = 10_000_000

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function assertFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label}必须是有限数字`)
  }
  return value
}

function assertClock(value: string, label: string): string {
  if (!CLOCK_PATTERN.test(value)) throw new Error(`${label}必须是 HH:mm 格式`)
  return value
}

function parseWeekdays(raw: unknown): readonly Weekday[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 7) {
    throw new Error('每周工作天数必须在 1 到 7 天之间')
  }
  const seen = new Set<number>()
  for (const day of raw) {
    if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error('工作日只能是 0（周日）到 6（周六）')
    }
    if (seen.has(day)) throw new Error('工作日不能重复')
    seen.add(day)
  }
  return raw as readonly Weekday[]
}

// 带薪小时与「班次区间减去不带薪午休」相差不得超过 15 分钟，
// 防止设置自相矛盾导致金额口径漂移。
const PAID_HOURS_TOLERANCE_MINUTES = 15

function assertPaidHoursConsistent(settings: {
  paidHoursPerDay: number
  shiftStart: string
  shiftEnd: string
  lunchStart?: string
  lunchEnd?: string
  lunchPaid: boolean
}): void {
  const shiftMinutes = shiftDurationMinutes(settings.shiftStart, settings.shiftEnd)
  let lunchMinutes = 0
  if (settings.lunchStart && settings.lunchEnd && !settings.lunchPaid) {
    lunchMinutes = shiftDurationMinutes(settings.lunchStart, settings.lunchEnd)
  }
  const impliedMinutes = shiftMinutes - lunchMinutes
  const diffMinutes = Math.abs(settings.paidHoursPerDay * 60 - impliedMinutes)
  if (diffMinutes > PAID_HOURS_TOLERANCE_MINUTES) {
    throw new Error('每日带薪小时与班次区间相差超过 15 分钟，请检查设置')
  }
}

export function shiftDurationMinutes(start: string, end: string): number {
  const startMin = parseClock(start)
  let endMin = parseClock(end)
  if (endMin <= startMin) endMin += 24 * 60 // 跨午夜班次
  return endMin - startMin
}

export function validateSettings(raw: unknown): SalarySettings {
  if (typeof raw !== 'object' || raw === null) throw new Error('设置不能为空')
  const record = raw as Record<string, unknown>

  const monthlySalary = assertFiniteNumber(record.monthlySalary, '月薪')
  if (monthlySalary <= 0) throw new Error('月薪必须大于 0')
  if (monthlySalary > MAX_MONTHLY_SALARY) throw new Error('月薪超出上限，请检查输入')

  const salaryBasis = record.salaryBasis
  if (salaryBasis !== 'gross' && salaryBasis !== 'net') {
    throw new Error('工资口径只能是税前或到手')
  }

  const workdays = parseWeekdays(record.workdays)

  const paidHoursPerDay = assertFiniteNumber(record.paidHoursPerDay, '每日带薪小时')
  if (paidHoursPerDay < 0.5 || paidHoursPerDay > 24) {
    throw new Error('每日带薪小时必须在 0.5 到 24 之间')
  }

  if (typeof record.shiftStart !== 'string') throw new Error('上班时间缺失')
  if (typeof record.shiftEnd !== 'string') throw new Error('下班时间缺失')
  const shiftStart = assertClock(record.shiftStart, '上班时间')
  const shiftEnd = assertClock(record.shiftEnd, '下班时间')

  let lunchStart: string | undefined
  let lunchEnd: string | undefined
  if (record.lunchStart !== undefined || record.lunchEnd !== undefined) {
    if (typeof record.lunchStart !== 'string' || typeof record.lunchEnd !== 'string') {
      throw new Error('午休开始与结束必须成对填写')
    }
    lunchStart = assertClock(record.lunchStart, '午休开始')
    lunchEnd = assertClock(record.lunchEnd, '午休结束')
    if (shiftDurationMinutes(lunchStart, lunchEnd) <= 0) {
      throw new Error('午休结束必须晚于午休开始')
    }
    // 午休必须完整落入班次区间（按同日分钟轴比较，跨午夜班次不设午休）
    const shiftStartMin = parseClock(shiftStart)
    const shiftEndMin = parseClock(shiftEnd)
    const lunchStartMin = parseClock(lunchStart)
    const lunchEndMin = parseClock(lunchEnd)
    const sameDayShift = shiftEndMin > shiftStartMin
    const insideShift = lunchStartMin >= shiftStartMin && lunchEndMin <= shiftEndMin
    if (!sameDayShift || !insideShift) {
      throw new Error('午休必须完整落在上班时间之内')
    }
  }

  if (typeof record.lunchPaid !== 'boolean') throw new Error('必须选择午休是否带薪')

  const persistMode = record.persistMode
  if (persistMode !== 'session' && persistMode !== 'local') {
    throw new Error('必须选择保存方式')
  }

  if (typeof record.effectiveFrom !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.effectiveFrom)) {
    throw new Error('设置生效日期必须是 YYYY-MM-DD')
  }

  const settings: SalarySettings = {
    version: 1,
    monthlySalary,
    salaryBasis,
    workdays,
    paidHoursPerDay,
    shiftStart,
    shiftEnd,
    ...(lunchStart && lunchEnd ? { lunchStart, lunchEnd } : {}),
    lunchPaid: record.lunchPaid,
    persistMode,
    effectiveFrom: record.effectiveFrom,
  }

  assertPaidHoursConsistent(settings)
  return settings
}
