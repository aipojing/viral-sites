import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QUIZZES } from '../lib/questions'
import { QuizScreen } from './quiz-screen'

const QUESTIONS = QUIZZES.friend.questions

describe('QuizScreen', () => {
  it('先展示第 1 题与进度 1 / 10', () => {
    render(<QuizScreen questions={QUESTIONS} pen="blue" onAnswered={() => {}} onComplete={() => {}} />)
    expect(screen.getByText(QUESTIONS[0].text)).toBeInTheDocument()
    expect(screen.getByText('1 / 10')).toBeInTheDocument()
  })

  it('点选选项：回调题号并跳到下一题', async () => {
    const onAnswered = vi.fn()
    render(
      <QuizScreen questions={QUESTIONS} pen="blue" onAnswered={onAnswered} onComplete={() => {}} />,
    )
    await userEvent.click(screen.getByRole('button', { name: QUESTIONS[0].options[2] }))
    expect(onAnswered).toHaveBeenCalledWith(0)
    expect(screen.getByText(QUESTIONS[1].text)).toBeInTheDocument()
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
  })

  it('答完 10 题触发 onComplete，答案与点选一致', async () => {
    const onComplete = vi.fn()
    render(
      <QuizScreen questions={QUESTIONS} pen="red" onAnswered={() => {}} onComplete={onComplete} />,
    )
    for (let i = 0; i < 10; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: QUESTIONS[i].options[i % 4] }))
    }
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0]).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 1])
  })
})
