import type { NormalizedJudgeInput } from './normalize'
import type { Verdict } from './types'

export type SafetyCategory =
  | 'politics'
  | 'public-figure'
  | 'abuse'
  | 'appearance'
  | 'region'
  | 'gender'
  | 'health'
  | 'family'
  | 'hate'
  | 'threat'
  | 'self-harm'

/**
 * 纯文本安全分类器。只返回命中类别，不向响应或日志回显命中词。
 * 词库是上线硬门槛的第一道闸：宁可保守拒案/转 fallback，也不放行越界内容；
 * 误杀/漏杀样本必须以 fixture 固化。政治与公众人物名单上线前需按当时中文环境人工复核。
 */
const LEXICON: Readonly<Record<SafetyCategory, readonly string[]>> = {
  politics: [
    '反党',
    '颠覆国家',
    '颜色革命',
    '台独',
    '港独',
    '疆独',
    '藏独',
    '法轮',
    '法輪',
    '邪教',
    '政变',
    '暴动',
    '六四',
    '坦克压',
    '翻墙出国',
  ],
  'public-figure': [
    '国家主席',
    '国家领导',
    '总书记',
    '国务院总理',
    '外交部长',
    '毛主席',
    '周总理',
  ],
  // 重度辱骂与指向性辱骂。轻度自嘲梗词（废物/牛马/社畜）不在此列，避免大面积误杀。
  abuse: [
    '肏你',
    '草你',
    '操你',
    '靠你妈',
    '你妈逼',
    '你妈了个',
    '傻逼',
    '煞笔',
    '沙比',
    '妈的',
    '他妈',
    '贱人',
    '贱货',
    '狗东西',
    '狗杂',
    '王八蛋',
    '畜生',
    '滚犊子',
    '去死吧你',
  ],
  appearance: ['肥猪', '丑八怪', '丑逼', '丑女', '丑男', '癞蛤蟆', '恐龙妹', '挫男', '矮冬瓜', '秃驴'],
  region: ['河南人都', '东北人都', '上海人都', '某省人素质', '地域黑', '黑鬼', '白皮猪', '阿三', '小西八'],
  gender: ['娘炮', '娘娘腔', '二椅子', '死基佬', '死gay', '女司机都', '田园女权', '男的都是'],
  // 歧视性词汇。用户自述「我有点抑郁」不拦截：只拦把疾病当武器的用法。
  health: ['神经病', '精神病', '智障', '弱智', '脑瘫', '唐氏', '疯子', '艾滋佬', '癌症佬'],
  family: ['没妈的', '没爹的', '野种', '私生子', '克爹', '克妈', '全家暴毙', '你全家', '孤儿出身'],
  hate: ['劣等民族', '民族劣根', '华人劣根', '中国人劣根', '种族清洗', '黄皮', '支那', '蝗虫民族'],
  threat: ['杀了你', '弄死你', '打死你', '砍死你', '人肉你', '曝光你全家', '绑架你', '上门找你'],
  'self-harm': ['自杀', '自残', '割腕', '轻生', '结束生命', '不想活了', '活着没意思'],
}

// 常见谐音/字母变体，只用于匹配归一，不改写展示文本。
// 单字母 b 太容易误伤普通英文，只在 sb / 傻b 这类明确规避形态下替换。
const HOMOPHONE_MAP: Readonly<Record<string, string>> = {
  '艹': '肏',
  '操': '肏',
  '草': '肏',
  'cao': '肏',
  '煞笔': '傻逼',
  '沙比': '傻逼',
  '煞比': '傻逼',
  '傻笔': '傻逼',
  '傻b': '傻逼',
  'sha逼': '傻逼',
}

const SEPARATOR_PATTERN = /[\s\.\-_~·!?！？。，,;；:：'"“”‘’()\[\]【】{}<>《》|/\\@#$%^&*+=`]+/g

/** 归一化仅供匹配：小写、去分隔符、常见谐音替换。 */
export function normalizeForMatch(value: string): string {
  let text = value.normalize('NFC').toLowerCase().replace(SEPARATOR_PATTERN, '')
  text = text.split('sb').join('傻逼')
  for (const [variant, canonical] of Object.entries(HOMOPHONE_MAP)) {
    if (variant !== canonical) text = text.split(variant).join(canonical)
  }
  return text
}

function inspectText(text: string): readonly SafetyCategory[] {
  const haystack = normalizeForMatch(text)
  if (haystack.length === 0) return []
  const hits: SafetyCategory[] = []
  for (const [category, terms] of Object.entries(LEXICON) as [SafetyCategory, readonly string[]][]) {
    if (terms.some((term) => haystack.includes(normalizeForMatch(term)))) hits.push(category)
  }
  return hits
}

export function inspectInput(input: NormalizedJudgeInput): readonly SafetyCategory[] {
  return inspectText(`${input.nickname}\n${input.intro}`)
}

export function inspectVerdict(verdict: Verdict): readonly SafetyCategory[] {
  return inspectText([verdict.crime, verdict.verdict, verdict.sentence, verdict.seal].join('\n'))
}
