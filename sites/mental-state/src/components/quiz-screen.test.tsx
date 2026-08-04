import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { banWeiConfig } from '../config/ban-wei'
import { QuizScreen } from './quiz-screen'

describe('QuizScreen', () => {
  it('初始渲染第一题与进度「第 1 / 8 题」', () => {
    render(<QuizScreen config={banWeiConfig} onAnswer={() => {}} onFinish={() => {}} />)
    expect(screen.getByText(banWeiConfig.questions[0].text)).toBeInTheDocument()
    expect(screen.getByText('第 1 / 8 题')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('点选即跳下一题，进度更新，onAnswer 带题目下标', async () => {
    const onAnswer = vi.fn()
    render(<QuizScreen config={banWeiConfig} onAnswer={onAnswer} onFinish={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: banWeiConfig.questions[0].options[2].text }))
    expect(onAnswer).toHaveBeenCalledWith(0)
    expect(screen.getByText(banWeiConfig.questions[1].text)).toBeInTheDocument()
    expect(screen.getByText('第 2 / 8 题')).toBeInTheDocument()
  })

  it('答完 8 题触发 onFinish 且答案按序收集', async () => {
    const onFinish = vi.fn()
    render(<QuizScreen config={banWeiConfig} onAnswer={() => {}} onFinish={onFinish} />)
    const picks = [0, 1, 2, 3, 0, 1, 2, 3]
    for (const pick of picks) {
      const question = screen.getByText(/^.+？$/, { selector: 'h2' })
      expect(question).toBeInTheDocument()
      await userEvent.click(screen.getAllByRole('button')[pick])
    }
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledWith(picks)
  })

  it('答到最后一题前不触发 onFinish', async () => {
    const onFinish = vi.fn()
    render(<QuizScreen config={banWeiConfig} onAnswer={() => {}} onFinish={onFinish} />)
    for (let i = 0; i < 7; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    expect(onFinish).not.toHaveBeenCalled()
  })
})
