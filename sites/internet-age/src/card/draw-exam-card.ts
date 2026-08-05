import { wrapByLength, type DrawFn, type TagsResult, type TestConfig } from '@viral/shared'

const PINK = '#FF3E9D'
const INK = '#333333'
const GREY = '#888888'
const TRACK = '#F0F0F0'
const WHITE = '#ffffff'
const BRAND_TEXT = '网感年龄测试 · viral-sites'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const RAINBOW: Array<[number, string]> = [
  [0, '#FF3E9D'],
  [0.22, '#FF9A3E'],
  [0.45, '#FFD500'],
  [0.7, '#00C48C'],
  [1, '#00AEEF'],
]

export function makeExamCardDraw(config: TestConfig, result: TagsResult): DrawFn {
  return (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, size.width, size.height)
    for (const [offset, color] of RAINBOW) gradient.addColorStop(offset, color)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size.width, size.height)

    const paper = { x: 60, y: 90, w: size.width - 120, h: 1180 }
    ctx.fillStyle = WHITE
    ctx.fillRect(paper.x, paper.y, paper.w, paper.h)
    ctx.lineWidth = 6
    ctx.strokeStyle = PINK
    ctx.strokeRect(paper.x, paper.y, paper.w, paper.h)

    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.font = `900 60px ${FONT}`
    ctx.fillText('互联网网感统一测试卷', size.width / 2, 200)
    ctx.fillStyle = GREY
    ctx.font = `400 30px ${FONT}`
    ctx.fillText('（满分 100 · 不设及格线 · 禁止代考）', size.width / 2, 252)

    ctx.fillStyle = INK
    ctx.font = `400 36px ${FONT}`
    ctx.fillText('你的精神网龄', size.width / 2, 340)
    ctx.fillStyle = PINK
    ctx.font = `900 220px ${FONT}`
    ctx.fillText(`${result.mentalAge}`, size.width / 2, 560)
    ctx.fillStyle = INK
    ctx.font = `900 44px ${FONT}`
    ctx.fillText(`岁 · 本卷判定：${result.dominant.title}`, size.width / 2, 640)

    ctx.textAlign = 'left'
    ctx.font = `900 34px ${FONT}`
    ctx.fillText('你的互联网成分', paper.x + 80, 730)
    const barX = paper.x + 300
    const barW = 460
    result.composition.forEach((share, i) => {
      const rowY = 775 + i * 70
      ctx.fillStyle = INK
      ctx.font = `400 30px ${FONT}`
      ctx.fillText(share.title, paper.x + 80, rowY + 26)
      ctx.fillStyle = TRACK
      ctx.fillRect(barX, rowY, barW, 34)
      ctx.fillStyle = share.barColor
      ctx.fillRect(barX, rowY, Math.round((barW * share.percent) / 100), 34)
      ctx.fillStyle = INK
      ctx.font = `900 30px ${FONT}`
      ctx.fillText(`${share.percent}%`, barX + barW + 20, rowY + 26)
    })

    ctx.fillStyle = INK
    ctx.font = `400 34px ${FONT}`
    let y = 1170
    for (const line of wrapByLength(result.comment, 24)) {
      ctx.fillText(line, paper.x + 80, y)
      y += 50
    }

    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.fillStyle = PINK
    ctx.textAlign = 'right'
    ctx.font = `400 28px ${FONT}`
    ctx.fillText('↘莂问硪湜谁↙', paper.x + paper.w - 30, paper.y + paper.h - 24)
    ctx.restore()

    ctx.fillStyle = PINK
    ctx.fillRect(0, size.height - 110, size.width, 110)
    ctx.fillStyle = WHITE
    ctx.textAlign = 'center'
    ctx.font = `700 40px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 42)
  }
}
