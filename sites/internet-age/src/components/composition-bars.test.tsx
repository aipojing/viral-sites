import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TagShare } from '@viral/shared'
import { CompositionBars } from './composition-bars'

const composition: TagShare[] = [
  { tag: 'QQ空间贵族', title: 'QQ空间贵族', raw: 9, percent: 56, barColor: '#FF3E9D' },
  { tag: '贴吧遗老', title: '贴吧遗老', raw: 4, percent: 25, barColor: '#00AEEF' },
  { tag: '微博冲浪元老', title: '微博冲浪元老', raw: 3, percent: 19, barColor: '#FFD500' },
  { tag: '抽象人', title: '抽象人', raw: 0, percent: 0, barColor: '#9B51E0' },
  { tag: '小红书新贵', title: '小红书新贵', raw: 0, percent: 0, barColor: '#00C48C' },
]

describe('CompositionBars', () => {
  it('每维一行，称号与百分比齐全', () => {
    render(<CompositionBars composition={composition} />)
    for (const share of composition) {
      expect(screen.getByText(share.title)).toBeInTheDocument()
    }
    expect(screen.getByText('56%')).toBeInTheDocument()
    expect(screen.getAllByText('0%')).toHaveLength(2)
  })

  it('条宽与颜色由数据驱动', () => {
    render(<CompositionBars composition={composition} />)
    const bar = screen.getByTestId('bar-QQ空间贵族')
    expect(bar).toHaveStyle({ width: '56%' })
    expect(bar).toHaveStyle({ backgroundColor: '#FF3E9D' })
  })

  it('行序保持传入顺序（占比降序由计分层保证）', () => {
    render(<CompositionBars composition={composition} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('QQ空间贵族')
    expect(rows[4]).toHaveTextContent('小红书新贵')
  })
})
