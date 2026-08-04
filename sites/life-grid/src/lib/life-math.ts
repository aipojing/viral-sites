export const WEEKS_PER_YEAR = 52
export const DEFAULT_EXPECTANCY = 78
export const PARENT_EXPECTANCY = 78
export const RETIREMENT_AGE = 60
export const WORKDAYS_PER_YEAR = 250
export const DEFAULT_MEETINGS_PER_YEAR = 2
export const MAX_AGE = 120

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function weeksLived(birth: Date, today: Date): number {
  return Math.floor((today.getTime() - birth.getTime()) / MS_PER_WEEK)
}

export function totalWeeks(expectancy: number): number {
  return expectancy * WEEKS_PER_YEAR
}

export function ageInYears(birth: Date, today: Date): number {
  const age = today.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  return beforeBirthday ? age - 1 : age
}

export function percentLived(birth: Date, today: Date, expectancy: number): number {
  const raw = (weeksLived(birth, today) / totalWeeks(expectancy)) * 100
  return Math.min(100, Math.round(raw * 10) / 10)
}

export type BirthValidation = { ok: true } | { ok: false; reason: 'future' | 'too-old' }

export function validateBirth(birth: Date, today: Date): BirthValidation {
  if (birth.getTime() > today.getTime()) return { ok: false, reason: 'future' }
  if (ageInYears(birth, today) > MAX_AGE) return { ok: false, reason: 'too-old' }
  return { ok: true }
}
