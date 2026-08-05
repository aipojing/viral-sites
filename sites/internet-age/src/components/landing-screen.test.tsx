import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { wangGanConfig } from '../config/wang-gan'
import { LandingScreen } from './landing-screen'

describe('LandingScreen', () => {
  it('渲染考卷抬头与挑衅文案', () => {
    render(<LandingScreen config={wangGanConfig} onStart={() => {}} />)
    expect(screen.getByRole('heading', { name: '网感年龄测试' })).toBeInTheDocument()
    expect(screen.getByText('互联网网感统一测试卷')).toBeInTheDocument()
    expect(screen.getByText(/你的精神网龄，可能比身份证大 20 岁/)).toBeInTheDocument()
  })

  it('火星文点缀存在且对读屏隐藏', () => {
    const { container } = render(<LandingScreen config={wangGanConfig} onStart={() => {}} />)
    const mars = container.querySelector('.mars-text')
    expect(mars).not.toBeNull()
    expect(mars).toHaveAttribute('aria-hidden', 'true')
  })

  it('点击开始触发 onStart', async () => {
    const onStart = vi.fn()
    render(<LandingScreen config={wangGanConfig} onStart={onStart} />)
    await userEvent.click(screen.getByRole('button', { name: '开始答卷' }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})
