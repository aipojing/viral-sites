import { describe, expect, it } from 'vitest'
import { documentTemplatesSchema } from '../lib/document-schema'
import { lintDocumentTemplates } from '../lib/document-lint'
import { DOCUMENT_TEMPLATES, ENABLED_DOCUMENT_CELLS } from './document-templates'
import { DOCUMENT_AUDIENCES } from './document-audiences'
import { DOCUMENT_SCENES } from './document-scenes'
import { DOCUMENT_TONES } from './document-tones'
import { DOCUMENT_TYPES } from './document-types'

describe('文书内容库构建期 lint', () => {
  it('schema 校验通过（结构、长度、变量、tone-kind 绑定、审核标识）', () => {
    expect(() => documentTemplatesSchema.parse([...DOCUMENT_TEMPLATES])).not.toThrow()
  })

  it('启用矩阵每个单元恰好 3 条互不重复的候选', () => {
    expect(lintDocumentTemplates(DOCUMENT_TEMPLATES, ENABLED_DOCUMENT_CELLS)).toEqual([])
  })

  it('首发启用组合数 ≥60，模板数为组合数 ×3', () => {
    expect(ENABLED_DOCUMENT_CELLS.length).toBeGreaterThanOrEqual(60)
    expect(DOCUMENT_TEMPLATES).toHaveLength(ENABLED_DOCUMENT_CELLS.length * 3)
  })

  it('正式语气与玩梗语气硬分区，不出现混批单元', () => {
    const usableTones = new Set(DOCUMENT_TONES.filter((t) => t.kind === 'usable').map((t) => t.id))
    for (const cell of ENABLED_DOCUMENT_CELLS) {
      const isUsable = usableTones.has(cell.tone)
      const group = DOCUMENT_TEMPLATES.filter(
        (t) => t.type === cell.type && t.scene === cell.scene && t.audience === cell.audience && t.tone === cell.tone,
      )
      expect(group.every((t) => t.kind === (isUsable ? 'usable' : 'joke'))).toBe(true)
    }
  })

  it('枚举登记完整：2 类型、11 场景、6 对象、5 语气', () => {
    expect(DOCUMENT_TYPES.map((t) => t.id)).toEqual(['apology', 'leave'])
    expect(DOCUMENT_SCENES).toHaveLength(11)
    expect(DOCUMENT_AUDIENCES).toHaveLength(6)
    expect(DOCUMENT_TONES).toHaveLength(5)
  })

  it('启用矩阵只引用已登记枚举，且不出现「证明 / 公章 / 签名 / 诊断」字样', () => {
    const sceneIds = new Set(DOCUMENT_SCENES.map((s) => s.id))
    const audienceIds = new Set(DOCUMENT_AUDIENCES.map((a) => a.id))
    const toneIds = new Set(DOCUMENT_TONES.map((t) => t.id))
    for (const cell of ENABLED_DOCUMENT_CELLS) {
      expect(sceneIds.has(cell.scene)).toBe(true)
      expect(audienceIds.has(cell.audience)).toBe(true)
      expect(toneIds.has(cell.tone)).toBe(true)
    }
    for (const template of DOCUMENT_TEMPLATES) {
      expect(template.text).not.toMatch(/证明|公章|签名|诊断/)
    }
  })
})
