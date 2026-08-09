import type { WorldFact } from '../data/fact-types'

const DAY_SECONDS = 86_400

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * 把事实的统计周期折算成秒。
 * day=86400；month 取 referenceYear 该年平均月的秒数；year 使用该年实际天数
 * （平年 31,536,000 秒、闰年 31,622,400 秒）；custom-seconds 用显式 seconds。
 */
export function periodSeconds(period: WorldFact['period']): number {
  switch (period.unit) {
    case 'day':
      return DAY_SECONDS
    case 'month': {
      if (typeof period.referenceYear !== 'number' || !Number.isInteger(period.referenceYear)) {
        throw new Error('month 周期必须带整数 referenceYear')
      }
      return ((isLeapYear(period.referenceYear) ? 366 : 365) * DAY_SECONDS) / 12
    }
    case 'year': {
      if (typeof period.referenceYear !== 'number' || !Number.isInteger(period.referenceYear)) {
        throw new Error('year 周期必须带整数 referenceYear')
      }
      return (isLeapYear(period.referenceYear) ? 366 : 365) * DAY_SECONDS
    }
    case 'custom-seconds': {
      if (typeof period.seconds !== 'number' || !Number.isFinite(period.seconds) || period.seconds <= 0) {
        throw new Error('custom-seconds 周期必须带正的 seconds')
      }
      return period.seconds
    }
    default:
      throw new Error(`未知周期单位：${(period as { unit: string }).unit}`)
  }
}

/** 统计周期的中文口径描述，用于来源面板的换算式 */
export function periodLabel(period: WorldFact['period']): string {
  switch (period.unit) {
    case 'day':
      return '每天'
    case 'month':
      return `${period.referenceYear} 年月均`
    case 'year':
      return `${period.referenceYear} 年全年`
    case 'custom-seconds':
      return `每 ${period.seconds} 秒`
    default:
      return '统计周期'
  }
}

/** 每秒速率：始终从原始统计值复算，不单独保存 rate */
export function ratePerSecond(fact: WorldFact): number {
  return fact.value / periodSeconds(fact.period)
}

/** 把无效时长钳到 0：刷新归零，不接受负数或 NaN */
function safeElapsedMs(elapsedMs: number): number {
  return Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0
}

/** 有效停留 elapsedMs 内累计发生的量 */
export function accumulatedValue(fact: WorldFact, elapsedMs: number): number {
  return ratePerSecond(fact) * (safeElapsedMs(elapsedMs) / 1000)
}
