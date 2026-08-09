/** 时长展示：<1 分钟用秒（一位小数），≥1 分钟用「M 分 SS 秒」 */
export function formatDuration(durationMs: number): string {
  const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} 秒`
  const totalSeconds = Math.floor(ms / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes} 分 ${String(seconds).padStart(2, '0')} 秒`
}
