import type { SalarySettings } from './settings'

// 小时等值口径固定：月薪 ÷ (52/12 × 每周工作天数 × 每日带薪小时)。
// 税前/到手只作标签，不参与任何税务换算。
const WEEKS_PER_MONTH = 52 / 12

export function hourlyEquivalent(settings: SalarySettings): number {
  return settings.monthlySalary / (WEEKS_PER_MONTH * settings.workdays.length * settings.paidHoursPerDay)
}

export function dailyEquivalent(settings: SalarySettings): number {
  return hourlyEquivalent(settings) * settings.paidHoursPerDay
}

// 只负责两位小数展示，不参与后续计算。
export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '¥0.00'
  const fixed = Math.abs(value).toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = value < 0 ? '-' : ''
  return `${sign}¥${grouped}.${decPart}`
}

// 时长展示：X 小时 Y 分 / Y 分 Z 秒，用于小票与面板。
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours} 小时 ${minutes} 分`
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒`
  return `${seconds} 秒`
}
