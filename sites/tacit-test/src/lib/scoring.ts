import { QUIZZES, type QuizId } from './questions'

export type TierId = 'soulmate' | 'mutual' | 'grinding' | 'parallel' | 'plastic'

export interface Tier {
  id: TierId
  min: number
  title: string
  remark: string
  accent: string
}

interface TierDef {
  id: TierId
  min: number
  accent: string
  title: Record<QuizId, string>
  remark: Record<QuizId, string>
}

const TIER_DEFS: readonly TierDef[] = [
  {
    id: 'soulmate',
    min: 90,
    accent: '#e0483a',
    title: { friend: '灵魂共振', couple: '灵魂共振' },
    remark: {
      friend: '你们俩上辈子大概是同一个人，这辈子拆成两份也没拆干净',
      couple: '这默契已经不需要开口了，一个眼神就能吵完一整架再和好',
    },
  },
  {
    id: 'mutual',
    min: 70,
    accent: '#e08f3a',
    title: { friend: '双向奔赴', couple: '双向奔赴' },
    remark: {
      friend: '不用天天联系，但一开口就知道对方在哪个频道，这就够了',
      couple: '你们在彼此心里显然都存着一份持续更新的使用说明书',
    },
  },
  {
    id: 'grinding',
    min: 50,
    accent: '#c9a227',
    title: { friend: '还在磨合', couple: '还在磨合' },
    remark: {
      friend: '一半默契一半惊喜，友谊的乐趣就在猜错的那几题里',
      couple: '爱是确定的，细节还在打补丁——多约几次会，版本就更新了',
    },
  },
  {
    id: 'parallel',
    min: 30,
    accent: '#6b9bbf',
    title: { friend: '各过各的', couple: '各过各的' },
    remark: {
      friend: '你们的默契像信号不好的 WiFi——有，但得看缘分',
      couple: '住在同一段感情里，跑着两套操作系统，建议定期同步一下',
    },
  },
  {
    id: 'plastic',
    min: 0,
    accent: '#8a94a6',
    title: { friend: '塑料情谊', couple: '建议聊聊' },
    remark: {
      friend: '恭喜解锁塑料友情认证——别慌，塑料的优点是特别耐用',
      couple: '分数不代表感情，但今晚的聊天话题这不就来了吗',
    },
  },
]

export function computeScore(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error('answer arrays must have equal length')
  return a.reduce((acc, v, i) => (v === b[i] ? acc + 10 : acc), 0)
}

export function tierFor(score: number, quiz: QuizId): Tier {
  const def = TIER_DEFS.find((t) => score >= t.min) ?? TIER_DEFS[TIER_DEFS.length - 1]
  return {
    id: def.id,
    min: def.min,
    title: def.title[quiz],
    remark: def.remark[quiz],
    accent: def.accent,
  }
}

export interface ComparisonRow {
  index: number
  question: string
  initiatorOption: string
  challengerOption: string
  matched: boolean
}

export function buildComparison(
  quiz: QuizId,
  initiator: readonly number[],
  challenger: readonly number[],
): ComparisonRow[] {
  return QUIZZES[quiz].questions.map((question, i) => ({
    index: i,
    question: question.text,
    initiatorOption: question.options[initiator[i]],
    challengerOption: question.options[challenger[i]],
    matched: initiator[i] === challenger[i],
  }))
}

export function pickHighlightRow(rows: readonly ComparisonRow[]): ComparisonRow {
  return rows.find((r) => r.matched) ?? rows[0]
}
