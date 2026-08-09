import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import type { LifeInput } from './lib/life-math'
import { DEFAULT_HABITS } from './lib/time-ledger'
import { TimeLedgerForm } from './components/time-ledger-form'
import { TimeLedgerResult } from './components/time-ledger-result'
import { ResultScreen } from './components/result-screen'

const LIFE: LifeInput = { birth: new Date(1996, 7, 9), today: new Date(2026, 7, 9) }

describe('时间账本集成验收', () => {
  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    installAnalyticsSpy()
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
  })

  it('键盘可以完成整个表单：聚焦输入后回车提交', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TimeLedgerForm currentAge={30} initial={DEFAULT_HABITS} onSubmit={onSubmit} />)
    await user.click(screen.getByLabelText('平均每天睡眠（小时/天）'))
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('错误提示与输入同屏且可被辅助技术识别', async () => {
    const user = userEvent.setup()
    render(<TimeLedgerForm currentAge={30} initial={DEFAULT_HABITS} onSubmit={() => {}} />)
    const sleep = screen.getByLabelText('平均每天睡眠（小时/天）')
    await user.clear(sleep)
    await user.type(sleep, '99')
    await user.click(screen.getByRole('button', { name: '算算余生的时间账本' }))
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/平均每天睡眠/)
  })

  it('模块不改变第一张卡与主结论的顺序', () => {
    render(
      <ResultScreen input={LIFE} onRestart={() => {}}>
        <button>保存我的人生卡片</button>
      </ResultScreen>,
    )
    const summary = screen.getByTestId('life-summary')
    const firstCard = screen.getByRole('button', { name: '保存我的人生卡片' })
    const ledgerEntry = screen.getByRole('button', { name: '再看看，你的时间都去哪了' })
    expect(
      summary.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      firstCard.compareDocumentPosition(ledgerEntry) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('展示文案不含评判词', () => {
    render(<TimeLedgerResult life={LIFE} habits={DEFAULT_HABITS} onEdit={() => {}} />)
    const text = document.body.textContent ?? ''
    for (const banned of ['浪费', '毁掉', '不自律', '戒手机']) {
      expect(text, `文案不应包含「${banned}」`).not.toContain(banned)
    }
  })

  it('index.css 保留 prefers-reduced-motion 降级，避免被误删', () => {
    const css = readFileSync(path.join(__dirname, 'index.css'), 'utf8')
    expect(css).toContain('prefers-reduced-motion')
  })
})
