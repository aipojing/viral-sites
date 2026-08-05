import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomSceneForm } from './custom-scene-form'

describe('CustomSceneForm', () => {
  it('空输入报错', async () => {
    const onSubmit = vi.fn()
    render(<CustomSceneForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: '继续选语气' }))
    expect(screen.getByText('先写清楚你想拒绝什么')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('40 字限制：超出部分不进入提交值', async () => {
    const onSubmit = vi.fn()
    render(<CustomSceneForm onSubmit={onSubmit} />)
    await userEvent.type(
      screen.getByLabelText('描述你想拒绝的具体事情'),
      '事'.repeat(50),
    )
    await userEvent.click(screen.getByRole('button', { name: '继续选语气' }))
    expect(onSubmit).toHaveBeenCalledWith('事'.repeat(40))
  })

  it('有效提交：回传标准化文本并清错', async () => {
    const onSubmit = vi.fn()
    render(<CustomSceneForm onSubmit={onSubmit} />)
    await userEvent.type(
      screen.getByLabelText('描述你想拒绝的具体事情'),
      '  同事让我替他背锅  ',
    )
    await userEvent.click(screen.getByRole('button', { name: '继续选语气' }))
    expect(onSubmit).toHaveBeenCalledWith('同事让我替他背锅')
    expect(screen.queryByText('先写清楚你想拒绝什么')).not.toBeInTheDocument()
  })

  it('显示字数计数', () => {
    render(<CustomSceneForm initialValue="测试" onSubmit={() => {}} />)
    expect(screen.getByText('2/40')).toBeInTheDocument()
  })
})
