import { z } from 'zod'
import { listTemplateVariables } from '@viral/shared'
import type { DocumentType } from '../configs/document-types'
import { DOCUMENT_TONES } from '../configs/document-tones'

export type DocumentKind = 'usable' | 'joke'

export interface DocumentCell {
  type: DocumentType
  scene: string
  audience: string
  tone: string
}

export interface DocumentTemplate extends DocumentCell {
  id: string
  kind: DocumentKind
  text: string
  reviewedBy: readonly [string, string]
}

export const ALLOWED_DOCUMENT_VARIABLES = ['对象称呼', '事由', '日期', '补救动作'] as const

// 规格建议 40~180 字；下限放宽到 25：请假消息天然偏短，强行凑字会产生套话。
export const DOCUMENT_TEXT_MIN = 25
export const DOCUMENT_TEXT_MAX = 180

const OPTIONAL = /\[\[([^\[\]]*)\]\]/gu

export function codePointLength(text: string): number {
  return Array.from(text).length
}

// 与 shared 解析器一致：可选块不可嵌套、不可悬空。
export function templateStructureError(text: string): string | null {
  const leftover = text.replace(OPTIONAL, '')
  if (leftover.includes('[[') || leftover.includes(']]')) {
    return 'optional blocks must not nest or dangle'
  }
  return null
}

const toneKindById = new Map(DOCUMENT_TONES.map((tone) => [tone.id, tone.kind]))

const documentTemplateSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['apology', 'leave']),
    scene: z.string().min(1),
    audience: z.string().min(1),
    tone: z.string().min(1),
    kind: z.enum(['usable', 'joke']),
    text: z.string().min(1),
    reviewedBy: z.tuple([z.string().min(1), z.string().min(1)]),
  })
  .superRefine((template, ctx) => {
    const length = codePointLength(template.text)
    if (length < DOCUMENT_TEXT_MIN || length > DOCUMENT_TEXT_MAX) {
      ctx.addIssue({
        code: 'custom',
        path: ['text'],
        message: `text must be ${DOCUMENT_TEXT_MIN}~${DOCUMENT_TEXT_MAX} code points, got ${length}`,
      })
    }
    const structureError = templateStructureError(template.text)
    if (structureError) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: structureError })
    }
    const variables = listTemplateVariables(template.text)
    const unknown = variables.filter((name) => !ALLOWED_DOCUMENT_VARIABLES.includes(name as never))
    if (unknown.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['text'],
        message: `unknown variables: ${unknown.join(', ')}`,
      })
    }
    if (!variables.includes('事由')) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: 'template must use {事由}' })
    }
    const expectedKind = toneKindById.get(template.tone)
    if (!expectedKind || expectedKind !== template.kind) {
      ctx.addIssue({
        code: 'custom',
        path: ['kind'],
        message: `tone ${template.tone} must have kind ${expectedKind ?? 'a known tone'}`,
      })
    }
    const [first, second] = template.reviewedBy
    if (first.trim() === '' || second.trim() === '' || first === second) {
      ctx.addIssue({
        code: 'custom',
        path: ['reviewedBy'],
        message: 'reviewedBy must be two different non-empty reviewers',
      })
    }
  })

export const documentTemplatesSchema = z.array(documentTemplateSchema)
