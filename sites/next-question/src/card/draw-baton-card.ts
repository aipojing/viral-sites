import type { DrawFn } from '@viral/shared'
import type { Slot } from '../../worker/types'
import { drawQrMatrix } from './qr-matrix'

const PAPER = '#faf6ee'
const INK = '#37302a'
const VERMILION = '#e63b2e'
const COBALT = '#2b59c3'
const FADED = '#8a8074'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

// 接棒邀请卡：不出现任何问题正文，避免私人内容随图片扩散。
export function makeBatonCardDraw(slot: Slot, url: string): DrawFn {
  return (ctx, size) => {
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.strokeStyle = VERMILION
    ctx.lineWidth = 6
    ctx.strokeRect(48, 48, size.width - 96, size.height - 96)

    ctx.textAlign = 'center'
    ctx.fillStyle = FADED
    ctx.font = `500 36px ${FONT}`
    ctx.fillText('下一问 · 六人问题接力', size.width / 2, 170)

    ctx.fillStyle = VERMILION
    ctx.font = `800 108px ${FONT}`
    ctx.fillText(`第 ${slot} / 6 棒`, size.width / 2, 420)

    ctx.fillStyle = INK
    ctx.font = `600 54px ${FONT}`
    ctx.fillText('上一棒给你留了一个问题', size.width / 2, 560)

    ctx.fillStyle = FADED
    ctx.font = `400 38px ${FONT}`
    ctx.fillText('回答它，再把下一问交给一个人', size.width / 2, 640)

    // 六枚印章路线：已走过的盖章，当前席位高亮
    const routeY = 750
    const startX = size.width / 2 - 300
    for (let seat = 1; seat <= 6; seat += 1) {
      const x = startX + (seat - 1) * 120
      ctx.beginPath()
      ctx.arc(x, routeY, seat === slot ? 34 : 24, 0, Math.PI * 2)
      if (seat < slot) {
        ctx.fillStyle = VERMILION
        ctx.fill()
      } else if (seat === slot) {
        ctx.fillStyle = COBALT
        ctx.fill()
      } else {
        ctx.strokeStyle = FADED
        ctx.lineWidth = 4
        ctx.stroke()
      }
    }

    drawQrMatrix(ctx, url, (size.width - 400) / 2, 840, 400, PAPER, INK)

    ctx.fillStyle = FADED
    ctx.font = `400 30px ${FONT}`
    ctx.fillText('怪好玩 · 下一问', size.width / 2, size.height - 110)
  }
}
