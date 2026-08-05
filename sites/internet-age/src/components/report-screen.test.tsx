import { computeTagsResult } from '@viral/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { wangGanConfig } from '../config/wang-gan'
import { ReportScreen } from './report-screen'

const result = computeTagsResult(wangGanConfig, [0, 0, 0, 0, 0, 0, 0, 0])

describe('ReportScreen', () => {
  it('渲染精神网龄大数字与称号', () => {
    render(<ReportScreen config={wangGanConfig} result={result} onRestart={() => {}} />)
    expect(screen.getByText('34')).toBeInTheDocument()
    expect(screen.getByText('你的精神网龄')).toBeInTheDocument()
    expect(screen.getByText('本卷判定：QQ空间贵族')).toBeInTheDocument()
  })

  it('成分条形图与锐评齐全', () => {
    render(<ReportScreen config={wangGanConfig} result={result} onRestart={() => {}} />)
    expect(screen.getByTestId('bar-QQ空间贵族')).toBeInTheDocument()
    expect(screen.getByText(result.comment)).toBeInTheDocument()
  })

  it('children 插槽渲染，再考一次触发 onRestart', async () => {
    const onRestart = vi.fn()
    render(
      <ReportScreen config={wangGanConfig} result={result} onRestart={onRestart}>
        <button type="button">保存成绩单</button>
      </ReportScreen>,
    )
    expect(screen.getByRole('button', { name: '保存成绩单' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '再考一次' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
