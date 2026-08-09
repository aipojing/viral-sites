import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LifeInput } from '../lib/life-math'
import { TimeLedgerSection } from './time-ledger-section'

const LIFE: LifeInput = { birth: new Date(1996, 7, 9), today: new Date(2026, 7, 9) }

describe('TimeLedgerSection', () => {
  let track: ReturnType<typeof installAnalyticsSpy>

  beforeEach(() => {
    track = installAnalyticsSpy()
  })

  afterEach(() => removeAnalyticsSpy())

  it('默认折叠，只显示入口按钮', () => {
    render(<TimeLedgerSection life={LIFE} />)
    expect(screen.getByRole('button', { name: '再看看，你的时间都去哪了' })).toBeInTheDocument()
    expect(screen.queryByLabelText('平均每天睡眠（小时/天）')).not.toBeInTheDocument()
    expect(track).not.toHaveBeenCalled()
  })

  it('点击入口展开首轮表单，time_ledger_opened 只触发一次', async () => {
    const user = userEvent.setup()
    render(<TimeLedgerSection life={LIFE} />)
    await user.click(screen.getByRole('button', { name: '再看看，你的时间都去哪了' }))
    expect(screen.getByLabelText('平均每天睡眠（小时/天）')).toBeInTheDocument()
    expect(track).toHaveBeenCalledWith('time_ledger_opened', undefined)
    // 展开后入口消失，不会重复上报 opened
    expect(
      screen.queryByRole('button', { name: '再看看，你的时间都去哪了' }),
    ).not.toBeInTheDocument()
    expect(track.mock.calls.filter(([event]) => event === 'time_ledger_opened')).toHaveLength(1)
  })

  it('合法提交进入结果，time_ledger_generated 只触发一次且不带任何习惯数据', async () => {
    const user = userEvent.setup()
    render(<TimeLedgerSection life={LIFE} />)
    await user.click(screen.getByRole('button', { name: '再看看，你的时间都去哪了' }))
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    expect(screen.getByText(/属于自由时间/)).toBeInTheDocument()
    const generated = track.mock.calls.filter(([event]) => event === 'time_ledger_generated')
    expect(generated).toHaveLength(1)
    expect(generated[0][1]).toBeUndefined()
  })

  it('总量溢出时不进入结果也不上报 generated', async () => {
    const user = userEvent.setup()
    render(<TimeLedgerSection life={LIFE} />)
    await user.click(screen.getByRole('button', { name: '再看看，你的时间都去哪了' }))
    const work = screen.getByLabelText('每周工作/上课（小时/周）')
    await user.clear(work)
    await user.type(work, '112')
    const sleep = screen.getByLabelText('平均每天睡眠（小时/天）')
    await user.clear(sleep)
    await user.type(sleep, '10')
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/属于自由时间/)).not.toBeInTheDocument()
    expect(track.mock.calls.some(([event]) => event === 'time_ledger_generated')).toBe(false)
  })

  it('调整口径返回原值表单，修改后提交记录 habit_adjusted 且不带数据', async () => {
    const user = userEvent.setup()
    render(<TimeLedgerSection life={LIFE} />)
    await user.click(screen.getByRole('button', { name: '再看看，你的时间都去哪了' }))
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    await user.click(screen.getByRole('button', { name: '调整口径' }))
    // 表单回填原值，并显示高级口径
    expect(screen.getByLabelText('平均每天睡眠（小时/天）')).toHaveValue('7.5')
    expect(screen.getByLabelText(/退休年龄/)).toBeInTheDocument()
    const sleep = screen.getByLabelText('平均每天睡眠（小时/天）')
    await user.clear(sleep)
    await user.type(sleep, '8')
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    const adjusted = track.mock.calls.filter(([event]) => event === 'habit_adjusted')
    expect(adjusted).toHaveLength(1)
    expect(adjusted[0][1]).toBeUndefined()
  })

  it('调整口径但数字未变时不上报 habit_adjusted', async () => {
    const user = userEvent.setup()
    render(<TimeLedgerSection life={LIFE} />)
    await user.click(screen.getByRole('button', { name: '再看看，你的时间都去哪了' }))
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    await user.click(screen.getByRole('button', { name: '调整口径' }))
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    expect(track.mock.calls.some(([event]) => event === 'habit_adjusted')).toBe(false)
  })
})
