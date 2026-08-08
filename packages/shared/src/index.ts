export { startAnalytics, track } from './analytics/track'
export { detectSaveStrategy, type SaveStrategy } from './share-card/env'
export { renderCard, CARD_SIZE, type CardSize, type DrawFn } from './share-card/render-card'
export { saveCard, type SaveCardOptions } from './share-card/save-image'
export { wrapByLength } from './share-card/text'
export {
  ADDRESSEE_MAX_LENGTH,
  DEFAULT_ADDRESSEE,
  PLACEHOLDER_ADDRESSEE,
  hasAddresseePlaceholder,
  normalizeAddressee,
  renderTemplate,
} from './phrase/template'
export { phraseLibrarySchema, phraseSchema, type Phrase } from './phrase/schema'
export { lintPhraseLibrary, type PhraseLintConfig, type PhraseLintIssue } from './phrase/lint'
export { fnv1a } from './seeded/fnv1a'
export { seededSequence, pickOne, pickN, type SeededSequence } from './seeded/sequence'
export {
  parseTestConfig,
  type TestConfig,
  type LinearTestConfig,
  type TagsTestConfig,
  type QuizQuestion,
  type QuizOption,
  type QuizTier,
  type QuizDimension,
} from './quiz/schema'
export {
  assertAnswers,
  assertLinear,
  totalScore,
  scoreBounds,
  resolveTier,
  percentInTier,
  computeResult,
  type QuizResult,
} from './quiz/scoring'
export {
  assertTags,
  aggregateTags,
  normalizeShares,
  mentalAgeOf,
  computeTagsResult,
  type TagShare,
  type TagsResult,
} from './quiz/tags'
