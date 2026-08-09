/**
 * 报告年份只在这里解析一次：构建常量 VITE_REPORT_YEAR 优先，缺失或非法时用当前年。
 * 其余文案一律接收 year 参数，不硬编码年份。
 */
export function resolveReportYear(raw: string | undefined, now: Date = new Date()): number {
  const parsed = Number(raw)
  if (Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2200) return parsed
  return now.getFullYear()
}

export function currentReportYear(): number {
  return resolveReportYear(import.meta.env.VITE_REPORT_YEAR as string | undefined)
}
