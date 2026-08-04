import type { DrawFn } from '@viral/shared'
import { pickCardLine } from '../lib/copy-lines'
import { layoutLifeGrid } from '../lib/grid-layout'
import type { LifeStats } from '../lib/life-math'
import { GRID_COLORS } from '../components/life-grid-canvas'

const BRAND_TEXT = '人生进度条 · viral-sites'

export function makeLifeCardDraw(stats: LifeStats): DrawFn {
  return (ctx, size) => {
    ctx.fillStyle = GRID_COLORS.bg
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#3a3833'
    ctx.font = '600 56px "Songti SC", "Noto Serif SC", serif'
    ctx.fillText('我的人生进度条', size.width / 2, 120)

    // 缩略格子：52 列，铺满中部区域
    const layout = layoutLifeGrid(stats.weeksLived, stats.totalWeeks)
    const gap = 2
    const gridWidth = 900
    const cell = Math.floor((gridWidth - (layout.cols - 1) * gap) / layout.cols)
    const originX = (size.width - (layout.cols * (cell + gap) - gap)) / 2
    const originY = 200
    for (const c of layout.cells) {
      ctx.fillStyle =
        c.state === 'current'
          ? GRID_COLORS.current
          : c.state === 'past'
            ? GRID_COLORS.past
            : GRID_COLORS.future
      ctx.fillRect(originX + c.col * (cell + gap), originY + c.row * (cell + gap), cell, cell)
    }

    const gridBottom = originY + layout.rows * (cell + gap)
    ctx.fillStyle = GRID_COLORS.current
    ctx.font = '700 120px -apple-system, sans-serif'
    ctx.fillText(`${stats.percent}%`, size.width / 2, gridBottom + 160)

    ctx.fillStyle = '#3a3833'
    ctx.font = '400 40px -apple-system, sans-serif'
    ctx.fillText(pickCardLine(stats), size.width / 2, gridBottom + 240)

    ctx.fillStyle = '#8c8678'
    ctx.font = '400 30px -apple-system, sans-serif'
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 60)
  }
}
