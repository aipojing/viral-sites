import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SceneTimer, liveEquivalent } from './scene-timer'
import { startFragment } from '../lib/fragment'
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

const NOW = new Date(2026, 7, 10, 10) // 周一 10:00

describe('SceneTimer', () => {
  it('展示四个内置场景与自定义入口', () => {
    render(<SceneTimer now={NOW} active={null} privacyMode={false} onStart={vi.fn()} onFinish={vi.fn()} />)
    for (const label of ['开会', '带薪如厕', '发呆', '排队']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByLabelText('自定义场景名')).toBeInTheDocument()
  })

  it('点击内置场景回调对应场景 id', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<SceneTimer now={NOW} active={null} privacyMode={false} onStart={onStart} onFinish={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '开会' }))
    expect(onStart).toHaveBeenCalledWith('meeting')
  })

  it('自定义标签为空时不能开始，输入后带标签回调', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<SceneTimer now={NOW} active={null} privacyMode={false} onStart={onStart} onFinish={vi.fn()} />)

    const submit = screen.getByLabelText('开始自定义计价')
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('自定义场景名'), '等外卖')
    await user.click(submit)
    expect(onStart).toHaveBeenCalledWith('custom', '等外卖')
  })

  it('片段进行中显示按事实推导的时长与等值，并可结束', async () => {
    const user = userEvent.setup()
    const onFinish = vi.fn()
    const active = startFragment('meeting', NOW, settings())
    const tenMinutesLater = new Date(2026, 7, 10, 10, 10)

    render(
      <SceneTimer now={tenMinutesLater} active={active} privacyMode={false} onStart={vi.fn()} onFinish={onFinish} />,
    )

    expect(screen.getByLabelText('片段持续时间')).toHaveTextContent('10 分')
    // 10 分钟 × 时薪等值 86.538… = 14.42
    expect(screen.getByLabelText('片段工资等值')).toHaveTextContent('¥14.42')
    expect(liveEquivalent(active, tenMinutesLater)).toBeCloseTo(14.423, 2)

    await user.click(screen.getByRole('button', { name: '结束并出小票' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('隐私模式模糊片段等值但不模糊时长', () => {
    const active = startFragment('meeting', NOW, settings())
    render(
      <SceneTimer
        now={new Date(2026, 7, 10, 10, 10)}
        active={active}
        privacyMode
        onStart={vi.fn()}
        onFinish={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('片段工资等值')).toHaveClass('st-privacy-blur')
    expect(screen.getByLabelText('片段持续时间')).not.toHaveClass('st-privacy-blur')
  })
})
