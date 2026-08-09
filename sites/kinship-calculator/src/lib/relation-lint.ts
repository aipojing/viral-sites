import type { RegionPack } from '../data/region-packs'
import type { RelationEntry } from '../data/relation-types'
import { MAX_RELATION_DEPTH } from './path'

const VALID_TOKENS: ReadonlySet<string> = new Set<string>([
  'father',
  'mother',
  'husband',
  'wife',
  'older-brother',
  'younger-brother',
  'older-sister',
  'younger-sister',
  'son',
  'daughter',
])

// 过于笼统的地域名无法给用户可操作的区分
const TOO_BROAD_REGIONS: ReadonlySet<string> = new Set(['北方话', '南方话', '全国', '中国'])

const CANTONESE_MARKERS = ['粤', 'cantonese']

// 构建期 lint：corpus 与地域包的任何结构问题都在这里报错，测试直接 fail。
// 返回空数组表示通过。
export function lintRelationData(
  entries: readonly RelationEntry[],
  packs: readonly RegionPack[],
): readonly string[] {
  const errors: string[] = []
  const seenIds = new Set<string>()
  const seenPathKeys = new Set<string>()
  const entryIds = new Set(entries.map((entry) => entry.id))

  for (const entry of entries) {
    if (entry.id === '') {
      errors.push('存在空 id 的 entry')
      continue
    }
    if (seenIds.has(entry.id)) {
      errors.push(`重复的 entry id：${entry.id}`)
    }
    seenIds.add(entry.id)

    if (entry.paths.length === 0) {
      errors.push(`${entry.id}：至少需要一条关系路径`)
    }
    if (entry.labels.length === 0 || entry.labels.some((label) => label.trim() === '')) {
      errors.push(`${entry.id}：称呼 labels 不能为空`)
    }
    if (entry.explanation.trim() === '') {
      errors.push(`${entry.id}：解释 explanation 不能为空`)
    }
    if (entry.sourceIds.length === 0 || entry.sourceIds.some((id) => id.trim() === '')) {
      errors.push(`${entry.id}：来源 sourceIds 不能为空`)
    }

    for (const path of entry.paths) {
      if (path.length === 0) {
        errors.push(`${entry.id}：关系路径不能为空`)
        continue
      }
      if (path.length > MAX_RELATION_DEPTH) {
        errors.push(`${entry.id}：路径超过 ${MAX_RELATION_DEPTH} 级上限：${path.join('>')}`)
      }
      for (const token of path) {
        if (!VALID_TOKENS.has(token)) {
          errors.push(`${entry.id}：路径包含未定义的关系枚举：${String(token)}`)
        }
      }
      // 同一路径 + 同一性别条件下只允许一个 entry，否则就是相互矛盾的 exact 结果
      const key = `${entry.subjectGender ?? 'any'}:${path.join('>')}`
      if (seenPathKeys.has(key)) {
        errors.push(`${entry.id}：路径 ${path.join('>')} 在相同条件下重复或矛盾`)
      }
      seenPathKeys.add(key)
    }
  }

  for (const pack of packs) {
    if (pack.label.trim() === '') {
      errors.push(`地域包 ${pack.id}：名称不能为空`)
    }
    const isCantonese = CANTONESE_MARKERS.some(
      (marker) => pack.id.toLowerCase().includes(marker) || pack.label.includes(marker),
    )
    for (const item of pack.entries) {
      if (!entryIds.has(item.relationId)) {
        errors.push(`地域包 ${pack.id}：引用了不存在的 relationId：${item.relationId}`)
      }
      if (item.label.trim() === '') {
        errors.push(`地域包 ${pack.id}：地域称呼不能为空`)
      }
      if (TOO_BROAD_REGIONS.has(item.region)) {
        errors.push(`地域包 ${pack.id}：地区名过宽，请给出可操作的地区标签：${item.region}`)
      }
      if (item.reviewerRoles.length !== 2 || item.reviewerRoles[0] === item.reviewerRoles[1]) {
        errors.push(`地域包 ${pack.id}：${item.label} 需要两位不同的母语者审核`)
      }
      if (isCantonese && (item.pronunciation ?? '').trim() === '') {
        errors.push(`粤语地域包 ${pack.id}：${item.label} 需要粤拼或读音提示`)
      }
    }
  }

  return errors
}

export interface PopularRelationRef {
  entryId: string
}

export function lintPopularRelations(
  entries: readonly RelationEntry[],
  popular: readonly PopularRelationRef[],
): readonly string[] {
  const entryIds = new Set(entries.map((entry) => entry.id))
  const errors: string[] = []
  const seen = new Set<string>()
  for (const item of popular) {
    if (!entryIds.has(item.entryId)) {
      errors.push(`热门速查引用了不存在的 relationId：${item.entryId}`)
    }
    if (seen.has(item.entryId)) {
      errors.push(`热门速查重复收录：${item.entryId}`)
    }
    seen.add(item.entryId)
  }
  return errors
}
