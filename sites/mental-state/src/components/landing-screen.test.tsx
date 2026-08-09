import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { banWeiConfig } from '../config/ban-wei'
import { LandingScreen } from './landing-screen'

describe('LandingScreen', () => {
  it('渲染标题/副标题/挑衅文案', () => {
    render(<LandingScreen config={banWeiConfig} onStart={() => {}} />)
    expect(screen.getByRole('heading', { name: '班味浓度检测' })).toBeInTheDocument()
    expect(screen.getByText('测测你被工位腌入味了没')).toBeInTheDocument()
    expect(screen.getByText(/8 道题 · 60 秒/)).toBeInTheDocument()
    expect(screen.queryByText(/未在任何机构注册/)).not.toBeInTheDocument()
  })

  it('公章装饰存在（签名元素）', () => {
    render(<LandingScreen config={banWeiConfig} onStart={() => {}} />)
    expect(screen.getByText('检测专用章')).toBeInTheDocument()
  })

  it('点击开始触发 onStart', async () => {
    const onStart = vi.fn()
    render(<LandingScreen config={banWeiConfig} onStart={onStart} />)
    await userEvent.click(screen.getByRole('button', { name: '开始检测' }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})
