import type { ChapterId } from '../lib/report-types'

export interface ChapterTransition {
  chapter: ChapterId
  title: string
  line: string
}

/**
 * 章节过渡：只描述接下来问什么，不评价用户已经填的内容，
 * 也不出现任何形式的判断、鼓励式结论或心理暗示。
 */
export const CHAPTER_TRANSITIONS: readonly ChapterTransition[] = [
  { chapter: 'opening', title: '第一章 · 先从容易的开始', line: '两个小问题，随手写就行。' },
  { chapter: 'life', title: '第二章 · 生活的声音和味道', line: '想想反复出现在今年的那些具体东西。' },
  { chapter: 'feeling', title: '第三章 · 今年的天气', line: '有难写的就跳过，这里不会追问。' },
  { chapter: 'forward', title: '第四章 · 留给明年', line: '最后两题，写完就能看报告。' },
]

const TRANSITION_MAP = new Map<ChapterId, ChapterTransition>(
  CHAPTER_TRANSITIONS.map((transition) => [transition.chapter, transition]),
)

export function transitionOf(chapter: ChapterId): ChapterTransition {
  const transition = TRANSITION_MAP.get(chapter)
  if (!transition) throw new Error(`未知章节：${chapter}`)
  return transition
}

/**
 * 报告页的中性引导词：只做版式衔接，不生成答案之外的事实。
 * 报告正文的主句一律来自用户答案本身。
 */
export const REPORT_LEADS = {
  cover: '你的年度报告',
  place: '今年走过的地方',
  senses: '今年的声音和味道',
  person: '今年很重要的人',
  weather: '今年的天气',
  growth: '今年的账单',
  ending: '写给明年',
} as const
