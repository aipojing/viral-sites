import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy, type AnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'
import { STORAGE_KEY } from './lib/storage'

Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })

function presetData(overrides: Record<string, unknown> = {}): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      settings: {
        version: 1,
        monthlySalary: 15_000,
        salaryBasis: 'net',
        workdays: [1, 2, 3, 4, 5],
        paidHoursPerDay: 8,
        shiftStart: '09:00',
        shiftEnd: '18:00',
        lunchStart: '12:00',
        lunchEnd: '13:00',
        lunchPaid: false,
        persistMode: 'local',
        effectiveFrom: '2026-08-10',
      },
      fragments: [],
      firstVisitDate: '2026-08-10',
      activeDates: ['2026-08-10'],
      reportedReturnDays: [],
      ...overrides,
    }),
  )
}

describe('App', () => {
  let analyticsSpy: AnalyticsSpy

  beforeEach(() => {
    // 只 mock 系统时钟，保留真实 timers，避免与 userEvent 交互死锁
    vi.setSystemTime(new Date(2026, 7, 10, 10)) // 周一 10:00
    window.localStorage.clear()
    window.sessionStorage.clear()
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('未设置时只出现 30 秒设置流程和隐私承诺', () => {
    render(<App />)
    expect(screen.getByText('上班回本计算器')).toBeInTheDocument()
    expect(screen.getByText('30 秒完成设置，开始计价。')).toBeInTheDocument()
    expect(screen.getAllByText(/工资不会上传/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/不是工资单、税务或劳动报酬结算/).length).toBeGreaterThan(0)
  })

  it('完成设置后进入今日面板，并上报 setup_completed 与工厂标准 generate', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('月薪'), '15000')
    await user.click(screen.getByRole('button', { name: '开始计价' }))

    expect(screen.getByText('正在回本')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('setup_completed', { slug: 'salary-timer' })
    expect(analyticsSpy).toHaveBeenCalledWith('generate', { slug: 'salary-timer' })

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)
    expect(stored.settings.monthlySalary).toBe(15_000)
    expect(stored.firstVisitDate).toBe('2026-08-10')
  })

  it('已有设置时直达今日面板，金额按当前时间推导', () => {
    presetData()
    render(<App />)
    expect(screen.queryByText('30 秒完成设置，开始计价。')).not.toBeInTheDocument()
    expect(screen.getByText('正在回本')).toBeInTheDocument()
    expect(screen.getByLabelText('今日工资等值')).toHaveTextContent('¥86.54')
  })

  it('隐私模式立即模糊金额，恢复需要主动点击', async () => {
    const user = userEvent.setup()
    presetData()
    render(<App />)

    await user.click(screen.getByRole('switch', { name: /隐私模式/ }))
    expect(screen.getByLabelText('今日工资等值')).toHaveClass('st-privacy-blur')
    expect(analyticsSpy).toHaveBeenCalledWith('privacy_mode_used', { slug: 'salary-timer', enabled: 1 })

    await user.click(screen.getByRole('switch', { name: /金额已隐藏/ }))
    expect(screen.getByLabelText('今日工资等值')).not.toHaveClass('st-privacy-blur')
  })

  it('隐私状态刷新后仍保持隐藏（sessionStorage 独立 key）', async () => {
    const user = userEvent.setup()
    presetData()
    const first = render(<App />)
    await user.click(screen.getByRole('switch', { name: /隐私模式/ }))
    first.unmount()

    render(<App />)
    expect(screen.getByLabelText('今日工资等值')).toHaveClass('st-privacy-blur')
  })

  it('非工作日默认不累计，可开启一次性临时班次', async () => {
    const user = userEvent.setup()
    presetData()
    vi.setSystemTime(new Date(2026, 7, 9, 10)) // 周日

    render(<App />)
    expect(screen.getByText('今天不替工资打工')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /今天也上班/ }))
    expect(screen.getByText('正在回本')).toBeInTheDocument()
  })

  it('次日回访上报 D1，且只上报一次', () => {
    presetData({ firstVisitDate: '2026-08-09', activeDates: ['2026-08-09'] })
    vi.setSystemTime(new Date(2026, 7, 10, 10))

    const first = render(<App />)
    expect(analyticsSpy).toHaveBeenCalledWith('return_visit', { slug: 'salary-timer', day: 'D1' })
    first.unmount()

    render(<App />)
    const returnCalls = analyticsSpy.mock.calls.filter(([event]) => event === 'return_visit')
    expect(returnCalls).toHaveLength(1)
  })

  it('金额随时间推进更新，不依赖动画帧', () => {
    vi.useRealTimers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 10, 10))
    presetData()
    render(<App />)
    expect(screen.getByLabelText('今日工资等值')).toHaveTextContent('¥86.54')

    // advanceTimersByTime 会同步推进系统时钟：10:00 → 11:00；act 包裹让 React 处理 interval 的 setState
    act(() => {
      vi.advanceTimersByTime(3_600_000)
    })
    expect(screen.getByLabelText('今日工资等值')).toHaveTextContent('¥173.08')
  })

  // 以下片段流程测试需要推进时钟：用 fake timers + fireEvent（userEvent 与 fake timers 会死锁）
  it('开始并结束片段：埋点只带场景枚举与时长桶，片段持久化', () => {
    vi.useRealTimers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 10, 10))
    presetData()
    render(<App />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '开会' }))
    })
    expect(analyticsSpy).toHaveBeenCalledWith('scene_started', { slug: 'salary-timer', scene: 'meeting' })
    // 同一时间只能有一个片段：其他场景入口消失
    expect(screen.queryByRole('button', { name: '带薪如厕' })).not.toBeInTheDocument()

    // 推进 5 分钟：advanceTimersByTime 会同步推进系统时钟，不能再叠加 setSystemTime
    act(() => {
      vi.advanceTimersByTime(300_000)
    })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '结束并出小票' }))
    })
    expect(analyticsSpy).toHaveBeenCalledWith('scene_finished', {
      slug: 'salary-timer',
      scene: 'meeting',
      duration_bucket: '5to15m',
    })

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)
    expect(stored.fragments).toHaveLength(1)
    expect(stored.fragments[0].paidDurationMs).toBe(300_000)
    expect(screen.getByLabelText('片段小票')).toBeInTheDocument()
  })

  it('自定义场景埋点固定 custom，不携带任何文本', () => {
    vi.useRealTimers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 10, 10))
    presetData()
    render(<App />)

    act(() => {
      fireEvent.change(screen.getByLabelText('自定义场景名'), { target: { value: '等外卖' } })
      fireEvent.click(screen.getByLabelText('开始自定义计价'))
    })

    const call = analyticsSpy.mock.calls.find(([event]) => event === 'scene_started')
    expect(call?.[1]).toEqual({ slug: 'salary-timer', scene: 'custom' })
  })

  it('打开今日小结上报 daily_summary_viewed 且不带数值', async () => {
    const user = userEvent.setup()
    presetData()
    render(<App />)

    await user.click(screen.getByText('今日小结'))
    const calls = analyticsSpy.mock.calls.filter(([event]) => event === 'daily_summary_viewed')
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[0][1]).toEqual({ slug: 'salary-timer' })
  })

  it('修改设置不重算历史片段，保留当时费率', async () => {
    const user = userEvent.setup()
    const fragment = {
      id: 'frag-1',
      scene: 'meeting',
      startedAtMs: new Date(2026, 7, 10, 10).getTime(),
      rateAtStart: 50,
      paidIntervalsAtStart: [],
      settingsEffectiveFrom: '2026-08-10',
      endedAtMs: new Date(2026, 7, 10, 10, 10).getTime(),
      durationMs: 600_000,
      paidDurationMs: 600_000,
      equivalent: 8.33,
    }
    presetData({ fragments: [fragment] })
    render(<App />)

    await user.click(screen.getByRole('button', { name: '修改口径 / 清除数据' }))
    const salaryInput = screen.getByLabelText('月薪')
    await user.clear(salaryInput)
    await user.type(salaryInput, '30000')
    await user.click(screen.getByRole('button', { name: '保存设置' }))

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)
    expect(stored.settings.monthlySalary).toBe(30_000)
    expect(stored.fragments[0].rateAtStart).toBe(50)
    expect(stored.fragments[0].equivalent).toBe(8.33)
  })

  it('一键清除后回到设置屏并清空存储', async () => {
    const user = userEvent.setup()
    presetData()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '修改口径 / 清除数据' }))
    await user.click(screen.getByRole('button', { name: '清除本机数据' }))
    await user.click(screen.getByRole('button', { name: '确定清除' }))

    expect(screen.getByText('30 秒完成设置，开始计价。')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
