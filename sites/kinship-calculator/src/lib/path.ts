import type { RelationToken, SubjectGender } from '../data/relation-types'

export const MAX_RELATION_DEPTH = 8

const SPOUSE_TOKENS: ReadonlySet<RelationToken> = new Set(['husband', 'wife'])

// 查询键固定为 `${gender}:${path.join('>')}`，gender 参与键避免不同性别语境的称呼互相污染
export function pathKey(path: readonly RelationToken[], gender: SubjectGender): string {
  return `${gender}:${path.join('>')}`
}

export function appendRelation(
  path: readonly RelationToken[],
  token: RelationToken,
): readonly RelationToken[] {
  if (path.length >= MAX_RELATION_DEPTH) {
    throw new RangeError(`关系链最多支持 ${MAX_RELATION_DEPTH} 级`)
  }
  // 配偶的配偶就是自己，相邻的两个配偶 token 构成自环，不成立；
  // 但链路后段允许出现亲属的配偶（如 妻子>姐姐>丈夫 = 连襟、丈夫>哥哥>妻子 = 妯娌）
  const last = path[path.length - 1]
  if (last !== undefined && SPOUSE_TOKENS.has(last) && SPOUSE_TOKENS.has(token)) {
    throw new RangeError('配偶的配偶就是自己，这一级不成立')
  }
  return [...path, token]
}

export function removeLastRelation(path: readonly RelationToken[]): readonly RelationToken[] {
  return path.slice(0, -1)
}
