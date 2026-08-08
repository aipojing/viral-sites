import type { DrawFn } from '@viral/shared'
import type { PublicChain } from '../../worker/types'
import { resultExcerpts } from '../lib/share'
import { drawQrMatrix } from './qr-matrix'

const PAPER = '#faf6ee'
const INK = '#37302a'
const VERMILION = '#e63b2e'
const FADED = '#8a8074'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

function formatDot(timestamp: number): string {
  const date = new Date(timestamp)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}.${month}.${day}`
}

// 闭环结果卡：六句摘录 + 闭环日期 + 完整问答页二维码（public URL，无 token）。
export function makeResultCardDraw(chain: PublicChain, publicUrl: string): DrawFn {
  const excerpts = resultExcerpts(chain)
  const names = chain.entries.slice(0, 6).map((entry) => (entry.redacted ? '（已撤回）' : entry.nickname))
  const dateLine = `${formatDot(chain.createdAt)} 出发 · ${formatDot(chain.updatedAt)} 闭环`

  return (ctx, size) => {
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.strokeStyle = VERMILION
    ctx.lineWidth = 6
    ctx.strokeRect(48, 48, size.width - 96, size.height - 96)

    ctx.textAlign = 'center'
    ctx.fillStyle = INK
    ctx.font = `700 48px ${FONT}`
    ctx.fillText('一个问题走过六个人，又回到了起点', size.width / 2, 180)

    ctx.fillStyle = FADED
    ctx.font = `400 28px ${FONT}`
    ctx.fillText(dateLine, size.width / 2, 250)

    ctx.textAlign = 'left'
    for (let index = 0; index < excerpts.length; index += 1) {
      const y = 360 + index * 108
      ctx.fillStyle = VERMILION
      ctx.font = `600 32px ${FONT}`
      ctx.fillText(names[index] ?? '', 120, y)
      ctx.fillStyle = INK
      ctx.font = `400 30px ${FONT}`
      ctx.fillText(excerpts[index] ?? '', 340, y)
    }

    drawQrMatrix(ctx, publicUrl, (size.width - 300) / 2, 1020, 300, PAPER, INK)

    ctx.textAlign = 'center'
    ctx.fillStyle = FADED
    ctx.font = `400 30px ${FONT}`
    ctx.fillText('怪好玩 · 下一问', size.width / 2, size.height - 100)
  }
}
