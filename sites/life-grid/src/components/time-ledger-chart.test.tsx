import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { allocateWeekCells, TimeLedgerChart } from './time-ledger-chart'

const WEEKLY = { sleep: 52.5, work: 40, commute: 7.5, necessary: 14, free: 54 }

describe('allocateWeekCells', () => {
  it('最大余数法分配后恰好 168 格', () => {
    const cells = allocateWeekCells(WEEKLY)
    const sum = Object.values(cells).reduce((a, b) => a + b, 0)
    expect(sum).toBe(168)
    expect(cells.sleep).toBe(53) // .5 余数按排序分配
    expect(cells.free).toBe(54)
  })

  it('整数小时直接对应格数', () => {
    const cells = allocateWeekCells({ sleep: 56, work: 40, commute: 0, necessary: 14, free: 58 })
    expect(cells).toEqual({ sleep: 56, work: 40, commute: 0, necessary: 14, free: 58 })
  })
})

describe('TimeLedgerChart', () => {
  it('始终渲染恰好 168 个格子', () => {
    render(<TimeLedgerChart weekly={WEEKLY} screenHoursPerWeek={null} />)
    expect(screen.getAllByTestId('ledger-cell')).toHaveLength(168)
  })

  it('每个格子有可读的类目标签', () => {
    render(<TimeLedgerChart weekly={WEEKLY} screenHoursPerWeek={null} />)
    expect(screen.getAllByLabelText(/睡眠/).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/自由时间/).length).toBeGreaterThan(0)
  })

  it('图例同时给出文字与每周小时数，颜色不是唯一编码', () => {
    render(<TimeLedgerChart weekly={WEEKLY} screenHoursPerWeek={null} />)
    expect(screen.getByText(/睡眠/)).toBeInTheDocument()
    expect(screen.getByText(/52\.5 小时\/周/)).toBeInTheDocument()
    expect(screen.getByText(/54 小时\/周/)).toBeInTheDocument()
  })

  it('屏幕时间用 data-overlay 表达，不新增格子', () => {
    render(<TimeLedgerChart weekly={WEEKLY} screenHoursPerWeek={42} />)
    expect(screen.getAllByTestId('ledger-cell')).toHaveLength(168)
    expect(screen.getByTestId('ledger-chart')).toHaveAttribute('data-overlay', 'true')
    render(<TimeLedgerChart weekly={WEEKLY} screenHoursPerWeek={null} />)
    expect(screen.getAllByTestId('ledger-chart').at(-1)).toHaveAttribute('data-overlay', 'false')
  })
})
