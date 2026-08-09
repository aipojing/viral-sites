import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { LifeInput } from '../lib/life-math'
import { DEFAULT_HABITS } from '../lib/time-ledger'
import { TimeLedgerResult } from './time-ledger-result'

const LIFE: LifeInput = { birth: new Date(1996, 7, 9), today: new Date(2026, 7, 9) }

describe('TimeLedgerResult', () => {
  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
  })
  it('自由时间是第一视觉层', () => {
    render(<TimeLedgerResult life={LIFE} habits={DEFAULT_HABITS} onEdit={() => {}} />)
    expect(screen.getByText(/属于自由时间/)).toBeInTheDocument()
    expect(screen.getByText('20.5 年')).toBeInTheDocument()
  })

  it('五类账本同时显示余生年数与每周小时数', () => {
    render(<TimeLedgerResult life={LIFE} habits={DEFAULT_HABITS} onEdit={() => {}} />)
    expect(screen.getAllByText(/睡眠/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/工作/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/通勤/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/家务与必要事务/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/自由时间/).length).toBeGreaterThan(0)
    expect(screen.getByText(/52\.5 小时\/周/)).toBeInTheDocument()
    // 工作只投影到退休前：40h×1560周 ≈ 7.1 年
    expect(screen.getByText(/7\.1 年/)).toBeInTheDocument()
  })

  it('渲染 168 格周历', () => {
    render(<TimeLedgerResult life={LIFE} habits={DEFAULT_HABITS} onEdit={() => {}} />)
    expect(screen.getAllByTestId('ledger-cell')).toHaveLength(168)
  })

  it('填了屏幕时间时显示注意力旁账，并注明可能重叠', () => {
    render(
      <TimeLedgerResult life={LIFE} habits={{ ...DEFAULT_HABITS, screenHoursPerDay: 6 }} onEdit={() => {}} />,
    )
    expect(screen.getAllByText(/注意力旁账/).length).toBeGreaterThan(0)
    expect(screen.getByText(/可能与上面的时间重叠/)).toBeInTheDocument()
    expect(screen.getByText(/相当于余生约 12 年/)).toBeInTheDocument()
  })

  it('未填屏幕时间时不显示旁账', () => {
    render(
      <TimeLedgerResult
        life={LIFE}
        habits={{ ...DEFAULT_HABITS, screenHoursPerDay: undefined }}
        onEdit={() => {}}
      />,
    )
    expect(screen.queryByText(/注意力旁账/)).not.toBeInTheDocument()
  })

  it('点击调整口径触发 onEdit', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<TimeLedgerResult life={LIFE} habits={DEFAULT_HABITS} onEdit={onEdit} />)
    await user.click(screen.getByRole('button', { name: '调整口径' }))
    expect(onEdit).toHaveBeenCalled()
  })

  it('第二张卡保存入口在结果内，点击触发下载', async () => {
    const user = userEvent.setup()
    const analyticsSpy = installAnalyticsSpy()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<TimeLedgerResult life={LIFE} habits={DEFAULT_HABITS} onEdit={() => {}} />)
    await user.click(screen.getByRole('button', { name: '保存余生时间账单' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { card: 'time-ledger' })
  })
})
