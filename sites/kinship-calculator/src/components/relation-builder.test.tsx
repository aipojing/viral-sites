import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RelationBuilder } from './relation-builder'

describe('RelationBuilder', () => {
  it('渲染面包屑与全部关系按钮', () => {
    render(<RelationBuilder path={['mother', 'older-brother']} onAdd={vi.fn()} onUndo={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByText('我')).toBeInTheDocument()
    const crumbs = document.querySelector('.kcc-builder__crumbs') as HTMLElement
    expect(within(crumbs).getByText('妈妈')).toBeInTheDocument()
    expect(within(crumbs).getByText('哥哥')).toBeInTheDocument()
    for (const label of ['爸爸', '丈夫', '妻子', '儿子', '女儿', '弟弟', '姐姐', '妹妹']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('点击关系按钮触发 onAdd，撤销与清空可用', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const onUndo = vi.fn()
    const onClear = vi.fn()
    render(<RelationBuilder path={['mother']} onAdd={onAdd} onUndo={onUndo} onClear={onClear} />)

    await user.click(screen.getByRole('button', { name: '女儿' }))
    expect(onAdd).toHaveBeenCalledWith('daughter')

    await user.click(screen.getByRole('button', { name: '撤销一级' }))
    expect(onUndo).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '清空重选' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('空路径时撤销与清空禁用，并显示引导语', () => {
    render(<RelationBuilder path={[]} onAdd={vi.fn()} onUndo={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByRole('button', { name: '撤销一级' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '清空重选' })).toBeDisabled()
    expect(screen.getByText('TA 是你的谁的谁？')).toBeInTheDocument()
  })

  it('达到 8 级上限时禁用关系按钮并提示', () => {
    const deep = ['father', 'father', 'father', 'father', 'father', 'father', 'father', 'father'] as const
    render(<RelationBuilder path={[...deep]} onAdd={vi.fn()} onUndo={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByRole('button', { name: '妈妈' })).toBeDisabled()
    expect(screen.getByText(/关系链最多 8 级/)).toBeInTheDocument()
  })
})
