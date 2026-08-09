// 本地时间工具：全部使用用户浏览器本地时区，不强制 UTC+8。

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

// HH:mm → 自午夜的分钟数。格式非法直接抛错，由上层校验捕获。
export function parseClock(value: string): number {
  const match = CLOCK_PATTERN.exec(value)
  if (!match) throw new Error(`时间格式非法：${value}`)
  return Number(match[1]) * 60 + Number(match[2])
}

// 本地日期 key（YYYY-MM-DD）。
export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(key: string): { year: number; monthIndex: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) throw new Error(`日期格式非法：${key}`)
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  }
}

// 某天本地时刻：dateKey + 自午夜分钟数。minutes 允许 >= 1440 表示次日凌晨。
export function clockOnDate(dateKey: string, minutes: number): Date {
  const { year, monthIndex, day } = parseDateKey(dateKey)
  return new Date(year, monthIndex, day, 0, minutes)
}

export function addDays(dateKey: string, delta: number): string {
  const { year, monthIndex, day } = parseDateKey(dateKey)
  return localDateKey(new Date(year, monthIndex, day + delta))
}

// 两个自然日之间相差的天数（b - a），按本地午夜对齐。
export function daysBetween(a: string, b: string): number {
  const da = parseDateKey(a)
  const db = parseDateKey(b)
  const ta = new Date(da.year, da.monthIndex, da.day).getTime()
  const tb = new Date(db.year, db.monthIndex, db.day).getTime()
  return Math.round((tb - ta) / 86_400_000)
}
