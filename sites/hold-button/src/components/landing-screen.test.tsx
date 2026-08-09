import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LandingScreen } from './landing-screen'

describe('LandingScreen', () => {
  it('展示标题、说明与开始按钮', () => {
    render(<LandingScreen personalBest={0} challengeTarget={null} onStart={() => {}} />)
    expect(screen.getByRole('heading', { name: '按住不放挑战' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /按住开始/ })).toBeInTheDocument()
  })

  it('有最好成绩时展示本机纪录', () => {
    render(<LandingScreen personalBest={45_600} challengeTarget={null} onStart={() => {}} />)
    expect(screen.getByText(/本机纪录/)).toBeInTheDocument()
    expect(screen.getByText(/45\.6 秒/)).toBeInTheDocument()
  })

  it('带挑战目标时展示对方成绩', () => {
    render(<LandingScreen personalBest={0} challengeTarget={30_000} onStart={() => {}} />)
    expect(screen.getByText(/30\.0 秒/)).toBeInTheDocument()
    expect(screen.getByText(/你能按得比我久吗/)).toBeInTheDocument()
  })

  it('点击开始触发 onStart', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<LandingScreen personalBest={0} challengeTarget={null} onStart={onStart} />)
    await user.click(screen.getByRole('button', { name: /按住开始/ }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
