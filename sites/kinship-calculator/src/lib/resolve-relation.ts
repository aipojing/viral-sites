import { MANDARIN_RELATIONS } from '../data/mandarin-relations'
import { REGION_PACKS, type RegionPack, type RegionalLabel } from '../data/region-packs'
import type { Confidence, RelationEntry, RelationToken, SubjectGender } from '../data/relation-types'
import { MAX_RELATION_DEPTH, pathKey } from './path'

export interface RelationQuery {
  path: readonly RelationToken[]
  subjectGender: SubjectGender
  regionPackId?: string
}

export interface ResolvedRelation {
  entry: RelationEntry
  regionalLabels: readonly RegionalLabel[]
}

export type RelationResolution =
  | { status: 'resolved'; confidence: Confidence; entries: readonly ResolvedRelation[] }
  | { status: 'needs-gender'; candidates: readonly RelationEntry[] }
  | { status: 'unresolved'; reason: 'empty' | 'not-covered' | 'too-distant' }

function buildIndex(entries: readonly RelationEntry[]): Map<string, RelationEntry[]> {
  const index = new Map<string, RelationEntry[]>()
  for (const entry of entries) {
    for (const path of entry.paths) {
      const key = pathKey(path, entry.subjectGender ?? 'unspecified')
      const bucket = index.get(key)
      if (bucket) {
        bucket.push(entry)
      } else {
        index.set(key, [entry])
      }
    }
  }
  return index
}

// 精确匹配：只做全等路径查询与必要条件过滤，不做任何模糊/代数化简，
// 无法覆盖时明确返回 unresolved，由界面显示「暂未覆盖」。
export function resolveRelation(
  query: RelationQuery,
  corpus: readonly RelationEntry[] = MANDARIN_RELATIONS,
  packs: readonly RegionPack[] = REGION_PACKS,
): RelationResolution {
  if (query.path.length === 0) {
    return { status: 'unresolved', reason: 'empty' }
  }
  if (query.path.length > MAX_RELATION_DEPTH) {
    return { status: 'unresolved', reason: 'too-distant' }
  }

  const index = buildIndex(corpus)
  // 指定性别时：查该性别条件 entry + 无性别条件 entry；
  // 未指定时：无性别条件 entry 直接命中，带性别条件的进追问候选
  const matched: RelationEntry[] = []
  const genderCandidates: RelationEntry[] = []
  const genders: readonly SubjectGender[] =
    query.subjectGender === 'unspecified'
      ? ['unspecified', 'male', 'female']
      : [query.subjectGender, 'unspecified']
  for (const gender of genders) {
    for (const entry of index.get(pathKey(query.path, gender)) ?? []) {
      if (entry.subjectGender && entry.subjectGender !== query.subjectGender) {
        genderCandidates.push(entry)
      } else {
        matched.push(entry)
      }
    }
  }

  if (matched.length === 0) {
    if (genderCandidates.length > 0) {
      return { status: 'needs-gender', candidates: genderCandidates }
    }
    return { status: 'unresolved', reason: 'not-covered' }
  }

  const pack = query.regionPackId ? packs.find((item) => item.id === query.regionPackId) : undefined
  const entries: ResolvedRelation[] = matched.map((entry) => ({
    entry,
    regionalLabels: pack ? pack.entries.filter((item) => item.relationId === entry.id) : [],
  }))
  const hasRegional =
    entries.some((item) => item.regionalLabels.length > 0) ||
    matched.some((entry) => entry.confidence === 'regional')

  return {
    status: 'resolved',
    confidence: hasRegional ? 'regional' : 'exact',
    entries,
  }
}
