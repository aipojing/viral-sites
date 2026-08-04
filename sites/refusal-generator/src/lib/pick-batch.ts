export const BATCH_SIZE = 3

export function pickBatch<T>(list: readonly T[], batchIndex: number): T[] {
  if (list.length === 0) return []
  const start = (batchIndex * BATCH_SIZE) % list.length
  const size = Math.min(BATCH_SIZE, list.length)
  const out: T[] = []
  for (let i = 0; i < size; i += 1) {
    out.push(list[(start + i) % list.length])
  }
  return out
}
