import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ChallengePayload } from '../lib/challenge-codec'
import { QUIZZES } from '../lib/questions'
import { CompareScreen } from './compare-screen'

const A = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
const B = [1, 1, 2, 3, 0, 1, 2, 3, 0, 2] // 8 题一致 → 80 分
const PAYLOAD: ChallengePayload = { v: 1, q: 'friend', n: '阿福', a: A }

function setup(onRestart = vi.fn()) {
  render(
    <CompareScreen
      payload={PAYLOAD}
      challengerName="小明"
      challengerAnswers={B}
      onRestart={onRestart}
    />,
  )
  return onRestart
}

describe('CompareScreen', () => {
  it('展示双方昵称、默契度大数字与称号', () => {
    setup()
    expect(screen.getByText('阿福')).toBeInTheDocument()
    expect(screen.getByText('小明')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('双向奔赴')).toBeInTheDocument()
  })

  it('逐题对比明细 10 行：一致行打钩，不一致行展示双方选项', () => {
    setup()
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    expect(screen.getAllByText('✓ 想到一起了')).toHaveLength(8)
    // 第 1 题不一致：双方选项原文都在
    expect(screen.getByText(new RegExp(QUIZZES.friend.questions[0].options[0]))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(QUIZZES.friend.questions[0].options[1]))).toBeInTheDocument()
  })

  it('保存对比卡按钮存在', () => {
    setup()
    expect(screen.getByRole('button', { name: '保存默契对比卡' })).toBeInTheDocument()
  })

  it('「我也要发起一个」触发 onRestart', async () => {
    const onRestart = setup()
    await userEvent.click(screen.getByRole('button', { name: '我也要发起一个' }))
    expect(onRestart).toHaveBeenCalled()
  })
})
