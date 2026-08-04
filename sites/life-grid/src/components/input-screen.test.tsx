import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InputScreen } from './input-screen'

const TODAY = new Date(2026, 7, 4)

describe('InputScreen', () => {
  it('提交合法日期：onSubmit 拿到解析后的 LifeInput', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生日期'), '1996-08-04')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    const input = onSubmit.mock.calls[0][0]
    expect(input.birth.getFullYear()).toBe(1996)
    expect(input.expectancy).toBe(78)
  })

  it('未来日期：展示文案且不提交', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生日期'), '2030-01-01')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(screen.getByText('你还没出生，不用焦虑')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('超过 120 岁：展示文案且不提交', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生日期'), '1900-01-01')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(screen.getByText('恭喜您打破吉尼斯纪录')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('高级选项修改后随 onSubmit 带出', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生日期'), '1996-08-04')
    await userEvent.click(screen.getByText('高级选项'))
    const meetings = screen.getByLabelText('每年见父母次数')
    await userEvent.clear(meetings)
    await userEvent.type(meetings, '6')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(onSubmit.mock.calls[0][0].meetingsPerYear).toBe(6)
  })

  it('空日期提交无反应', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
