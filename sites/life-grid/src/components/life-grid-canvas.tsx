import { useEffect, useRef } from 'react'
import { GRID_COLS, layoutLifeGrid, type GridLayout } from '../lib/grid-layout'

export const GRID_COLORS = {
  bg: '#f7f4ec',
  past: '#8c8678',
  current: '#c8392b',
  future: '#d9d2c0',
} as const

const GAP = 2

interface Props {
  weeksLived: number
  totalWeeks: number
}

interface Geometry {
  cellSize: number
  width: number
  height: number
}

function geometryFor(layout: GridLayout, containerWidth: number): Geometry {
  const cellSize = Math.max(2, Math.floor((containerWidth - (layout.cols - 1) * GAP) / layout.cols))
  return {
    cellSize,
    width: layout.cols * (cellSize + GAP) - GAP,
    height: layout.rows * (cellSize + GAP) - GAP,
  }
}

function drawCells(
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  geo: Geometry,
  currentAlpha: number,
) {
  ctx.clearRect(0, 0, geo.width, geo.height)
  for (const cell of layout.cells) {
    const x = cell.col * (geo.cellSize + GAP)
    const y = cell.row * (geo.cellSize + GAP)
    if (cell.state === 'current') {
      ctx.globalAlpha = currentAlpha
      ctx.fillStyle = GRID_COLORS.current
    } else {
      ctx.globalAlpha = 1
      ctx.fillStyle = cell.state === 'past' ? GRID_COLORS.past : GRID_COLORS.future
    }
    ctx.fillRect(x, y, geo.cellSize, geo.cellSize)
  }
  ctx.globalAlpha = 1
}

export function LifeGridCanvas({ weeksLived, totalWeeks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const layout = layoutLifeGrid(weeksLived, totalWeeks)
    const containerWidth = canvas.parentElement?.clientWidth || 340
    const geo = geometryFor(layout, containerWidth)
    const dpr = window.devicePixelRatio || 1
    canvas.width = geo.width * dpr
    canvas.height = geo.height * dpr
    canvas.style.width = `${geo.width}px`
    canvas.style.height = `${geo.height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    drawCells(ctx, layout, geo, 1)

    const hasCurrent = layout.cells.some((c) => c.state === 'current')
    if (!hasCurrent) return

    let raf = 0
    let start: number | null = null
    const breathe = (t: number) => {
      if (start === null) start = t
      const alpha = 0.45 + 0.55 * Math.abs(Math.sin(((t - start) / 1800) * Math.PI))
      drawCells(ctx, layout, geo, alpha)
      raf = window.requestAnimationFrame(breathe)
    }
    raf = window.requestAnimationFrame(breathe)
    return () => window.cancelAnimationFrame(raf)
  }, [weeksLived, totalWeeks])

  return (
    <div className="w-full">
      <p className="mb-2 text-xs text-[#8c8678]">一格是一个星期，这就是你的一生</p>
      <canvas ref={canvasRef} aria-label="人生格子图" />
    </div>
  )
}
