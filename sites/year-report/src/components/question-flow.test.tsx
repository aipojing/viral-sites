import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { questionById } from '../content/questions'
import { QuestionFlow } from './question-flow'
import type { AnswerValue, QuestionId } from '../lib/report-types'

function setup(id: QuestionId, initialValue?: AnswerValue, index = 0) {
  const onSubmit = vi.fn()
  const onBack = vi.fn()
  render(
    <QuestionFlow
      question={questionById(id)}
      index={index}
      total={10}
      initialValue={initialValue}
      onSubmit={onSubmit}
      onBack={index > 0 ? onBack : null}
    />,
  )
  return { onSubmit, onBack }
}

describe('QuestionFlow', () => {
  it('显示进度、章节标题、题面与示例', () => {
    setup('song', undefined, 2)
    expect(screen.getByText('第 3 / 10 题')).toBeInTheDocument()
    expect(screen.getByText(/第二章/)).toBeInTheDocument()
    expect(screen.getByText('重复听得最多的一首歌')).toBeInTheDocument()
    expect(screen.getByText(/写歌名就行/)).toBeInTheDocument()
  })

  it('文本题：输入后继续提交原文', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup('song')

    await user.type(screen.getByRole('textbox'), '同一首歌')
    await user.click(screen.getByRole('button', { name: '继续' }))
    expect(onSubmit).toHaveBeenCalledWith('同一首歌')
  })

  it('超过题目上限的输入当场被截断', async () => {
    const user = userEvent.setup()
    setup('keyword')

    const input = screen.getByRole('textbox')
    await user.type(input, '一二三四五六七八九十')
    expect(input).toHaveValue('一二三四五六七八')
    expect(screen.getByText('8 / 8')).toBeInTheDocument()
  })

  it('关键词预设点一下就填进输入框', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup('keyword')

    await user.click(screen.getByRole('button', { name: '搬家' }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    expect(onSubmit).toHaveBeenCalledWith('搬家')
  })

  it('跳过与留空继续都提交 undefined', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup('hard-moment')

    await user.click(screen.getByRole('button', { name: '跳过这题' }))
    expect(onSubmit).toHaveBeenCalledWith(undefined)

    await user.click(screen.getByRole('button', { name: '继续' }))
    expect(onSubmit).toHaveBeenLastCalledWith(undefined)
  })

  it('艰难时刻带明确的可跳过说明，不追问细节', () => {
    setup('hard-moment')
    expect(screen.getByText(/不想写就跳过/)).toBeInTheDocument()
  })

  it('量表题选一档后提交对应数字', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup('feeling-scale')

    await user.click(screen.getByRole('button', { name: /偏轻松/ }))
    await user.click(screen.getByRole('button', { name: '继续' }))
    expect(onSubmit).toHaveBeenCalledWith(4)
  })

  it('目标题提交完成度与放下的事', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup('goal-and-release')

    await user.type(screen.getByRole('textbox'), '没考完的证')
    await user.click(screen.getByRole('button', { name: '继续' }))
    expect(onSubmit).toHaveBeenCalledWith({ completion: 50, release: '没考完的证' })
  })

  it('第一题没有上一题按钮，后面的题可以返回', async () => {
    const user = userEvent.setup()
    setup('keyword')
    expect(screen.queryByRole('button', { name: '上一题' })).not.toBeInTheDocument()

    const { onBack } = setup('song', undefined, 2)
    await user.click(screen.getByRole('button', { name: '上一题' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('返回修改时带出上次填的答案', () => {
    setup('song', '同一首歌', 2)
    expect(screen.getByRole('textbox')).toHaveValue('同一首歌')
  })
})
