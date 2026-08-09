import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LandingScreen } from './landing-screen'
import type { DraftV1 } from '../lib/draft-storage'

const DRAFT: DraftV1 = {
  version: 1,
  reportYear: 2026,
  currentQuestion: 3,
  answers: { keyword: '重启', place: '老家' },
  updatedAt: 0,
}

function setup(resume: DraftV1 | null) {
  const onStart = vi.fn()
  const onResume = vi.fn()
  const onDiscard = vi.fn()
  render(
    <LandingScreen
      year={2026}
      resume={resume}
      answeredCount={resume ? 2 : 0}
      onStart={onStart}
      onResume={onResume}
      onDiscard={onDiscard}
    />,
  )
  return { onStart, onResume, onDiscard }
}

describe('LandingScreen', () => {
  it('首屏说清耗时、存储位置与最终产物', () => {
    setup(null)
    expect(screen.getByText(/3 分钟/)).toBeInTheDocument()
    expect(screen.getByText(/只存在这台设备/)).toBeInTheDocument()
    expect(screen.getByText(/可保存的总结卡/)).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('「不保存草稿」是并列的正式入口', async () => {
    const user = userEvent.setup()
    const { onStart } = setup(null)

    await user.click(screen.getByRole('button', { name: /不保存草稿/ }))
    expect(onStart).toHaveBeenCalledWith(false)

    await user.click(screen.getByRole('button', { name: /本机保存草稿/ }))
    expect(onStart).toHaveBeenLastCalledWith(true)
  })

  it('没有草稿时不出现恢复入口', () => {
    setup(null)
    expect(screen.queryByRole('button', { name: '继续上次' })).not.toBeInTheDocument()
  })

  it('有草稿时可以继续或删掉重写', async () => {
    const user = userEvent.setup()
    const { onResume, onDiscard } = setup(DRAFT)

    expect(screen.getByText(/上次写到第 4 题/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '继续上次' }))
    expect(onResume).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: '删掉草稿重新写' }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })
})
