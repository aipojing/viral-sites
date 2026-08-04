export type SeededSequence = () => number

/** mulberry32：从 uint32 seed 派生确定性 [0,1) 序列，跨引擎一致。 */
export function seededSequence(seed: number): SeededSequence {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickOne<T>(next: SeededSequence, pool: readonly T[]): T {
  if (pool.length === 0) throw new Error('pickOne: empty pool')
  return pool[Math.floor(next() * pool.length)]
}

/** 不重复抽取 n 个；不改动传入数组。 */
export function pickN<T>(next: SeededSequence, pool: readonly T[], n: number): T[] {
  if (n > pool.length) throw new Error(`pickN: need ${n} from pool of ${pool.length}`)
  const rest = [...pool]
  const out: T[] = []
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(next() * rest.length)
    out.push(rest[idx])
    rest.splice(idx, 1)
  }
  return out
}
