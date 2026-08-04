import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { drawFortune } from '../lib/fortune-math'
import { FortuneView } from './fortune-view'

const FORTUNE = drawFortune('阿福', new Date(Date.UTC(2026, 7, 4, 4, 0)))

describe('FortuneView', () => {
  it('渲染等级大字、竖排签诗两行、宜忌与贵人小人', () => {
    render(<FortuneView fortune={FORTUNE} streak={1} isRepeat={false} onRestart={() => {}} />)
    expect(screen.getByText(FORTUNE.level)).toBeInTheDocument()
    expect(screen.getByText(FORTUNE.poem.lines[0])).toBeInTheDocument()
    expect(screen.getByText(FORTUNE.poem.lines[1])).toBeInTheDocument()
    for (const item of [...FORTUNE.yi, ...FORTUNE.ji]) {
      expect(screen.getByText(item.text)).toBeInTheDocument()
    }
    expect(screen.getByText(new RegExp(FORTUNE.guiren.text))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(FORTUNE.xiaoren.text))).toBeInTheDocument()
  })

  it('签诗容器使用竖排样式类', () => {
    render(<FortuneView fortune={FORTUNE} streak={1} isRepeat={false} onRestart={() => {}} />)
    expect(screen.getByLabelText('签诗')).toHaveClass('vertical-text')
  })

  it('streak 文案与虔诚印章：第 6 天无章，第 7 天有章', () => {
    const { rerender } = render(
      <FortuneView fortune={FORTUNE} streak={6} isRepeat={false} onRestart={() => {}} />,
    )
    expect(screen.getByText(/连续求签第 6 天/)).toBeInTheDocument()
    expect(screen.queryByText('虔诚')).not.toBeInTheDocument()
    rerender(<FortuneView fortune={FORTUNE} streak={7} isRepeat={false} onRestart={() => {}} />)
    expect(screen.getByText('虔诚')).toBeInTheDocument()
  })

  it('当天重复求签提示「心诚，一天一签」', () => {
    render(<FortuneView fortune={FORTUNE} streak={3} isRepeat={true} onRestart={() => {}} />)
    expect(screen.getByText('心诚，一天一签')).toBeInTheDocument()
  })

  it('首次求签不出现重复提示', () => {
    render(<FortuneView fortune={FORTUNE} streak={1} isRepeat={false} onRestart={() => {}} />)
    expect(screen.queryByText('心诚，一天一签')).not.toBeInTheDocument()
  })

  it('children 插槽渲染，回到签筒触发 onRestart', async () => {
    const onRestart = vi.fn()
    render(
      <FortuneView fortune={FORTUNE} streak={1} isRepeat={false} onRestart={onRestart}>
        <button>保存今日签</button>
      </FortuneView>,
    )
    expect(screen.getByText('保存今日签')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '回到签筒' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
