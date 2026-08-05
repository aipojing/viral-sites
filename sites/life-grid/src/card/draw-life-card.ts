import type { DrawFn } from '@viral/shared'
import { pickCardLine } from '../lib/copy-lines'
import type { LifeStats } from '../lib/life-math'
import { GRID_COLORS } from '../components/life-grid-canvas'

const BRAND_TEXT = '人生进度条 · viral-sites'

interface CardCell {
  row: number
  col: number
  state: 'past' | 'current' | 'future'
}

export function layoutLifeCardGrid(weeksLived: number, totalWeeks: number) {
  const rows = 52
  const cols = Math.ceil(totalWeeks / rows)
  const cells: CardCell[] = []
  for (let index = 0; index < totalWeeks; index += 1) {
    cells.push({
      row: index % rows,
      col: Math.floor(index / rows),
      state: index < weeksLived
        ? 'past'
        : index === weeksLived && weeksLived < totalWeeks
          ? 'current'
          : 'future',
    })
  }
  return { rows, cols, cells }
}

export function makeLifeCardDraw(stats: LifeStats): DrawFn {
  return (ctx, size) => {
    ctx.fillStyle = GRID_COLORS.bg
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#3a3833'
    ctx.font = '600 56px "Songti SC", "Noto Serif SC", serif'
    ctx.fillText('我的人生进度条', size.width / 2, 100)

    ctx.fillStyle = GRID_COLORS.current
    ctx.font = '700 120px -apple-system, sans-serif'
    ctx.fillText(`${stats.percent}%`, size.width / 2, 255)

    ctx.fillStyle = '#3a3833'
    ctx.font = '400 36px -apple-system, sans-serif'
    ctx.fillText('一格是一个星期', size.width / 2, 320)

    const layout = layoutLifeCardGrid(stats.weeksLived, stats.totalWeeks)
    const gap = 2
    const cell = Math.max(
      2,
      Math.floor(
        Math.min(
          (900 - (layout.cols - 1) * gap) / layout.cols,
          (620 - (layout.rows - 1) * gap) / layout.rows,
        ),
      ),
    )
    const gridWidth = layout.cols * cell + (layout.cols - 1) * gap
    const gridHeight = layout.rows * cell + (layout.rows - 1) * gap
    const originX = (size.width - gridWidth) / 2
    const originY = 390 + (620 - gridHeight) / 2

    for (const c of layout.cells) {
      ctx.fillStyle =
        c.state === 'current'
          ? GRID_COLORS.current
          : c.state === 'past'
            ? GRID_COLORS.past
            : GRID_COLORS.future
      ctx.fillRect(originX + c.col * (cell + gap), originY + c.row * (cell + gap), cell, cell)
    }

    ctx.fillStyle = '#3a3833'
    ctx.font = '400 40px -apple-system, sans-serif'
    ctx.fillText(pickCardLine(stats), size.width / 2, 1140)

    const blankLine = `剩下的 ${stats.blankWeeks.toLocaleString('en-US')} 个格子还是空白`
    ctx.fillText(blankLine, size.width / 2, 1210)

    ctx.fillStyle = '#6d675b'
    ctx.font = '400 30px -apple-system, sans-serif'
    ctx.fillText(BRAND_TEXT, size.width / 2, 1370)
  }
}
