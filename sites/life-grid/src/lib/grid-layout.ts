export type CellState = 'past' | 'current' | 'future'

export interface GridCell {
  row: number
  col: number
  state: CellState
}

export interface GridLayout {
  rows: number
  cols: number
  cells: GridCell[]
}

export const GRID_COLS = 52

export function layoutLifeGrid(weeksLived: number, totalWeeks: number): GridLayout {
  const rows = Math.ceil(totalWeeks / GRID_COLS)
  const cells: GridCell[] = []
  for (let i = 0; i < totalWeeks; i += 1) {
    const state: CellState =
      i < weeksLived ? 'past' : i === weeksLived && weeksLived < totalWeeks ? 'current' : 'future'
    cells.push({ row: Math.floor(i / GRID_COLS), col: i % GRID_COLS, state })
  }
  return { rows, cols: GRID_COLS, cells }
}
