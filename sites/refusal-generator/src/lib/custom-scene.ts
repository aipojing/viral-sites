import type { Phrase } from '@viral/shared'
import { CUSTOM_PHRASES } from '../configs/custom-phrases'
import type { Scene } from '../configs/scenes'

export const CUSTOM_SCENE: Scene = {
  id: 'custom',
  label: '自定义场景',
  icon: '✍️',
  color: '#475569',
  span: 1,
}

export function normalizeSituation(raw: string): string {
  return [...raw.trim()].slice(0, 40).join('')
}

export function buildCustomPhrases(toneId: string, rawSituation: string): Phrase[] {
  const situation = normalizeSituation(rawSituation)
  if (!situation) return []
  const templates = CUSTOM_PHRASES[toneId] ?? []
  return templates.map((template) => ({
    scene: CUSTOM_SCENE.id,
    tone: toneId,
    text: template.split('{具体处境}').join(situation),
  }))
}
