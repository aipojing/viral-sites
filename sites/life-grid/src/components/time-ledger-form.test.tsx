import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TimeLedgerForm } from './time-ledger-form'
import { DEFAULT_HABITS } from '../lib/time-ledger'

describe('TimeLedgerForm', () => {
  it('首轮只有 4 个输入，默认值来自常见值且标注可修改', () => {
    render(<TimeLedgerForm currentAge={30} initial={DEFAULT_HABITS} onSubmit={() => {}} />)
    expect(screen.getByLabelText('平均每天睡眠（小时/天）')).toHaveValue('7.5')
    expect(screen.getByLabelText('每周工作/上课（小时/周）')).toHaveValue('40')
    expect(screen.getByLabelText('每日往返通勤（小时/天）')).toHaveValue('1.5')
    expect(screen.getByLabelText(/屏幕时间（小时\/天，可不填）/)).toHaveValue('6')
    // 高级口径不在首轮出现
    expect(screen.queryByLabelText(/家务与必要事务/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/退休年龄/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/每周工作日/)).not.toBeInTheDocument()
    expect(screen.getByText(/常见值，可修改/)).toBeInTheDocument()
  })

  it('合法提交返回完整习惯（含隐藏的高级默认口径）', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TimeLedgerForm currentAge={30} initial={DEFAULT_HABITS} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    expect(onSubmit).toHaveBeenCalledWith({
      ...DEFAULT_HABITS,
      sleepHoursPerDay: 7.5,
    })
  })

  it('清空屏幕时间后以 undefined 提交', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TimeLedgerForm currentAge={30} initial={DEFAULT_HABITS} onSubmit={onSubmit} />)
    await user.clear(screen.getByLabelText(/屏幕时间（小时\/天，可不填）/))
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    expect(onSubmit.mock.calls[0][0].screenHoursPerDay).toBeUndefined()
  })

  it('非法输入显示字段级错误且不触发提交', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TimeLedgerForm currentAge={30} initial={DEFAULT_HABITS} onSubmit={onSubmit} />)
    const sleep = screen.getByLabelText('平均每天睡眠（小时/天）')
    await user.clear(sleep)
    await user.type(sleep, '25')
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/平均每天睡眠/)
  })

  it('总量溢出显示 weeklyTotal 错误且不触发提交', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const overflow = { ...DEFAULT_HABITS, workHoursPerWeek: 112, sleepHoursPerDay: 10 }
    render(<TimeLedgerForm currentAge={30} initial={overflow} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/超过了一周的 168 小时/)
  })

  it('advanced 模式显示高级口径并校验退休年龄不低于当前年龄', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <TimeLedgerForm currentAge={30} initial={DEFAULT_HABITS} onSubmit={onSubmit} advanced />,
    )
    expect(screen.getByLabelText(/家务与必要事务/)).toHaveValue('14')
    expect(screen.getByLabelText(/每周工作日/)).toHaveValue('5')
    const retirement = screen.getByLabelText(/退休年龄/)
    await user.clear(retirement)
    await user.type(retirement, '29')
    await user.click(screen.getByRole('button', { name: /算算余生的时间账本/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/退休年龄/)
  })
})
