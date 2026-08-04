export { track } from './analytics/track'
export { detectSaveStrategy, type SaveStrategy } from './share-card/env'
export { renderCard, CARD_SIZE, type CardSize, type DrawFn } from './share-card/render-card'
export { saveCard, type SaveCardOptions } from './share-card/save-image'
export {
  parseTestConfig,
  type TestConfig,
  type QuizQuestion,
  type QuizOption,
  type QuizTier,
} from './quiz/schema'
export {
  assertAnswers,
  totalScore,
  scoreBounds,
  resolveTier,
  percentInTier,
  computeResult,
  type QuizResult,
} from './quiz/scoring'
