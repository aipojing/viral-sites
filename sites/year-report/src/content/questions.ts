import type { ChapterId, Question, QuestionId } from '../lib/report-types'

/** 自由文本的全局硬上限：帮助排版，不收集长日记 */
export const MAX_FREE_TEXT_LENGTH = 60

export const CHAPTER_ORDER: readonly ChapterId[] = ['opening', 'life', 'feeling', 'forward']

/**
 * 十问：题面只问具体的事，示例只演示格式，不替用户判断好坏。
 * 每题都能跳过；「最难熬的一刻」跳过后不再追问。
 */
export const QUESTIONS: readonly Question[] = [
  {
    id: 'keyword',
    chapter: 'opening',
    prompt: '今年的一个关键词',
    example: '比如「搬家」「熬」「重启」，自己写也行',
    maxLength: 8,
    optional: true,
    kind: 'keyword',
    presets: ['搬家', '重启', '熬', '换城市', '慢下来', '折腾', '陪伴', '存钱'],
  },
  {
    id: 'place',
    chapter: 'opening',
    prompt: '今年去过最远或最难忘的地方',
    example: '比如「县城的老家」「海边的第七天」',
    maxLength: 24,
    optional: true,
    kind: 'text',
    hint: '写到你自己认得就够，不用写详细地址',
  },
  {
    id: 'song',
    chapter: 'life',
    prompt: '重复听得最多的一首歌',
    example: '比如「同一首歌听了整个春天」，写歌名就行',
    maxLength: 24,
    optional: true,
    kind: 'text',
  },
  {
    id: 'comfort-food',
    chapter: 'life',
    prompt: '最常安慰自己的一顿饭或一杯饮料',
    example: '比如「楼下的牛肉面」「加冰的可乐」',
    maxLength: 24,
    optional: true,
    kind: 'text',
  },
  {
    id: 'important-person',
    chapter: 'life',
    prompt: '今年很重要的一个人',
    example: '只写称呼或代号，比如「老同学 K」「我妈」',
    maxLength: 24,
    optional: true,
    kind: 'text',
    hint: '默认不出现在分享图和链接里',
  },
  {
    id: 'small-win',
    chapter: 'feeling',
    prompt: '今年做成的一件小事',
    example: '比如「学会了游一百米」「把体检做完了」',
    maxLength: 50,
    optional: true,
    kind: 'text',
  },
  {
    id: 'hard-moment',
    chapter: 'feeling',
    prompt: '最难熬的一刻',
    example: '一句话就够，比如「三月那通电话」',
    maxLength: 50,
    optional: true,
    kind: 'text',
    hint: '不想写就跳过，我们不会再问细节，也不会据此下任何结论',
  },
  {
    id: 'feeling-scale',
    chapter: 'feeling',
    prompt: '今年笑得多还是哭得多',
    example: '凭感觉选一档，不用回想次数',
    optional: true,
    kind: 'scale',
    scaleLabels: ['哭得多得多', '偏难过', '一半一半', '偏轻松', '笑得多得多'],
  },
  {
    id: 'goal-and-release',
    chapter: 'forward',
    prompt: '年初的目标，今年走到几成',
    example: '拖一下就好，不用算精确百分比',
    maxLength: 50,
    optional: true,
    kind: 'goal',
    releasePrompt: '还有一件没完成、但你已经不再责怪自己的事',
  },
  {
    id: 'next-year-message',
    chapter: 'forward',
    prompt: '写给明年自己的一句话',
    example: '比如「先睡够，再谈别的」',
    maxLength: 30,
    optional: true,
    kind: 'text',
  },
]

const QUESTION_MAP = new Map<QuestionId, Question>(QUESTIONS.map((question) => [question.id, question]))

export function questionById(id: QuestionId): Question {
  const question = QUESTION_MAP.get(id)
  if (!question) throw new Error(`未知题号：${id}`)
  return question
}

export function questionsOfChapter(chapter: ChapterId): readonly Question[] {
  return QUESTIONS.filter((question) => question.chapter === chapter)
}

export const QUESTION_IDS: readonly QuestionId[] = QUESTIONS.map((question) => question.id)
