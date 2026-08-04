import type { TestConfig } from '@viral/shared'
import { banWeiConfig } from './ban-wei'

const REGISTRY: Record<string, TestConfig> = {
  [banWeiConfig.meta.slug]: banWeiConfig,
}

export const DEFAULT_SLUG = 'ban-wei'

export function resolveConfig(search: string): TestConfig {
  const slug = new URLSearchParams(search).get('t')
  return (slug && REGISTRY[slug]) || REGISTRY[DEFAULT_SLUG]
}
