import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SceneGrid } from './scene-grid'

describe('SceneGrid', () => {
  it('渲染 8 个场景按钮', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(8)
    expect(screen.getByRole('button', { name: /被借钱/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /被拉去团建/ })).toBeInTheDocument()
  })

  it('第 9 格是 mailto 许愿入口', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} />)
    const wish = screen.getByRole('link', { name: /想拒绝别的/ })
    expect(wish.getAttribute('href')).toMatch(/^mailto:afu886\.cn@gmail\.com/)
  })

  it('点击场景回调其 id', async () => {
    const onSelect = vi.fn()
    render(<SceneGrid selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    expect(onSelect).toHaveBeenCalledWith('jieqian')
  })

  it('选中态用 aria-pressed 标注', () => {
    render(<SceneGrid selected="jiaban" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /被叫周末加班/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /被借钱/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('span=2 的场景 tile 带 col-span-2（Bento 节奏）', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /被借钱/ }).className).toContain('col-span-2')
    expect(screen.getByRole('button', { name: /被拉群砍价/ }).className).not.toContain('col-span-2')
  })
})
