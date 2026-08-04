import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HomeScreen } from './home-screen'

describe('HomeScreen', () => {
  it('两个题库入口，点击回调对应 QuizId', async () => {
    const onPick = vi.fn()
    render(<HomeScreen linkInvalid={false} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /好友版/ }))
    expect(onPick).toHaveBeenCalledWith('friend')
    await userEvent.click(screen.getByRole('button', { name: /情侣版/ }))
    expect(onPick).toHaveBeenCalledWith('couple')
  })

  it('默认不显示失效提示', () => {
    render(<HomeScreen linkInvalid={false} onPick={() => {}} />)
    expect(screen.queryByText('链接失效了，重新发起一个吧')).not.toBeInTheDocument()
  })

  it('linkInvalid 时显示失效提示', () => {
    render(<HomeScreen linkInvalid={true} onPick={() => {}} />)
    expect(screen.getByText('链接失效了，重新发起一个吧')).toBeInTheDocument()
  })
})
