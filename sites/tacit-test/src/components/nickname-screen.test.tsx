import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NicknameScreen } from './nickname-screen'

function setup(onSubmit = vi.fn()) {
  render(
    <NicknameScreen heading="怎么称呼你" sub="写在挑战卡上" buttonLabel="出题" onSubmit={onSubmit} />,
  )
  return onSubmit
}

describe('NicknameScreen', () => {
  it('提交昵称（trim 后）', async () => {
    const onSubmit = setup()
    await userEvent.type(screen.getByLabelText('你的昵称'), ' 阿福 ')
    await userEvent.click(screen.getByRole('button', { name: '出题' }))
    expect(onSubmit).toHaveBeenCalledWith('阿福')
  })

  it('输入实时截断到 8 字', async () => {
    setup()
    const input = screen.getByLabelText('你的昵称')
    await userEvent.type(input, '一二三四五六七八九十')
    expect(input).toHaveValue('一二三四五六七八')
  })

  it('空昵称不提交并提示', async () => {
    const onSubmit = setup()
    await userEvent.click(screen.getByRole('button', { name: '出题' }))
    expect(screen.getByText('先留个称呼，好让对方知道你是谁')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('渲染 heading 与 sub', () => {
    setup()
    expect(screen.getByText('怎么称呼你')).toBeInTheDocument()
    expect(screen.getByText('写在挑战卡上')).toBeInTheDocument()
  })
})
