import { computeResult } from '@viral/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { banWeiConfig } from '../config/ban-wei'
import { ReportScreen } from './report-screen'

const HIGH = computeResult(banWeiConfig, [3, 3, 3, 3, 3, 3, 3, 3])

describe('ReportScreen', () => {
  it('渲染浓度大数字与称号', () => {
    render(<ReportScreen config={banWeiConfig} result={HIGH} onRestart={() => {}} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('班味十级学者')).toBeInTheDocument()
  })

  it('渲染 3 条锐评与解药', () => {
    render(<ReportScreen config={banWeiConfig} result={HIGH} onRestart={() => {}} />)
    for (const comment of HIGH.tier.comments) {
      expect(screen.getByText(comment)).toBeInTheDocument()
    }
    expect(screen.getByText(HIGH.tier.remedy)).toBeInTheDocument()
  })

  it('公章「检测完毕」存在（签名元素）', () => {
    render(<ReportScreen config={banWeiConfig} result={HIGH} onRestart={() => {}} />)
    expect(screen.getByText('检测完毕')).toBeInTheDocument()
  })

  it('children 插槽渲染，再测一次触发 onRestart', async () => {
    const onRestart = vi.fn()
    render(
      <ReportScreen config={banWeiConfig} result={HIGH} onRestart={onRestart}>
        <button type="button">保存检测报告</button>
      </ReportScreen>,
    )
    expect(screen.getByRole('button', { name: '保存检测报告' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '再测一次' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
