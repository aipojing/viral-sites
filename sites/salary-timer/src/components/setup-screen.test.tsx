import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './setup-screen'
import type { SalarySettings } from '../lib/settings'

const NOW = new Date(2026, 7, 10, 10)

function renderSetup(onComplete = vi.fn()) {
  render(<SetupScreen now={NOW} onComplete={onComplete} />)
  return onComplete
}

describe('SetupScreen', () => {
  it('展示隐私承诺与口径预览（班次推导带薪小时）', () => {
    renderSetup()
    expect(screen.getByText(/工资不会上传/)).toBeInTheDocument()
    // 默认 9-18 午休 12-13 不带薪 → 8 小时
    expect(screen.getByText(/每天带薪 8 小时/)).toBeInTheDocument()
    expect(screen.getByText(/每周 5 天/)).toBeInTheDocument()
  })

  it('午休计入带薪时预览变为 9 小时', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByLabelText('午休计入带薪时间'))
    expect(screen.getByText(/每天带薪 9 小时/)).toBeInTheDocument()
  })

  it('提交合法设置时返回完整 SalarySettings', async () => {
    const user = userEvent.setup()
    const onComplete = renderSetup()

    await user.type(screen.getByLabelText('月薪'), '15000')
    await user.click(screen.getByRole('button', { name: '开始计价' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const settings: SalarySettings = onComplete.mock.calls[0][0]
    expect(settings.monthlySalary).toBe(15_000)
    expect(settings.salaryBasis).toBe('net')
    expect(settings.workdays).toEqual([1, 2, 3, 4, 5])
    expect(settings.paidHoursPerDay).toBe(8)
    expect(settings.lunchStart).toBe('12:00')
    expect(settings.persistMode).toBe('local')
    expect(settings.effectiveFrom).toBe('2026-08-10')
  })

  it('月薪未填写时提示错误且不回调', async () => {
    const user = userEvent.setup()
    const onComplete = renderSetup()
    await user.click(screen.getByRole('button', { name: '开始计价' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('月薪超上限时给出校验错误', async () => {
    const user = userEvent.setup()
    const onComplete = renderSetup()
    await user.type(screen.getByLabelText('月薪'), '20000000')
    await user.click(screen.getByRole('button', { name: '开始计价' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/超出上限/)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('工作日 chip 可切换，全选周日也能通过', async () => {
    const user = userEvent.setup()
    const onComplete = renderSetup()
    for (const label of ['周一', '周二', '周三', '周四', '周五']) {
      await user.click(screen.getByRole('button', { name: label }))
    }
    await user.click(screen.getByRole('button', { name: '周日' }))
    expect(screen.getByText(/每周 1 天/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('月薪'), '8000')
    await user.click(screen.getByRole('button', { name: '开始计价' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].workdays).toEqual([0])
  })

  it('仅本次使用写入 session 模式', async () => {
    const user = userEvent.setup()
    const onComplete = renderSetup()
    await user.click(screen.getByLabelText(/仅本次使用/))
    await user.type(screen.getByLabelText('月薪'), '9000')
    await user.click(screen.getByRole('button', { name: '开始计价' }))
    expect(onComplete.mock.calls[0][0].persistMode).toBe('session')
  })

  it('编辑既有设置时预填当前值', () => {
    const initial: SalarySettings = {
      version: 1,
      monthlySalary: 20_000,
      salaryBasis: 'gross',
      workdays: [1, 2, 3],
      paidHoursPerDay: 8,
      shiftStart: '10:00',
      shiftEnd: '19:00',
      lunchPaid: false,
      persistMode: 'session',
      effectiveFrom: '2026-08-01',
    }
    render(<SetupScreen now={NOW} initial={initial} submitLabel="保存设置" onComplete={vi.fn()} />)
    expect(screen.getByLabelText('月薪')).toHaveValue(20_000)
    expect(screen.getByLabelText(/^税前$/)).toBeChecked()
    expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument()
    expect(screen.getByText(/每天带薪 9 小时/)).toBeInTheDocument()
  })
})
