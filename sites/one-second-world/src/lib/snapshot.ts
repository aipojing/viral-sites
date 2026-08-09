import type { WorldFact } from '../data/fact-types'
import type { DisplayValue } from './format-value'
import { accumulatedValue } from './rate'

/** 快照中的一条事实：冻结时刻的展示值随事实一起定住 */
export interface SnapshotItem {
  fact: WorldFact
  display: DisplayValue
}

/** 快照候选是否还处于“平均还需 X 秒”的等待状态 */
function isWaiting(fact: WorldFact, elapsedMs: number): boolean {
  return accumulatedValue(fact, elapsedMs) < 1
}

/**
 * 候选排序键：waiting 排后面 → snapshotPriority 降序 → id 升序。
 * 同一时刻同一输入必须产出同一结果，不带任何随机。
 */
function rankCandidates(candidates: readonly WorldFact[], elapsedMs: number): WorldFact[] {
  return [...candidates].sort((a, b) => {
    const aWaiting = isWaiting(a, elapsedMs) ? 1 : 0
    const bWaiting = isWaiting(b, elapsedMs) ? 1 : 0
    if (aWaiting !== bWaiting) return aWaiting - bWaiting
    if (a.snapshotPriority !== b.snapshotPriority) return b.snapshotPriority - a.snapshotPriority
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

/**
 * 默认三条快照事实：只选 A 级，优先 count 而非 waiting，
 * 依次选择尚未出现的章节，第三条在章节不足时才允许重复章节。
 */
export function selectSnapshotFacts(
  facts: readonly WorldFact[],
  elapsedMs: number,
): readonly [WorldFact, WorldFact, WorldFact] {
  const ranked = rankCandidates(
    facts.filter((fact) => fact.source.confidence === 'A'),
    elapsedMs,
  )
  if (ranked.length < 3) {
    throw new Error(`A 级事实不足三条，无法生成快照（当前 ${ranked.length} 条）`)
  }

  const picked: WorldFact[] = []
  const usedChapters = new Set<WorldFact['chapter']>()
  for (const fact of ranked) {
    if (picked.length === 3) break
    if (usedChapters.has(fact.chapter)) continue
    picked.push(fact)
    usedChapters.add(fact.chapter)
  }
  // 章节不够三个时，才允许重复章节补足
  for (const fact of ranked) {
    if (picked.length === 3) break
    if (picked.some((item) => item.id === fact.id)) continue
    picked.push(fact)
  }
  return [picked[0], picked[1], picked[2]]
}

/**
 * 替换快照某一条事实：不得与现有事实重复 id，
 * 替换后至少保留两个不同章节；违规直接抛错，调用方负责兜底提示。
 */
export function replaceSnapshotFact(
  current: readonly WorldFact[],
  slot: number,
  replacement: WorldFact,
): readonly WorldFact[] {
  if (!Number.isInteger(slot) || slot < 0 || slot >= current.length) {
    throw new RangeError(`快照槽位越界：${slot}`)
  }
  if (current.some((fact) => fact.id === replacement.id)) {
    throw new Error('快照中已经包含这条事实')
  }
  const next = [...current]
  next[slot] = replacement
  const chapters = new Set(next.map((fact) => fact.chapter))
  if (chapters.size < 2) {
    throw new Error('快照至少要覆盖两个不同章节')
  }
  return next
}
