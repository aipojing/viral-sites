import type { DrawFn } from '@viral/shared'
import type { Confidence } from '../data/relation-types'

export interface RelationCardData {
  label: string
  pathLabels: readonly string[]
  regionalLabel?: string
  confidence: Confidence
}

const BG = '#fdf6ec'
const RED = '#c8342b'
const RED_DEEP = '#9c241e'
const GOLD = '#e8b64c'
const INK = '#2a2019'
const PAPER_ON_RED = '#fff8ee'
const SANS = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

const NODES_PER_ROW = 4
const NODE_WIDTH = 150
const NODE_HEIGHT = 80
const ROW_GAP = 150

export const CONFIDENCE_CARD_TEXT: Record<Confidence, string> = {
  exact: '明确',
  regional: '有地域差异',
  insufficient: '关系信息不足',
}

export function chunkPathLabels(labels: readonly string[]): readonly (readonly string[])[] {
  const rows: string[][] = []
  for (let start = 0; start < labels.length; start += NODES_PER_ROW) {
    rows.push(labels.slice(start, start + NODES_PER_ROW) as string[])
  }
  return rows
}

/**
 * 1080×1440 年画称呼卡：族谱节点 + 箭头 + 文字三重呈现，不只靠颜色传达。
 * 卡片不出现任何姓名字段；未解析（空称呼/空链路）直接拒绝生成，不产生误导卡片。
 */
export function makeRelationCardDraw(data: RelationCardData): DrawFn {
  if (data.label.trim() === '') {
    throw new Error('未解析的称呼不能生成卡片')
  }
  if (data.pathLabels.length === 0) {
    throw new Error('关系链为空时不能生成卡片')
  }

  return (ctx, size) => {
    // 纸底 + 红框 + 金色内框
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.fillStyle = RED
    ctx.fillRect(40, 40, size.width - 80, size.height - 80)
    ctx.fillStyle = BG
    ctx.fillRect(58, 58, size.width - 116, size.height - 116)
    ctx.fillStyle = GOLD
    ctx.fillRect(78, 78, size.width - 156, 4)
    ctx.fillRect(78, size.height - 82, size.width - 156, 4)

    // 抬头
    ctx.textAlign = 'left'
    ctx.fillStyle = RED_DEEP
    ctx.font = `400 28px ${SANS}`
    ctx.fillText('亲戚称呼计算器', 110, 150)
    ctx.fillStyle = INK
    ctx.font = `700 56px ${SANS}`
    ctx.fillText('过年见面，该叫 TA 什么？', 110, 236)

    // 族谱路径：方块节点 + 连线箭头，每行最多 4 个，长链自动换行
    const nodes = ['我', ...data.pathLabels]
    const rows = chunkPathLabels(nodes)
    const pathTop = 320
    rows.forEach((row, rowIndex) => {
      const y = pathTop + rowIndex * ROW_GAP
      const startX = 110
      row.forEach((nodeLabel, nodeIndex) => {
        const x = startX + nodeIndex * 220
        ctx.fillStyle = nodeLabel === '我' ? GOLD : RED
        ctx.fillRect(x, y, NODE_WIDTH, NODE_HEIGHT)
        ctx.fillStyle = nodeLabel === '我' ? RED_DEEP : PAPER_ON_RED
        ctx.font = `700 44px ${SANS}`
        ctx.textAlign = 'center'
        ctx.fillText(nodeLabel, x + NODE_WIDTH / 2, y + NODE_HEIGHT / 2 + 16)
        if (nodeIndex < row.length - 1) {
          // 同行节点之间的箭头主体
          ctx.fillStyle = RED_DEEP
          ctx.fillRect(x + NODE_WIDTH + 12, y + NODE_HEIGHT / 2 - 3, 46, 6)
        }
        ctx.textAlign = 'left'
      })
    })

    // 中心称呼大字
    const answerTop = pathTop + rows.length * ROW_GAP + 40
    ctx.fillStyle = RED
    ctx.fillRect(110, answerTop, size.width - 220, 300)
    ctx.textAlign = 'center'
    ctx.fillStyle = GOLD
    ctx.font = `400 30px ${SANS}`
    ctx.fillText(data.regionalLabel ? '建议叫（普通话）' : '建议叫', size.width / 2, answerTop + 72)
    ctx.fillStyle = PAPER_ON_RED
    ctx.font = `800 110px ${SANS}`
    ctx.fillText(data.label, size.width / 2, answerTop + 210)

    // 地域叫法只放用户选中的那一个，不堆全部候选
    let metaY = answerTop + 360
    if (data.regionalLabel) {
      ctx.fillStyle = INK
      ctx.font = `600 40px ${SANS}`
      ctx.fillText(`我们这儿也叫：${data.regionalLabel}`, size.width / 2, metaY)
      metaY += 64
    }

    // 置信提示用文字标明，不靠颜色单独传达
    ctx.fillStyle = RED_DEEP
    ctx.font = `400 30px ${SANS}`
    ctx.fillText(`置信：${CONFIDENCE_CARD_TEXT[data.confidence]} · 称谓数据版本 v1`, size.width / 2, metaY)

    // 品牌条
    ctx.fillStyle = RED_DEEP
    ctx.font = `400 28px ${SANS}`
    ctx.fillText('亲戚称呼计算器 · 怪好玩', size.width / 2, size.height - 120)
    ctx.textAlign = 'left'
  }
}
