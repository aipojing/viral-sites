import { listTemplateVariables, renderOptionalTemplate, type TemplateValues } from '@viral/shared'
import { DOCUMENT_TONES } from '../configs/document-tones'
import {
  ALLOWED_DOCUMENT_VARIABLES,
  codePointLength,
  DOCUMENT_TEXT_MAX,
  type DocumentCell,
  type DocumentTemplate,
} from './document-schema'

export interface DocumentLintIssue {
  code:
    | 'duplicate-id'
    | 'missing-cell'
    | 'candidate-count'
    | 'length'
    | 'unknown-variable'
    | 'kind-mismatch'
    | 'missing-review'
  id?: string
  message: string
}

// 渲染后字数下限放宽到 25：请假消息天然偏短，强行凑 40 会产生套话；
// 模板原文仍受 document-schema 的 40~180 code points 约束。
const RENDERED_TEXT_MIN = 25

// 构建期样例值：只用于渲染后字数检查，不会出现在运行时。
const SAMPLE_VALUES: TemplateValues = {
  对象称呼: '朋友',
  事由: '临时有事',
  日期: '下周一',
  补救动作: '尽快补上',
}

const toneKindById = new Map(DOCUMENT_TONES.map((tone) => [tone.id, tone.kind]))

export function cellKey(cell: DocumentCell): string {
  return `${cell.type}/${cell.scene}/${cell.audience}/${cell.tone}`
}

export function lintDocumentTemplates(
  templates: readonly DocumentTemplate[],
  enabledCells: readonly DocumentCell[],
): readonly DocumentLintIssue[] {
  const issues: DocumentLintIssue[] = []
  const seenIds = new Set<string>()

  for (const template of templates) {
    if (seenIds.has(template.id)) {
      issues.push({ code: 'duplicate-id', id: template.id, message: `重复 id：${template.id}` })
    }
    seenIds.add(template.id)

    const expectedKind = toneKindById.get(template.tone)
    if (!expectedKind || expectedKind !== template.kind) {
      issues.push({
        code: 'kind-mismatch',
        id: template.id,
        message: `语气 ${template.tone} 的 kind 必须是 ${expectedKind ?? '已登记语气'}`,
      })
    }

    const [first, second] = template.reviewedBy
    if (!first?.trim() || !second?.trim() || first === second) {
      issues.push({
        code: 'missing-review',
        id: template.id,
        message: '需要两个不同的审核人标识',
      })
    }

    const variables = listTemplateVariables(template.text)
    const unknown = variables.filter((name) => !ALLOWED_DOCUMENT_VARIABLES.includes(name as never))
    if (unknown.length > 0) {
      issues.push({
        code: 'unknown-variable',
        id: template.id,
        message: `未知变量：${unknown.join('、')}`,
      })
    }

    try {
      const rendered = renderOptionalTemplate(template.text, SAMPLE_VALUES)
      const length = codePointLength(rendered)
      if (length < RENDERED_TEXT_MIN || length > DOCUMENT_TEXT_MAX) {
        issues.push({
          code: 'length',
          id: template.id,
          message: `渲染后 ${length} 字，需在 ${RENDERED_TEXT_MIN}~${DOCUMENT_TEXT_MAX} 之间`,
        })
      }
    } catch {
      // 结构或变量问题已由上面的检查报告。
    }
  }

  const byCell = new Map<string, DocumentTemplate[]>()
  for (const template of templates) {
    const key = cellKey(template)
    byCell.set(key, [...(byCell.get(key) ?? []), template])
  }

  for (const cell of enabledCells) {
    const key = cellKey(cell)
    const group = byCell.get(key) ?? []
    if (group.length === 0) {
      issues.push({ code: 'missing-cell', id: key, message: `启用单元 ${key} 没有模板` })
      continue
    }
    const uniqueTexts = new Set(group.map((template) => template.text))
    if (group.length !== 3 || uniqueTexts.size !== group.length) {
      issues.push({
        code: 'candidate-count',
        id: key,
        message: `启用单元 ${key} 需要恰好 3 条互不重复的候选，现有 ${group.length} 条`,
      })
    }
  }

  return issues
}
