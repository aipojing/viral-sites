export type DeviceType = 'touch' | 'desktop'

export const MAX_HOLD_MS = 20 * 60_000
const MAX_BUCKET_SECONDS = MAX_HOLD_MS / 1000

const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000

/** 归日键固定使用北京时间（UTC+8），格式 YYYY-MM-DD */
export function dateKeyUTC8(epochMs: number): string {
  if (!Number.isFinite(epochMs)) throw new Error('invalid epoch ms')
  const shifted = new Date(epochMs + UTC8_OFFSET_MS)
  return shifted.toISOString().slice(0, 10)
}

/** 时长整秒桶，0..1200；负值与非法输入拒绝，超过 20 分钟封顶 */
export function durationBucket(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error('invalid duration')
  }
  const seconds = Math.floor(Math.min(durationMs, MAX_HOLD_MS) / 1000)
  return Math.min(seconds, MAX_BUCKET_SECONDS)
}
