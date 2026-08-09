import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FragmentReceipt } from './fragment-receipt'
import type { FragmentResult } from '../lib/fragment'

function result(overrides: Partial<FragmentResult> = {}): FragmentResult {
  return {
    id: 'frag-1',
    scene: 'meeting',
    startedAtMs: new Date(2026, 7, 10, 10).getTime(),
    rateAtStart: 86.5385,
    paidIntervalsAtStart: [],
    settingsEffectiveFrom: '2026-08-10',
    endedAtMs: new Date(2026, 7, 10, 10, 30).getTime(),
    durationMs: 1_800_000,
    paidDurationMs: 1_800_000,
    equivalent: 43.27,
    ...overrides,
  }
}

describe('FragmentReceipt', () => {
  it('展示场景名、日期、时长、等值与克制锐评', () => {
    render(<FragmentReceipt result={result()} privacyMode={false} onDismiss={vi.fn()} />)
    expect(screen.getByLabelText('片段小票')).toBeInTheDocument()
    expect(screen.getByText('开会')).toBeInTheDocument()
    expect(screen.getByText('2026-08-10')).toBeInTheDocument()
    expect(screen.getByText(/30 分/)).toBeInTheDocument()
    expect(screen.getByText('¥43.27')).toBeInTheDocument()
    expect(screen.getByText('会议内容会忘，等值已经记下。')).toBeInTheDocument()
  })

  it('带薪时长与总时长不同时分开展示', () => {
    render(
      <FragmentReceipt
        result={result({ durationMs: 3_600_000, paidDurationMs: 1_800_000 })}
        privacyMode={false}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText('其中带薪')).toBeInTheDocument()
    expect(screen.getByText('1 小时 0 分')).toBeInTheDocument()
  })

  it('小票永不出现月薪与时薪数值', () => {
    const { container } = render(
      <FragmentReceipt
        result={result({ rateAtStart: 15_000 })}
        privacyMode={false}
        onDismiss={vi.fn()}
      />,
    )
    // 即使费率被设成月薪数值，卡面也不得展示它
    expect(container.textContent).not.toContain('15,000')
    expect(container.textContent).not.toContain('15000')
  })

  it('自定义场景展示用户标签，超长标签不破版', () => {
    render(
      <FragmentReceipt
        result={result({ scene: 'custom', customLabel: '一个非常非常长的自定义场景名字' })}
        privacyMode={false}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText('一个非常非常长的自定义场景名字')).toBeInTheDocument()
  })

  it('收起小票回调 onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<FragmentReceipt result={result()} privacyMode={false} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: '收起小票，继续下一段' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('出单使用打印动效类，隐私模式模糊等值', () => {
    render(<FragmentReceipt result={result()} privacyMode onDismiss={vi.fn()} />)
    expect(screen.getByLabelText('片段小票')).toHaveClass('st-printing')
    expect(screen.getByText('¥43.27')).toHaveClass('st-privacy-blur')
  })
})
