import type { WorldChapter } from '../data/fact-types'

export interface ChapterMeta {
  index: string
  title: string
  lede: string
}

/** 叙事顺序：从离你最近走向尺度最大 */
export const CHAPTER_ORDER: readonly WorldChapter[] = ['self', 'daily', 'human', 'planet']

export const CHAPTER_META: Record<WorldChapter, ChapterMeta> = {
  self: {
    index: '01',
    title: '你在这里',
    lede: '从心跳和呼吸开始，这是离你最近的一秒。以下按成年人安静时的平均水平估算。',
  },
  daily: {
    index: '02',
    title: '城市与日常',
    lede: '你停留的这段时间里，快递在派送、列车在出发、电影在开场。以下为中国 2025 年官方统计的均摊。',
  },
  human: {
    index: '03',
    title: '人类整体',
    lede: '把尺度拉远到全球：新生命的到来、出厂的汽车、跨越国境的旅行。',
  },
  planet: {
    index: '04',
    title: '地球与宇宙',
    lede: '即使你一动不动，地球也带着你高速前进，太阳也一刻不停地释放能量。',
  },
}
