import {
  ageInYears,
  totalWeeks,
  weeksLived,
  WEEKS_PER_YEAR,
  DEFAULT_EXPECTANCY,
  type LifeInput,
} from './life-math'

export const HOURS_PER_WEEK = 168
const HOURS_PER_YEAR = HOURS_PER_WEEK * WEEKS_PER_YEAR

export interface HabitInput {
  sleepHoursPerDay: number
  workHoursPerWeek: number
  /** 每个工作日的往返通勤合计（小时） */
  commuteHoursPerWorkday: number
  workdaysPerWeek: number
  necessaryHoursPerWeek: number
  screenHoursPerDay?: number
  retirementAge: number
}

export type LedgerCategory = 'sleep' | 'work' | 'commute' | 'necessary' | 'free'

export interface TimeLedgerResult {
  weekly: Record<LedgerCategory, number>
  remainingWeeks: number
  workingWeeks: number
  remainingYears: Record<LedgerCategory, number>
  /** 注意力旁账：可能与互斥账本各项重叠，不参与自由时间扣减；未填屏幕时间为 null */
  screenYears: number | null
}

export type HabitValidation =
  | { ok: true }
  | { ok: false; field: keyof HabitInput | 'weeklyTotal'; reason: string }

/** 常见值，可修改；仅用于降低首轮输入门槛 */
export const DEFAULT_HABITS: HabitInput = {
  sleepHoursPerDay: 7.5,
  workHoursPerWeek: 40,
  commuteHoursPerWorkday: 1.5,
  workdaysPerWeek: 5,
  necessaryHoursPerWeek: 14,
  screenHoursPerDay: 6,
  retirementAge: 60,
}

const RANGE: Array<{ field: keyof HabitInput; min: number; max: number; label: string }> = [
  { field: 'sleepHoursPerDay', min: 0, max: 24, label: '平均每天睡眠' },
  { field: 'workHoursPerWeek', min: 0, max: 112, label: '每周工作/上课' },
  { field: 'commuteHoursPerWorkday', min: 0, max: 8, label: '每日往返通勤' },
  { field: 'workdaysPerWeek', min: 0, max: 7, label: '每周工作日' },
  { field: 'necessaryHoursPerWeek', min: 0, max: 112, label: '家务与必要事务' },
]

export function validateHabits(input: HabitInput, currentAge?: number): HabitValidation {
  for (const { field, min, max, label } of RANGE) {
    const value = input[field] as number
    if (!Number.isFinite(value) || value < min || value > max) {
      return { ok: false, field, reason: `${label}需要在 ${min}～${max} 小时之间` }
    }
  }
  const screen = input.screenHoursPerDay
  if (screen !== undefined && (!Number.isFinite(screen) || screen < 0 || screen > 24)) {
    return { ok: false, field: 'screenHoursPerDay', reason: '屏幕时间需要在 0～24 小时之间' }
  }
  const retirement = input.retirementAge
  const minRetirement = currentAge ?? 0
  if (!Number.isFinite(retirement) || retirement < minRetirement || retirement > 100) {
    return {
      ok: false,
      field: 'retirementAge',
      reason: `退休年龄需要在 ${minRetirement}～100 岁之间`,
    }
  }
  const fixed =
    input.sleepHoursPerDay * 7 +
    input.workHoursPerWeek +
    input.commuteHoursPerWorkday * input.workdaysPerWeek +
    input.necessaryHoursPerWeek
  if (fixed > HOURS_PER_WEEK) {
    return {
      ok: false,
      field: 'weeklyTotal',
      reason: `固定事项合计 ${formatHours(fixed)} 小时，超过了一周的 ${HOURS_PER_WEEK} 小时，请检查输入`,
    }
  }
  return { ok: true }
}

export function computeTimeLedger(life: LifeInput, habits: HabitInput): TimeLedgerResult {
  const expectancy = life.expectancy ?? DEFAULT_EXPECTANCY
  const weekly = {
    sleep: habits.sleepHoursPerDay * 7,
    work: habits.workHoursPerWeek,
    commute: habits.commuteHoursPerWorkday * habits.workdaysPerWeek,
    necessary: habits.necessaryHoursPerWeek,
    free: 0,
  }
  weekly.free = HOURS_PER_WEEK - weekly.sleep - weekly.work - weekly.commute - weekly.necessary

  const remainingWeeks = Math.max(
    0,
    totalWeeks(expectancy) - weeksLived(life.birth, life.today),
  )
  const workingWeeks = Math.min(
    remainingWeeks,
    Math.max(0, (habits.retirementAge - ageInYears(life.birth, life.today)) * WEEKS_PER_YEAR),
  )

  const toYears = (hours: number) => hours / HOURS_PER_YEAR
  const sleepHours = weekly.sleep * remainingWeeks
  const workHours = weekly.work * workingWeeks
  const commuteHours = weekly.commute * workingWeeks
  const necessaryHours = weekly.necessary * remainingWeeks
  const freeHours = remainingWeeks * HOURS_PER_WEEK - sleepHours - workHours - commuteHours - necessaryHours

  const screenHoursPerWeek =
    habits.screenHoursPerDay === undefined ? null : habits.screenHoursPerDay * 7

  return {
    weekly,
    remainingWeeks,
    workingWeeks,
    remainingYears: {
      sleep: toYears(sleepHours),
      work: toYears(workHours),
      commute: toYears(commuteHours),
      necessary: toYears(necessaryHours),
      free: toYears(freeHours),
    },
    screenYears:
      screenHoursPerWeek === null ? null : toYears(screenHoursPerWeek * remainingWeeks),
  }
}

/** 展示用：保留一位小数，内部计算保持浮点精度 */
export function roundDisplayYears(years: number): number {
  return Math.round(years * 10) / 10
}

export function sameHabits(a: HabitInput, b: HabitInput): boolean {
  return (
    a.sleepHoursPerDay === b.sleepHoursPerDay &&
    a.workHoursPerWeek === b.workHoursPerWeek &&
    a.commuteHoursPerWorkday === b.commuteHoursPerWorkday &&
    a.workdaysPerWeek === b.workdaysPerWeek &&
    a.necessaryHoursPerWeek === b.necessaryHoursPerWeek &&
    a.screenHoursPerDay === b.screenHoursPerDay &&
    a.retirementAge === b.retirementAge
  )
}

export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 10) / 10)
}
