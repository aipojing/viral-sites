import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SalarySettings } from '../lib/settings'
import { TodayDashboard } from './today-dashboard'

function settings(overrides: Partial<SalarySettings> = {}): SalarySettings {
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
    ...overrides,
  }
}

function renderDashboard(props: Partial<React.ComponentProps<typeof TodayDashboard>> = {}) {
  return render(
    <TodayDashboard
      settings={settings()}
      now={new Date(2026, 7, 10, 10)}
      forceWorkday={false}
      privacyMode={false}
      onForceWorkday={vi.fn()}
      {...props}
    />,
  )
}

describe('TodayDashboard', () => {
  it('工作中：显示已赚等值、下班倒计时与剩余等值', () => {
    renderDashboard()
    expect(screen.getByText('正在回本')).toBeInTheDocument()
    // 10 点已工作 1 小时 → ¥86.54
    expect(screen.getByLabelText('今日工资等值')).toHaveTextContent('¥86.54')
    expect(screen.getByText(/离下班还有 8 小时 0 分/)).toBeInTheDocument()
  })

  it('上班前：显示距离开始回本的倒计时', () => {
    renderDashboard({ now: new Date(2026, 7, 10, 8, 30) })
    expect(screen.getByText('还没开始回本')).toBeInTheDocument()
    expect(screen.getByText(/距离今天开始回本还有 30 分/)).toBeInTheDocument()
  })

  it('午休：金额暂停并说明原因', () => {
    renderDashboard({ now: new Date(2026, 7, 10, 12, 30) })
    expect(screen.getByText('金额暂停中')).toBeInTheDocument()
    expect(screen.getByText(/现在在休息，不计入带薪时间/)).toBeInTheDocument()
    expect(screen.getByLabelText('今日工资等值')).toHaveTextContent('¥259.62') // 3 小时
  })

  it('下班后：金额封顶并提示明天继续', () => {
    renderDashboard({ now: new Date(2026, 7, 10, 19) })
    expect(screen.getByText('今天已回本')).toBeInTheDocument()
    expect(screen.getByLabelText('今日工资等值')).toHaveTextContent('¥692.31')
    expect(screen.getByText(/今天的班已经上完/)).toBeInTheDocument()
  })

  it('非工作日：提示休息并可开启临时班次', () => {
    const onForceWorkday = vi.fn()
    renderDashboard({ now: new Date(2026, 7, 9, 10), onForceWorkday })
    expect(screen.getByText('今天不替工资打工')).toBeInTheDocument()
  })

  it('非工作日点击临时班次后按正常班次计价', () => {
    renderDashboard({ now: new Date(2026, 7, 9, 10), forceWorkday: true })
    expect(screen.getByText('正在回本')).toBeInTheDocument()
  })

  it('隐私模式：金额元素加上模糊类', () => {
    renderDashboard({ privacyMode: true })
    expect(screen.getByLabelText('今日工资等值')).toHaveClass('st-privacy-blur')
  })

  it('正常模式：金额不带模糊类', () => {
    renderDashboard()
    expect(screen.getByLabelText('今日工资等值')).not.toHaveClass('st-privacy-blur')
  })

  it('口径展开区显示班次与带薪小时', () => {
    renderDashboard()
    expect(screen.getByText('展开计算口径')).toBeInTheDocument()
    expect(screen.getByText('09:00–18:00')).toBeInTheDocument()
    expect(screen.getByText('8 小时')).toBeInTheDocument()
  })
})
