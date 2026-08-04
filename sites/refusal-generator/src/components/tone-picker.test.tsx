import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TonePicker } from './tone-picker'

describe('TonePicker', () => {
  it('渲染 5 个语气胶囊', () => {
    render(<TonePicker selected={null} onSelect={() => {}} />)
    for (const label of ['委婉体面', '直球硬刚', '发疯文学', '文言文', '职场黑话']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('点击回调语气 id', async () => {
    const onSelect = vi.fn()
    render(<TonePicker selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: '文言文' }))
    expect(onSelect).toHaveBeenCalledWith('wenyan')
  })

  it('选中态 aria-pressed', () => {
    render(<TonePicker selected="fafeng" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: '发疯文学' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
