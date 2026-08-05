import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { wangGanConfig } from '../config/wang-gan'
import { QuizScreen } from './quiz-screen'

describe('QuizScreen', () => {
  it('初始渲染第一题与进度「第 1 题 / 共 8 题」', () => {
    render(<QuizScreen config={wangGanConfig} onAnswer={() => {}} onFinish={() => {}} />)
    expect(screen.getByText(wangGanConfig.questions[0].text)).toBeInTheDocument()
    expect(screen.getByText('第 1 题 / 共 8 题')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('点选即跳下一题，onAnswer 带题目下标', async () => {
    const onAnswer = vi.fn()
    render(<QuizScreen config={wangGanConfig} onAnswer={onAnswer} onFinish={() => {}} />)
    await userEvent.click(
      screen.getByRole('button', { name: wangGanConfig.questions[0].options[3].text }),
    )
    expect(onAnswer).toHaveBeenCalledWith(0)
    expect(screen.getByText(wangGanConfig.questions[1].text)).toBeInTheDocument()
    expect(screen.getByText('第 2 题 / 共 8 题')).toBeInTheDocument()
  })

  it('答完 8 题触发 onFinish 且答案按序收集', async () => {
    const onFinish = vi.fn()
    render(<QuizScreen config={wangGanConfig} onAnswer={() => {}} onFinish={onFinish} />)
    const picks = [0, 3, 1, 2, 0, 3, 1, 2]
    for (const pick of picks) {
      await userEvent.click(screen.getAllByRole('button')[pick])
    }
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledWith(picks)
  })

  it('答到最后一题前不触发 onFinish', async () => {
    const onFinish = vi.fn()
    render(<QuizScreen config={wangGanConfig} onAnswer={() => {}} onFinish={onFinish} />)
    for (let i = 0; i < 7; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    expect(onFinish).not.toHaveBeenCalled()
  })
})
