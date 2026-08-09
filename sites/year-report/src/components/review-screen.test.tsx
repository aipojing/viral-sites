import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReviewScreen } from './review-screen'
import type { ReportAnswers } from '../lib/report-types'

const ANSWERS: ReportAnswers = {
  keyword: '重启',
  'hard-moment': '三月那通电话',
  'feeling-scale': 4,
  'goal-and-release': { completion: 60, release: '没考完的证' },
}

function setup(answers: ReportAnswers = ANSWERS) {
  const onEdit = vi.fn()
  const onClear = vi.fn()
  const onGenerate = vi.fn()
  render(
    <ReviewScreen year={2026} answers={answers} onEdit={onEdit} onClear={onClear} onGenerate={onGenerate} />,
  )
  return { onEdit, onClear, onGenerate }
}

describe('ReviewScreen', () => {
  it('十题逐条列出，跳过的题写明跳过而不是空白', () => {
    setup()
    expect(screen.getByText('重启')).toBeInTheDocument()
    expect(screen.getByText('三月那通电话')).toBeInTheDocument()
    expect(screen.getByText('偏轻松')).toBeInTheDocument()
    expect(screen.getByText('走到 60%；已经放下：没考完的证')).toBeInTheDocument()
    expect(screen.getAllByText('跳过了')).toHaveLength(6)
  })

  it('任一题都能重新编辑', async () => {
    const user = userEvent.setup()
    const { onEdit } = setup()

    await user.click(screen.getAllByRole('button', { name: '改一改' })[0]!)
    expect(onEdit).toHaveBeenCalledWith('keyword')
  })

  it('跳过的题显示「现在写」入口', async () => {
    const user = userEvent.setup()
    const { onEdit } = setup({ keyword: '重启' })

    await user.click(screen.getAllByRole('button', { name: '现在写' })[0]!)
    expect(onEdit).toHaveBeenCalledWith('place')
  })

  it('敏感条目可以直接删掉，删掉入口只出现在有答案的条目上', async () => {
    const user = userEvent.setup()
    const { onClear } = setup()

    const removeButtons = screen.getAllByRole('button', { name: '删掉这条' })
    expect(removeButtons).toHaveLength(4)
    await user.click(removeButtons[1]!)
    expect(onClear).toHaveBeenCalledWith('hard-moment')
  })

  it('确认后才生成报告', async () => {
    const user = userEvent.setup()
    const { onGenerate } = setup()

    await user.click(screen.getByRole('button', { name: '生成我的年度报告' }))
    expect(onGenerate).toHaveBeenCalledTimes(1)
  })
})
