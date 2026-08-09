import { describe, expect, it } from 'vitest'
import { buildReportSlides } from './report-model'
import type { ReportAnswers } from './report-types'

const FULL: ReportAnswers = {
  keyword: '重启',
  place: '县城的老家',
  song: '同一首歌',
  'comfort-food': '楼下的牛肉面',
  'important-person': '老同学 K',
  'small-win': '学会了游一百米',
  'hard-moment': '三月那通电话',
  'feeling-scale': 4,
  'goal-and-release': { completion: 60, release: '没考完的证' },
  'next-year-message': '先睡够，再谈别的',
}

function omit(answers: ReportAnswers, ...keys: readonly (keyof ReportAnswers)[]): ReportAnswers {
  const copy: ReportAnswers = { ...answers }
  for (const key of keys) delete copy[key]
  return copy
}

describe('buildReportSlides', () => {
  it('满答案生成 7 页，页型顺序固定', () => {
    const slides = buildReportSlides(2026, FULL)
    expect(slides).toHaveLength(7)
    expect(slides.map((slide) => slide.kind)).toEqual([
      'cover',
      'place',
      'senses',
      'person',
      'weather',
      'growth',
      'ending',
    ])
    expect(new Set(slides.map((slide) => slide.id)).size).toBe(7)
  })

  it('跳过重要的人时自然缩短到 6 页，不留空壳', () => {
    const slides = buildReportSlides(2026, omit(FULL, 'important-person'))
    expect(slides).toHaveLength(6)
    expect(slides.map((slide) => slide.kind)).not.toContain('person')
  })

  it('三个敏感题都跳过时继续缩短，且封面与结尾始终在', () => {
    const slides = buildReportSlides(2026, omit(FULL, 'place', 'important-person', 'hard-moment'))
    const kinds = slides.map((slide) => slide.kind)
    expect(kinds[0]).toBe('cover')
    expect(kinds.at(-1)).toBe('ending')
    expect(kinds).not.toContain('place')
    expect(kinds).not.toContain('person')
    expect(slides.some((slide) => slide.lines.some((line) => line.includes('三月')))).toBe(false)
  })

  it('一题都没答也能出一份诚实的短报告，不写「暂无数据」', () => {
    const slides = buildReportSlides(2026, {})
    expect(slides.length).toBeGreaterThanOrEqual(2)
    const text = slides.map((slide) => `${slide.title}${slide.lines.join('')}`).join('')
    expect(text).not.toContain('暂无数据')
    expect(text).not.toContain('undefined')
    expect(text).not.toContain('NaN')
    expect(text).toContain('2026')
  })

  it('每页的主句都能追溯到用户答案', () => {
    const slides = buildReportSlides(2026, FULL)
    const place = slides.find((slide) => slide.kind === 'place')!
    expect(place.lines.join('')).toContain('县城的老家')

    const senses = slides.find((slide) => slide.kind === 'senses')!
    expect(senses.lines.join('')).toContain('同一首歌')
    expect(senses.lines.join('')).toContain('楼下的牛肉面')

    const person = slides.find((slide) => slide.kind === 'person')!
    expect(person.lines.join('')).toContain('老同学 K')

    const growth = slides.find((slide) => slide.kind === 'growth')!
    expect(growth.lines.join('')).toContain('学会了游一百米')
    expect(growth.lines.join('')).toContain('60')
    expect(growth.lines.join('')).toContain('没考完的证')

    const ending = slides.find((slide) => slide.kind === 'ending')!
    expect(ending.lines.join('')).toContain('先睡够，再谈别的')
  })

  it('封面用年份和用户自己的关键词', () => {
    const slides = buildReportSlides(2026, FULL)
    const cover = slides[0]!
    expect(cover.title).toContain('2026')
    expect(cover.lines.join('')).toContain('重启')
  })

  it('情绪天气只复述用户选的档位，不做心理推断', () => {
    const slides = buildReportSlides(2026, FULL)
    const weather = slides.find((slide) => slide.kind === 'weather')!
    expect(weather.lines.join('')).toContain('偏轻松')

    const text = slides.map((slide) => `${slide.title}${slide.lines.join('')}`).join('')
    expect(text).not.toMatch(/人格|性格|说明你|证明你|抑郁|焦虑|建议你|应该多|你需要/)
  })

  it('只答了量表也能出情绪天气页，跳过量表则不编造档位', () => {
    const onlyScale = buildReportSlides(2026, { 'feeling-scale': 1 })
    expect(onlyScale.some((slide) => slide.kind === 'weather')).toBe(true)

    const noScale = buildReportSlides(2026, omit(FULL, 'feeling-scale'))
    const weather = noScale.find((slide) => slide.kind === 'weather')!
    expect(weather.lines.join('')).toContain('三月那通电话')
    expect(weather.lines.join('')).not.toMatch(/一半一半|偏轻松|偏难过/)
  })

  it('极短与顶格文本都不会破坏结构', () => {
    const short = buildReportSlides(2026, { keyword: '熬', 'next-year-message': '嗯' })
    expect(short.every((slide) => slide.lines.every((line) => line.trim() !== ''))).toBe(true)

    const long = buildReportSlides(2026, {
      keyword: '八个字的关键词',
      place: '二'.repeat(24),
      'small-win': '三'.repeat(50),
      'next-year-message': '四'.repeat(30),
    })
    expect(long.every((slide) => slide.lines.length > 0)).toBe(true)
  })

  it('goal 完成度为 0 时仍然显示，不当成未作答', () => {
    const slides = buildReportSlides(2026, { 'goal-and-release': { completion: 0, release: '' } })
    const growth = slides.find((slide) => slide.kind === 'growth')!
    expect(growth.lines.join('')).toContain('0')
  })
})
