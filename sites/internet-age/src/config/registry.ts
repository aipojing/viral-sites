import type { TestConfig } from '@viral/shared'
import { wangGanConfig } from './wang-gan'

const REGISTRY: Record<string, TestConfig> = {
  [wangGanConfig.meta.slug]: wangGanConfig,
}

export const DEFAULT_SLUG = 'wang-gan'

export function resolveConfig(search: string): TestConfig {
  const slug = new URLSearchParams(search).get('t')
  return (slug && REGISTRY[slug]) || REGISTRY[DEFAULT_SLUG]
}
