import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RelationEntry } from '../data/relation-types'
import { ReverseSearch } from './reverse-search'

describe('ReverseSearch', () => {
  it('反查命中时列出全部可能关系，并统一标注「可能是」', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(entry: RelationEntry) => void>()
    render(<ReverseSearch onSelect={onSelect} />)

    await user.type(screen.getByLabelText(/输入一个称呼/), '表哥')
    await user.click(screen.getByRole('button', { name: '反查' }))

    const buttons = screen.getAllByRole('button').filter((button) =>
      button.className.includes('kcc-reverse__item'),
    )
    expect(buttons.length).toBe(3)
    expect(screen.getAllByText('可能是')).toHaveLength(3)
  })

  it('点击候选会把对应 entry 交给上层', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(entry: RelationEntry) => void>()
    render(<ReverseSearch onSelect={onSelect} />)

    await user.type(screen.getByLabelText(/输入一个称呼/), '姥姥')
    await user.click(screen.getByRole('button', { name: '反查' }))
    await user.click(screen.getByText('外婆'))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0].id).toBe('kc-maternal-grandmother')
  })

  it('无结果时提示改用关系链，不编造答案', async () => {
    const user = userEvent.setup()
    render(<ReverseSearch onSelect={vi.fn()} />)

    await user.type(screen.getByLabelText(/输入一个称呼/), '宇宙大王')
    await user.click(screen.getByRole('button', { name: '反查' }))

    expect(screen.getByRole('status')).toHaveTextContent('没找到完全匹配的称呼')
  })
})
