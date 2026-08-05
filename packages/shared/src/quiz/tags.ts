import type { QuizDimension, TagsTestConfig, TestConfig } from './schema'
import { assertAnswers } from './scoring'

export interface TagShare {
  tag: string
  title: string
  raw: number
  percent: number
  barColor: string
}

export interface TagsResult {
  raws: Record<string, number>
  composition: TagShare[]
  dominant: QuizDimension
  mentalAge: number
  comment: string
}

/** 运行时守卫 + 编译期类型收窄：assertTags 后 config 为 TagsTestConfig */
export function assertTags(config: TestConfig): asserts config is TagsTestConfig {
  if (config.scoring.mode !== 'tags') {
    throw new Error('computeTagsResult 仅支持 tags 模式配置')
  }
}

export function aggregateTags(
  config: TestConfig,
  answers: readonly number[],
): Record<string, number> {
  assertTags(config)
  const c: TagsTestConfig = config
  assertAnswers(c, answers)
  const dims = c.scoring.dimensions
  const zero: Record<string, number> = Object.fromEntries(dims.map((d) => [d.tag, 0]))
  const raws: Record<string, number> = { ...zero }
  for (let i = 0; i < answers.length; i += 1) {
    const optionTags = c.questions[i].options[answers[i]].tags ?? {}
    for (const [tag, weight] of Object.entries(optionTags)) {
      raws[tag] = (raws[tag] ?? 0) + weight
    }
  }
  return raws
}

export function normalizeShares(raws: readonly number[]): number[] {
  const total = raws.reduce((sum, raw) => sum + raw, 0)
  if (total <= 0) throw new Error('成分总分必须大于 0')
  const exact = raws.map((raw) => (raw / total) * 100)
  const floors = exact.map(Math.floor)
  const assigned = floors.reduce((sum, f) => sum + f, 0)
  const order = exact
    .map((value, i) => ({ i, frac: value - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  return order
    .slice(0, 100 - assigned)
    .reduce((acc, { i }) => acc.map((v, k) => (k === i ? v + 1 : v)), [...floors])
}

export function mentalAgeOf(config: TestConfig, raws: Record<string, number>): number {
  assertTags(config)
  const c: TagsTestConfig = config
  const dims = c.scoring.dimensions
  const total = dims.reduce((sum, d) => sum + (raws[d.tag] ?? 0), 0)
  if (total <= 0) throw new Error('成分总分必须大于 0')
  const weighted = dims.reduce((sum, d) => sum + d.anchorAge * (raws[d.tag] ?? 0), 0) / total
  const span = c.scoring.ageJitterSpan
  const jitter = (total % span) - Math.floor(span / 2)
  return Math.round(weighted) + jitter
}

export function computeTagsResult(config: TestConfig, answers: readonly number[]): TagsResult {
  assertTags(config)
  const c: TagsTestConfig = config
  const raws = aggregateTags(c, answers)
  const dims = c.scoring.dimensions
  const rawList = dims.map((d) => raws[d.tag] ?? 0)
  const percents = normalizeShares(rawList)
  const composition = dims
    .map((d, i) => ({ tag: d.tag, title: d.title, raw: rawList[i], percent: percents[i], barColor: d.barColor }))
    .sort((a, b) => b.raw - a.raw)
  const dominant = dims.find((d) => d.tag === composition[0].tag)!
  const mentalAge = mentalAgeOf(c, raws)
  return {
    raws,
    composition,
    dominant,
    mentalAge,
    comment: dominant.comments[mentalAge % dominant.comments.length],
  }
}
