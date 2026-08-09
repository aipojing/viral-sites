import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DailySummary } from './daily-summary'
import type { FragmentResult } from '../lib/fragment'
import type { SalarySettings } from '../lib/settings'

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

const NOW = new Date(2026, 7, 10, 17) // 周一 17:00

function fragment(overrides: Partial<FragmentResult> = {}): FragmentResult {
  return {
    id: 'frag-x',
    scene: 'meeting',
    startedAtMs: new Date(2026, 7, 10, 10).getTime(),
    rateAtStart: 86.5385,
    paidIntervalsAtStart: [],
    settingsEffectiveFrom: '2026-08-10',
    endedAtMs: new Date(2026, 7, 10, 10, 10).getTime(),
    durationMs: 600_000,
    paidDurationMs: 600_000,
    equivalent: 14.42,
    ...overrides,
  }
}

function renderSummary(props: Partial<Parameters<typeof DailySummary>[0]> = {}) {
  return render(
    <DailySummary
      settings={settings()}
      now={NOW}
      fragments={[]}
      forceWorkday={false}
      privacyMode={false}
      onView={vi.fn()}
      {...props}
    />,
  )
}

describe('DailySummary', () => {
  it('按场景汇总带薪时长，不二次加总金额', async () => {
    const user = userEvent.setup()
    renderSummary({
      fragments: [
        fragment({ id: 'a', paidDurationMs: 600_000, equivalent: 14.42 }),
        fragment({ id: 'b', paidDurationMs: 300_000, equivalent: 7.21 }),
        fragment({ id: 'c', scene: 'toilet', paidDurationMs: 120_000, equivalent: 2.88 }),
      ],
    })

    await user.click(screen.getByText('今日小结'))
    // 两个开会片段合计 15 分，只展示时长分布
    const meetingRow = screen.getByText('开会').closest('div')
    expect(meetingRow).toHaveTextContent('15 分')
    expect(screen.getByText('带薪如厕').closest('div')).toHaveTextContent('2 分')
    expect(screen.queryByText('¥14.42')).not.toBeInTheDocument()
    expect(screen.queryByText('¥7.21')).not.toBeInTheDocument()
  })

  it('昨天的片段不计入今日分布', async () => {
    const user = userEvent.setup()
    renderSummary({
      fragments: [fragment({ endedAtMs: new Date(2026, 7, 9, 17).getTime() })],
    })
    await user.click(screen.getByText('今日小结'))
    expect(screen.getByText('今天还没有计价片段。')).toBeInTheDocument()
  })

  it('总等值默认隐藏，主动勾选后才显示；隐私模式下模糊', async () => {
    const user = userEvent.setup()
    renderSummary({ privacyMode: true })
    await user.click(screen.getByText('今日小结'))

    expect(screen.queryByLabelText('今日总等值')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: '显示今日总等值' }))
    expect(screen.getByLabelText('今日总等值')).toHaveClass('st-privacy-blur')
  })

  it('展开时回调 onView', async () => {
    const user = userEvent.setup()
    const onView = vi.fn()
    renderSummary({ onView })
    await user.click(screen.getByText('今日小结'))
    expect(onView).toHaveBeenCalledTimes(1)
  })

  it('自定义场景按用户标签展示', async () => {
    const user = userEvent.setup()
    renderSummary({
      fragments: [fragment({ scene: 'custom', customLabel: '等外卖' })],
    })
    await user.click(screen.getByText('今日小结'))
    expect(screen.getByText('等外卖')).toBeInTheDocument()
  })
})
