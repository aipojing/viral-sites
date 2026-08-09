/** 预定义前台停留时长桶：埋点只传桶，不上传精确秒数或滚动轨迹 */
export type DurationBucket = 'lt15' | '15_44' | '45_119' | 'gte120'

export function durationBucket(elapsedMs: number): DurationBucket {
  const seconds = elapsedMs / 1000
  if (seconds < 15) return 'lt15'
  if (seconds < 45) return '15_44'
  if (seconds < 120) return '45_119'
  return 'gte120'
}
