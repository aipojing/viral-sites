import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeBaseFact } from '../lib/fact-lint'
import { FactCard } from './fact-card'

const heart = makeBaseFact({
  id: 'osw-self-heartbeat',
  title: '你的心脏跳动',
  value: 72,
  period: { unit: 'custom-seconds', seconds: 60 },
  outputUnit: '次',
  decimals: 1,
})

const onShowSource = vi.fn()

describe('FactCard', () => {
  it('可见时随有效时间实时更新主数字', () => {
    const { rerender } = render(
      <FactCard fact={heart} elapsedMs={1_000} active onShowSource={onShowSource} />,
    )
    expect(screen.getByText('1.2 次')).toBeInTheDocument()

    rerender(<FactCard fact={heart} elapsedMs={2_000} active onShowSource={onShowSource} />)
    expect(screen.getByText('2.4 次')).toBeInTheDocument()
  })

  it('离开视口后定格在最后一次值，不随时间继续变化', () => {
    const { rerender } = render(
      <FactCard fact={heart} elapsedMs={2_000} active onShowSource={onShowSource} />,
    )
    rerender(<FactCard fact={heart} elapsedMs={9_000} active={false} onShowSource={onShowSource} />)
    expect(screen.getByText('2.4 次')).toBeInTheDocument()
    expect(screen.queryByText('10.8 次')).not.toBeInTheDocument()
  })

  it('小于一次的事件显示等待语义而不是分数个体', () => {
    const nev = makeBaseFact({
      id: 'osw-cn-nev',
      value: 16_626_000,
      period: { unit: 'year', referenceYear: 2025 },
      outputUnit: '辆',
    })
    render(<FactCard fact={nev} elapsedMs={0} active onShowSource={onShowSource} />)
    expect(screen.getByText(/平均还需 .* 秒/)).toBeInTheDocument()
  })

  it('B 级来源卡片必须带「估算」文字徽章', () => {
    const estimated = makeBaseFact({
      id: 'osw-cn-metro',
      source: { ...makeBaseFact().source, confidence: 'B' },
    })
    render(<FactCard fact={estimated} elapsedMs={1_000} active onShowSource={onShowSource} />)
    expect(screen.getByText('估算')).toBeInTheDocument()
  })

  it('点击查看来源会回传对应事实', () => {
    render(<FactCard fact={heart} elapsedMs={0} active onShowSource={onShowSource} />)
    fireEvent.click(screen.getByRole('button', { name: '查看数据来源' }))
    expect(onShowSource).toHaveBeenCalledWith(heart)
  })
})
