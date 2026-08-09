export type RelationToken =
  | 'father'
  | 'mother'
  | 'husband'
  | 'wife'
  | 'older-brother'
  | 'younger-brother'
  | 'older-sister'
  | 'younger-sister'
  | 'son'
  | 'daughter'

export type SubjectGender = 'male' | 'female' | 'unspecified'
export type Confidence = 'exact' | 'regional' | 'insufficient'

export const RELATION_TOKENS: readonly RelationToken[] = [
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
]

// 界面按钮与面包屑使用的中文标签，顺序与 RELATION_TOKENS 对齐
export const RELATION_TOKEN_LABELS: Readonly<Record<RelationToken, string>> = {
  father: '爸爸',
  mother: '妈妈',
  husband: '丈夫',
  wife: '妻子',
  'older-brother': '哥哥',
  'younger-brother': '弟弟',
  'older-sister': '姐姐',
  'younger-sister': '妹妹',
  son: '儿子',
  daughter: '女儿',
}

export interface RelationEntry {
  id: string
  paths: readonly RelationToken[][]
  labels: readonly string[]
  explanation: string
  lineage: 'paternal' | 'maternal' | 'spousal' | 'mixed'
  generation: number
  // 仅当称呼随用户性别变化时填写，例如丈夫的父亲对女性是公公、对男性是岳父
  subjectGender?: Exclude<SubjectGender, 'unspecified'>
  confidence: Exclude<Confidence, 'insufficient'>
  aliases: readonly string[]
  sourceIds: readonly string[]
}
