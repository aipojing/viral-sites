import type { DocumentValues } from './document-render'

export type DocumentSafety = 'normal' | 'sensitive'

// 保守的本地关键词表：只用于关闭娱乐语气，不做诊断、不阻止正式文案。
// 命中词不会进入埋点、日志或任何上报。
const SENSITIVE_PATTERNS: readonly string[] = [
  // 自伤倾向
  '自杀',
  '轻生',
  '不想活',
  '不想活了',
  '结束自己',
  '结束生命',
  '自残',
  '割腕',
  '跳楼',
  '活不下去',
  // 暴力威胁
  '报复社会',
  '报复他',
  '报复她',
  '杀了他',
  '杀了她',
  '杀了你',
  '同归于尽',
  '带刀',
  '砍人',
  '伤害他',
  '伤害她',
  '伤害你',
  // 严重医疗状况
  '癌症',
  '恶性肿瘤',
  '白血病',
  '心梗',
  '脑梗',
  '中风',
  '昏迷',
  '大出血',
  '药物过量',
  '休克',
]

export function classifyDocumentInput(values: DocumentValues): DocumentSafety {
  const joined = [values.addressee, values.reason, values.date, values.remedy]
    .filter((value): value is string => typeof value === 'string')
    .join('')
  if (SENSITIVE_PATTERNS.some((pattern) => joined.includes(pattern))) return 'sensitive'
  return 'normal'
}
