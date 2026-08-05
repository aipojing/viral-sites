import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SceneGrid } from './scene-grid'

describe('SceneGrid', () => {
  it('渲染 8 个场景按钮 + 1 个自定义入口', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} onCustomSelect={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(9)
    expect(screen.getByRole('button', { name: /被借钱/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /被拉去团建/ })).toBeInTheDocument()
  })

  it('第九格是按钮而非 mailto 链接', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} onCustomSelect={() => {}} />)
    const custom = screen.getByRole('button', { name: /自己输入/ })
    expect(custom.tagName).toBe('BUTTON')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('点击场景回调其 id', async () => {
    const onSelect = vi.fn()
    render(<SceneGrid selected={null} onSelect={onSelect} onCustomSelect={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    expect(onSelect).toHaveBeenCalledWith('jieqian')
  })

  it('点击自定义入口回调 onCustomSelect', async () => {
    const onCustomSelect = vi.fn()
    render(<SceneGrid selected={null} onSelect={() => {}} onCustomSelect={onCustomSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /自己输入/ }))
    expect(onCustomSelect).toHaveBeenCalled()
  })

  it('选中态用 aria-pressed 标注', () => {
    render(<SceneGrid selected="jiaban" onSelect={() => {}} onCustomSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /被叫周末加班/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /被借钱/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('span=2 的场景 tile 带 col-span-2（Bento 节奏）', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} onCustomSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /被借钱/ }).className).toContain('col-span-2')
    expect(screen.getByRole('button', { name: /被拉群砍价/ }).className).not.toContain('col-span-2')
  })
})
