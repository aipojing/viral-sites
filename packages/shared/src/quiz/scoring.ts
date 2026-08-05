import type { QuizTier, TestConfig } from './schema'

export interface QuizResult {
  score: number
  tier: QuizTier
  percent: number
}

function assertLinear(config: TestConfig): void {
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
  assertAnswers(config, answers)
  return answers.reduce((sum, answer, i) => sum + config.questions[i].options[answer].score, 0)
}

export function scoreBounds(config: TestConfig): { min: number; max: number } {
  assertLinear(config)
  return config.questions.reduce(
    (acc, q) => {
      const scores = q.options.map((o) => o.score)
      return { min: acc.min + Math.min(...scores), max: acc.max + Math.max(...scores) }
    },
    { min: 0, max: 0 },
  )
}

export function resolveTier(config: TestConfig, score: number): QuizTier {
  assertLinear(config)
  const tiers = config.scoring.tiers
  let matched = tiers[0]
  for (const tier of tiers) {
    if (score >= tier.minScore) matched = tier
  }
  return matched
}

export function percentInTier(config: TestConfig, score: number): number {
  assertLinear(config)
  const tiers = config.scoring.tiers
  const tier = resolveTier(config, score)
  const index = tiers.indexOf(tier)
  const tierMin = tier.minScore
  const tierMax = index + 1 < tiers.length ? tiers[index + 1].minScore - 1 : scoreBounds(config).max
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
