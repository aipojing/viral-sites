import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from './settings-panel'
import type { SalarySettings } from '../lib/settings'

const NOW = new Date(2026, 7, 10, 10)

function settings(): SalarySettings {
  return {
    version: 1,
    monthlySalary: 15_000,
    salaryBasis: 'net',
    workdays: [1, 2, 3, 4, 5],
    paidHoursPerDay: 8,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    lunchPaid: false,
    persistMode: 'local',
    effectiveFrom: '2026-08-10',
  }
}

describe('SettingsPanel', () => {
  it('预填当前口径', () => {
    render(<SettingsPanel now={NOW} settings={settings()} onSave={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByLabelText('月薪')).toHaveValue(15_000)
    expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument()
  })

  it('修改月薪后保存回调新设置', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<SettingsPanel now={NOW} settings={settings()} onSave={onSave} onClear={vi.fn()} />)

    const salaryInput = screen.getByLabelText('月薪')
    await user.clear(salaryInput)
    await user.type(salaryInput, '30000')
    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].monthlySalary).toBe(30_000)
  })

  it('清除需要二次确认，取消不触发', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(<SettingsPanel now={NOW} settings={settings()} onSave={vi.fn()} onClear={onClear} />)

    await user.click(screen.getByRole('button', { name: '清除本机数据' }))
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onClear).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '清除本机数据' }))
    await user.click(screen.getByRole('button', { name: '确定清除' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('提示修改设置不重算历史片段', () => {
    render(<SettingsPanel now={NOW} settings={settings()} onSave={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText(/历史片段保留当时的等值/)).toBeInTheDocument()
  })
})
