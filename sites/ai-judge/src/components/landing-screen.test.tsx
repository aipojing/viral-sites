import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LandingScreen } from './landing-screen'

describe('LandingScreen', () => {
  it('昵称为空时不能升堂', async () => {
    const onSubmit = vi.fn()
    render(<LandingScreen onSubmit={onSubmit} />)
    const submit = screen.getByRole('button', { name: /升.*堂/ })
    expect(submit).toBeDisabled()
    await userEvent.click(submit)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('填写昵称后可提交，且只提交去除空白后的文本', async () => {
    const onSubmit = vi.fn()
    render(<LandingScreen onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/你的名号/), ' 阿福 ')
    await userEvent.type(screen.getByLabelText(/一句话自白/), ' 爱熬夜 ')
    await userEvent.click(screen.getByRole('button', { name: /升.*堂/ }))
    expect(onSubmit).toHaveBeenCalledWith('阿福', '爱熬夜')
  })

  it('昵称超过 12 个 code point 时禁止提交并提示', async () => {
    const onSubmit = vi.fn()
    render(<LandingScreen onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/你的名号/), '一二三四五六七八九十加再加') // 13cp
    expect(screen.getByText(/名号太长/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /升.*堂/ })).toBeDisabled()
  })

  it('emoji 按 code point 计数', async () => {
    render(<LandingScreen onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/你的名号/), '🐱🐱🐱')
    expect(screen.getByText('3/12')).toBeInTheDocument()
  })

  it('展示 AI 生成与免责声明', () => {
    render(<LandingScreen onSubmit={vi.fn()} />)
    expect(screen.getByText(/判词由 AI 生成，纯属玩梗/)).toBeInTheDocument()
    expect(screen.getByText(/发送至模型提供方/)).toBeInTheDocument()
  })
})
