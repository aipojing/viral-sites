import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IntroScreen } from './intro-screen'

describe('IntroScreen', () => {
  it('首屏明确只计算看着页面的时间，并展示实时秒数', () => {
    render(<IntroScreen elapsedMs={3_200} />)
    expect(screen.getByText(/只计算你看着这个页面的时间/)).toBeInTheDocument()
    expect(screen.getByTestId('intro-clock')).toHaveTextContent('你看着这个页面 3 秒')
  })

  it('开始按钮滚动到第一章，reduced-motion 下不使用平滑滚动', () => {
    const target = document.createElement('section')
    target.id = 'osw-chapter-self'
    document.body.appendChild(target)
    const scrollIntoView = vi.fn()
    target.scrollIntoView = scrollIntoView

    try {
      render(<IntroScreen elapsedMs={0} />)
      fireEvent.click(screen.getByRole('button', { name: '开始看世界发生' }))
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      const options = scrollIntoView.mock.calls[0][0] as ScrollIntoViewOptions
      // jsdom matchMedia 默认不匹配 reduced-motion，走平滑滚动
      expect(options.behavior).toBe('smooth')
      expect(options.block).toBe('start')
    } finally {
      target.remove()
    }
  })
})
