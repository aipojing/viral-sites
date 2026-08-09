import type { DrawFn } from '@viral/shared'
import { CHAPTER_META } from '../lib/chapters'
import type { SnapshotItem } from '../lib/snapshot'

export interface WorldSnapshotCardData {
  elapsedMs: number
  localTimeLabel: string
  items: readonly [SnapshotItem, SnapshotItem, SnapshotItem]
}

const BG = '#07090d'
const INK = '#f4f7fb'
const ACCENT = '#4c8dff'
const DIM = 'rgba(244, 247, 251, 0.55)'
const FAINT = 'rgba(244, 247, 251, 0.08)'
const SANS = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

/**
 * 1080×1440 深空网格快照卡：三条冻结事实、会话时长、本地时刻、品牌条与回站提示。
 * 卡片不放 URL 清单与来源标题，来源详情保留在页面来源面板；
 * 累计值小于 1 的 waiting 事实不允许进入卡片，避免制造虚假精度。
 */
export function makeWorldSnapshotCardDraw(data: WorldSnapshotCardData): DrawFn {
  const seconds = Math.floor(data.elapsedMs / 1000)
  for (const item of data.items) {
    if (item.display.kind !== 'count') {
      throw new Error('累计值小于 1 的事实不能进入快照卡')
    }
  }

  return (ctx, size) => {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, size.width, size.height)

    // 瑞士网格：纵向基准线
    ctx.fillStyle = FAINT
    for (let x = 80; x < size.width; x += 230) {
      ctx.fillRect(x, 80, 1, size.height - 160)
    }

    ctx.textAlign = 'left'
    ctx.fillStyle = DIM
    ctx.font = `400 28px ${SANS}`
    ctx.fillText('THE WORLD IN ONE SECOND', 80, 130)

    ctx.fillStyle = INK
    ctx.font = `700 68px ${SANS}`
    ctx.fillText(`我在这里的 ${seconds} 秒`, 80, 230)
    ctx.fillText('世界发生了什么', 80, 316)

    data.items.forEach((item, index) => {
      const baseY = 440 + index * 250
      ctx.fillStyle = DIM
      ctx.font = `400 26px ${SANS}`
      ctx.fillText(`0${index + 1} · ${CHAPTER_META[item.fact.chapter].title}`, 80, baseY)
      ctx.fillStyle = INK
      ctx.font = `600 40px ${SANS}`
      ctx.fillText(item.fact.title, 80, baseY + 56)
      ctx.fillStyle = ACCENT
      ctx.font = `700 64px ${SANS}`
      ctx.fillText(`约 ${item.display.text}`, 80, baseY + 148)
    })

    ctx.fillStyle = DIM
    ctx.font = `400 30px ${SANS}`
    ctx.fillText(`${data.localTimeLabel} · 有效停留 ${seconds} 秒`, 80, 1230)
    ctx.fillText('每条数据的原始来源，见页面「查看数据来源」', 80, 1282)

    ctx.textAlign = 'center'
    ctx.fillStyle = DIM
    ctx.font = `400 28px ${SANS}`
    ctx.fillText('一秒钟世界 · 怪好玩', size.width / 2, 1380)
  }
}
