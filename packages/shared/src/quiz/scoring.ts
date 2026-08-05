import type { LinearTestConfig, QuizTier, TestConfig } from './schema'

export interface QuizResult {
  score: number
  tier: QuizTier
  percent: number
}

/** 运行时守卫 + 编译期类型收窄：assertLinear 后 config 为 LinearTestConfig */
export function assertLinear(config: TestConfig): asserts config is LinearTestConfig {
  if (config.scoring.mode !== 'linear') {
    throw new Error('线性计分函数仅支持 mode 为 linear 的配置')
  }
}

export function assertAnswers(config: TestConfig, answers: readonly number[]): void {
  if (answers.length !== config.questions.length) {
    throw new Error(`答案数量不对：应为 ${config.questions.length}，实际 ${answers.length}`)
  }
  answers.forEach((answer, i) => {
    const optionCount = config.questions[i].options.length
    if (!Number.isInteger(answer) || answer < 0 || answer >= optionCount) {
      throw new Error(`第 ${i + 1} 题答案越界：${answer}`)
    }
  })
}

export function totalScore(config: TestConfig, answers: readonly number[]): number {
  assertLinear(config)
  const c: LinearTestConfig = config
  assertAnswers(c, answers)
  let sum = 0
  for (let i = 0; i < answers.length; i += 1) {
    sum += c.questions[i].options[answers[i]].score
  }
  return sum
}

export function scoreBounds(config: TestConfig): { min: number; max: number } {
  assertLinear(config)
  const c: LinearTestConfig = config
  let min = 0
  let max = 0
  for (const q of c.questions) {
    const scores = q.options.map((o) => o.score)
    min += Math.min(...scores)
    max += Math.max(...scores)
  }
  return { min, max }
}

export function resolveTier(config: TestConfig, score: number): QuizTier {
  assertLinear(config)
  const c: LinearTestConfig = config
  const tiers = c.scoring.tiers
  let matched = tiers[0]
  for (const tier of tiers) {
    if (score >= tier.minScore) matched = tier
  }
  return matched
}

export function percentInTier(config: TestConfig, score: number): number {
  assertLinear(config)
  const c: LinearTestConfig = config
  const tiers = c.scoring.tiers
  const tier = resolveTier(c, score)
  const index = tiers.indexOf(tier)
  const tierMin = tier.minScore
  const tierMax = index + 1 < tiers.length ? tiers[index + 1].minScore - 1 : scoreBounds(c).max
  const [lo, hi] = tier.percentRange
  if (tierMax === tierMin) return Math.round(lo)
  const ratio = (score - tierMin) / (tierMax - tierMin)
  return Math.round(lo + ratio * (hi - lo))
}

export function computeResult(config: TestConfig, answers: readonly number[]): QuizResult {
  const score = totalScore(config, answers)
  const tier = resolveTier(config, score)
  return { score, tier, percent: percentInTier(config, score) }
}
