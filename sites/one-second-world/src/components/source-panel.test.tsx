import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeBaseFact } from '../lib/fact-lint'
import { SourcePanel } from './source-panel'

const heart = makeBaseFact({
  id: 'osw-self-heartbeat',
  title: '你的心脏跳动',
  value: 72,
  period: { unit: 'custom-seconds', seconds: 60 },
  outputUnit: '次',
  decimals: 1,
})

describe('SourcePanel', () => {
  it('展示发布机构、口径、发布/复核日期与外链', () => {
    render(<SourcePanel fact={heart} elapsedMs={60_000} onClose={() => {}} />)
    expect(screen.getByText('示例机构')).toBeInTheDocument()
    expect(screen.getByText(/2026-01-15/)).toBeInTheDocument()
    expect(screen.getByText(/复核于 2026-08-01/)).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /打开原始来源/ })
    expect(link).toHaveAttribute('href', 'https://example.gov.cn/report')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('换算式明确显示 原始值 ÷ 周期秒数 × 本次有效秒数', () => {
    render(<SourcePanel fact={heart} elapsedMs={60_000} onClose={() => {}} />)
    const formula = screen.getByText(/换算式/).textContent ?? ''
    expect(formula).toContain('72')
    expect(formula).toContain('÷ 60')
    expect(formula).toContain('× 60.0')
  })

  it('B 级徽章必须含「估算」文字，A 级不带', () => {
    const estimated = makeBaseFact({
      source: { ...heart.source, confidence: 'B' },
    })
    const { unmount } = render(<SourcePanel fact={estimated} elapsedMs={0} onClose={() => {}} />)
    expect(screen.getByText(/估算/)).toBeInTheDocument()
    unmount()

    render(<SourcePanel fact={heart} elapsedMs={0} onClose={() => {}} />)
    expect(screen.getByText('A 级来源')).toBeInTheDocument()
  })

  it('点击关闭按钮或按 Escape 都会关闭', () => {
    const onClose = vi.fn()
    render(<SourcePanel fact={heart} elapsedMs={0} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: '关闭来源面板' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
