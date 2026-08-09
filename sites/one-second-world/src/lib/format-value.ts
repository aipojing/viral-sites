import type { WorldFact } from '../data/fact-types'
import { accumulatedValue, ratePerSecond } from './rate'

export type DisplayValue =
  | { kind: 'count'; text: string; raw: number }
  | { kind: 'waiting'; text: string; secondsRemaining: number }

const WAN = 10_000
const YI = 100_000_000
const WAN_YI = 1_000_000_000_000

/** 千分位分隔的定点数字，并删除末尾无意义 0（如 1.20 → 1.2、12.00 → 12） */
function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals)
  let [integer, fraction] = fixed.split('.')
  if (fraction) {
    fraction = fraction.replace(/0+$/, '')
  }
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction ? `${integer}.${fraction}` : integer
}

/**
 * 把累计值按个、万、亿、万亿选择中文单位展示。
 * 单位换算不改变 fact.decimals 指定的精度。
 */
function scaledParts(value: number): { scaled: number; unitPrefix: string } {
  if (value >= WAN_YI) return { scaled: value / WAN_YI, unitPrefix: '万亿' }
  if (value >= YI) return { scaled: value / YI, unitPrefix: '亿' }
  if (value >= WAN) return { scaled: value / WAN, unitPrefix: '万' }
  return { scaled: value, unitPrefix: '' }
}

/**
 * 展示规则：累计值 <1 时不显示分数个体，返回 waiting 与“平均还需 X 秒”；
 * 否则按中文单位格式化。无效输入一律按 0 秒处理，绝不输出 NaN/Infinity。
 */
export function formatFactValue(fact: WorldFact, elapsedMs: number): DisplayValue {
  const raw = accumulatedValue(fact, elapsedMs)
  const safeRaw = Number.isFinite(raw) ? Math.max(raw, 0) : 0
  const rate = ratePerSecond(fact)

  if (safeRaw < 1) {
    const secondsRemaining = Number.isFinite(rate) && rate > 0 ? Math.ceil((1 - safeRaw) / rate) : 0
    return { kind: 'waiting', text: `平均还需 ${formatNumber(secondsRemaining, 0)} 秒`, secondsRemaining }
  }

  const { scaled, unitPrefix } = scaledParts(safeRaw)
  return { kind: 'count', text: `${formatNumber(scaled, fact.decimals)}${unitPrefix} ${fact.outputUnit}`, raw: safeRaw }
}
