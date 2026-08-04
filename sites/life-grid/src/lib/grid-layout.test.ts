import { describe, expect, it } from 'vitest'
import { GRID_COLS, layoutLifeGrid } from './grid-layout'

describe('layoutLifeGrid', () => {
  it('104 周 = 2 行 52 列', () => {
    const g = layoutLifeGrid(0, 104)
    expect(g.rows).toBe(2)
    expect(g.cols).toBe(GRID_COLS)
    expect(g.cells).toHaveLength(104)
  })

  it('状态切分：过去/本周/未来', () => {
    const g = layoutLifeGrid(52, 104)
    expect(g.cells[51].state).toBe('past')
    expect(g.cells[52].state).toBe('current')
    expect(g.cells[53].state).toBe('future')
  })

  it('行列坐标正确', () => {
    const g = layoutLifeGrid(0, 104)
    expect(g.cells[0]).toMatchObject({ row: 0, col: 0 })
    expect(g.cells[52]).toMatchObject({ row: 1, col: 0 })
    expect(g.cells[103]).toMatchObject({ row: 1, col: 51 })
  })

  it('第 0 周：第一格是 current', () => {
    expect(layoutLifeGrid(0, 104).cells[0].state).toBe('current')
  })

  it('活过预期寿命：全部 past，无 current', () => {
    const g = layoutLifeGrid(120, 104)
    expect(g.cells.every((c) => c.state === 'past')).toBe(true)
  })
})
