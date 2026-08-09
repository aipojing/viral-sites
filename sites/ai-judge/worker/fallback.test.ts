import { describe, expect, it } from 'vitest'
import { FALLBACK_VERDICTS, fallbackVerdict } from './fallback'
import type { NormalizedJudgeInput } from './normalize'
import { inspectVerdict } from './safety'
import { parseVerdict } from './verdict-schema'

const input = (nickname: string, intro = ''): NormalizedJudgeInput => ({
  nickname,
  intro,
  dailyId: '3f2c9a1e-8b4d-4c6e-9f0a-1b2c3d4e5f60',
})

describe('FALLBACK_VERDICTS', () => {
  it('共 20 条且互不重复', () => {
    expect(FALLBACK_VERDICTS).toHaveLength(20)
    expect(new Set(FALLBACK_VERDICTS.map(({ verdict }) => verdict)).size).toBe(20)
  })

  it('每条都通过 schema 校验', () => {
    for (const verdict of FALLBACK_VERDICTS) {
      expect(parseVerdict(JSON.stringify(verdict))).toEqual(verdict)
    }
  })

  it('每条都通过安全过滤', () => {
    for (const verdict of FALLBACK_VERDICTS) {
      expect(inspectVerdict(verdict), verdict.crime).toEqual([])
    }
  })

  it('不引用任何可能的用户输入原文', () => {
    const nicknames = ['阿福', '小明🐱', '摸鱼大师']
    const intros = ['凌晨两点还在刷手机', '喜欢打游戏']
    const serialized = JSON.stringify(FALLBACK_VERDICTS)
    for (const value of [...nicknames, ...intros]) {
      expect(serialized).not.toContain(value)
    }
  })
})

describe('fallbackVerdict', () => {
  it('同一输入确定性返回同一条', () => {
    const first = fallbackVerdict(input('阿福', '爱熬夜'))
    const second = fallbackVerdict(input('阿福', '爱熬夜'))
    expect(first).toEqual(second)
  })

  it('不同输入可以命中不同条目', () => {
    const picked = new Set(
      ['阿福', '小明', '老王', '阿猫', '阿狗', '铁柱', '翠花', '大壮'].map((name) =>
        FALLBACK_VERDICTS.indexOf(fallbackVerdict(input(name))),
      ),
    )
    expect(picked.size).toBeGreaterThan(1)
  })

  it('返回值一定来自判词库', () => {
    expect(FALLBACK_VERDICTS).toContain(fallbackVerdict(input('任意昵称')))
  })
})
