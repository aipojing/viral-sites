import { renderOptionalTemplate, type TemplateValues } from '@viral/shared'
import type { DocumentType } from '../configs/document-types'
import type { DocumentKind, DocumentTemplate } from './document-schema'

export interface DocumentSelection {
  type: DocumentType
  scene: string
  audience: string
  tone: string
}

export interface DocumentValues {
  addressee?: string
  reason: string
  date?: string
  remedy?: string
}

export interface RenderedDocument {
  id: string
  kind: DocumentKind
  text: string
}

// 自由输入统一上限 30 个 Unicode code points，只在内存处理。
const MAX_FREE_INPUT = 30

function clampCodePoints(text: string, max: number): string {
  const points = Array.from(text)
  return points.length <= max ? text : points.slice(0, max).join('')
}

export function normalizeDocumentValues(raw: DocumentValues): DocumentValues {
  return {
    addressee: clampCodePoints((raw.addressee ?? '').trim(), MAX_FREE_INPUT),
    reason: clampCodePoints(raw.reason.trim(), MAX_FREE_INPUT),
    date: raw.date ? clampCodePoints(raw.date.trim(), MAX_FREE_INPUT) : undefined,
    remedy: raw.remedy ? clampCodePoints(raw.remedy.trim(), MAX_FREE_INPUT) : undefined,
  }
}

export function renderDocumentBatch(
  templates: readonly DocumentTemplate[],
  rawValues: DocumentValues,
): readonly [RenderedDocument, RenderedDocument, RenderedDocument] {
  if (templates.length !== 3) {
    throw new Error(`document batch expects exactly 3 templates, got ${templates.length}`)
  }
  const normalized = normalizeDocumentValues(rawValues)
  if (!normalized.reason) {
    throw new Error('missing template value: 事由')
  }
  const values: TemplateValues = {
    对象称呼: normalized.addressee || '你好',
    事由: normalized.reason,
    日期: normalized.date,
    补救动作: normalized.remedy,
  }
  const renderOne = (template: DocumentTemplate): RenderedDocument => ({
    id: template.id,
    kind: template.kind,
    text: renderOptionalTemplate(template.text, values),
  })
  const [first, second, third] = templates
  return [renderOne(first), renderOne(second), renderOne(third)]
}
