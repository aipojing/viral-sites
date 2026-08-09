import { MANDARIN_RELATIONS } from '../data/mandarin-relations'
import { REGION_PACKS, type RegionPack } from '../data/region-packs'
import type { RelationEntry } from '../data/relation-types'

export interface ReverseMatch {
  entry: RelationEntry
  matchedLabel: string
  // 0=标准称呼完全匹配，1=常见别称，2=选中地域包的地域称呼
  rank: number
}

const MAX_INPUT_CODE_POINTS = 20

// 反查只做可解释的精确匹配：完全匹配标准 label → alias → 选中地域词，
// 不做拼音/模糊猜测。相同 rank 按路径短、entry id 排序。
export function reverseLookupWithPacks(
  raw: string,
  regionPackId?: string,
  packs: readonly RegionPack[] = REGION_PACKS,
  corpus: readonly RelationEntry[] = MANDARIN_RELATIONS,
): readonly ReverseMatch[] {
  const input = raw.trim().normalize('NFC')
  if (input === '') return []
  if ([...input].length > MAX_INPUT_CODE_POINTS) return []

  const pack = regionPackId ? packs.find((item) => item.id === regionPackId) : undefined
  const best = new Map<string, ReverseMatch>()

  const consider = (entry: RelationEntry, label: string, rank: number): void => {
    if (label !== input) return
    const existing = best.get(entry.id)
    if (!existing || rank < existing.rank) {
      best.set(entry.id, { entry, matchedLabel: label, rank })
    }
  }

  for (const entry of corpus) {
    for (const label of entry.labels) consider(entry, label, 0)
    for (const alias of entry.aliases) consider(entry, alias, 1)
  }
  if (pack) {
    const entryById = new Map(corpus.map((entry) => [entry.id, entry]))
    for (const regional of pack.entries) {
      const entry = entryById.get(regional.relationId)
      if (entry) consider(entry, regional.label, 2)
    }
  }

  return [...best.values()].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    const depthA = Math.min(...a.entry.paths.map((path) => path.length))
    const depthB = Math.min(...b.entry.paths.map((path) => path.length))
    if (depthA !== depthB) return depthA - depthB
    return a.entry.id.localeCompare(b.entry.id)
  })
}
