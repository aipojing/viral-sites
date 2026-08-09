import type { ReactNode } from 'react'
import { formatDuration, formatMoney, hourlyEquivalent } from '../lib/pay-math'
import type { SalarySettings } from '../lib/settings'
import { todayPayState, type WorkStatus } from '../lib/work-schedule'

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

export interface TodayDashboardProps {
  settings: SalarySettings
  now: Date
  forceWorkday: boolean
  privacyMode: boolean
  onForceWorkday: () => void
  children?: ReactNode
}

const STATUS_HEADLINE: Record<Exclude<WorkStatus, 'off'>, string> = {
  before: '还没开始回本',
  working: '正在回本',
  break: '金额暂停中',
  after: '今天已回本',
}

export function TodayDashboard({
  settings,
  now,
  forceWorkday,
  privacyMode,
  onForceWorkday,
  children,
}: TodayDashboardProps) {
  const payState = todayPayState(settings, now, forceWorkday)
  const rate = hourlyEquivalent(settings)
  const earned = (payState.earnedMs / 3_600_000) * rate
  const remaining = (payState.remainingPaidMs / 3_600_000) * rate
  const amountClass = privacyMode ? 'st-privacy-blur' : ''

  const shiftEndMs =
    payState.intervals.length > 0 ? payState.intervals[payState.intervals.length - 1].endMs : null
  const countdown =
    (payState.status === 'working' || payState.status === 'break') && shiftEndMs !== null
      ? formatDuration(shiftEndMs - now.getTime())
      : null

  if (payState.status === 'off') {
    return (
      <section className="text-center" aria-label="今日面板">
        <h2 className="text-xl font-black">今天不替工资打工</h2>
        <p className="mt-2 text-sm text-[var(--st-ink-soft)]">今天是休息日，回本计算下次上班再继续。</p>
        <button type="button" className="st-btn mt-4" onClick={onForceWorkday}>
          今天也上班（临时班次）
        </button>
      </section>
    )
  }

  return (
    <section className="text-center" aria-label="今日面板">
      <p className="st-mono text-xs tracking-[0.25em] text-[var(--st-ink-soft)]">
        {STATUS_HEADLINE[payState.status]}
      </p>

      <p className={`st-mono mt-2 text-4xl font-black ${amountClass}`} aria-label="今日工资等值">
        {formatMoney(earned)}
      </p>

      {payState.status === 'before' && payState.nextBoundaryMs !== null && (
        <p className="mt-2 text-sm">距离今天开始回本还有 {formatDuration(payState.nextBoundaryMs - now.getTime())}</p>
      )}
      {countdown !== null && (
        <p className="mt-2 text-sm">
          离下班还有 {countdown}，还能回本{' '}
          <span className={`st-mono font-bold ${amountClass}`}>{formatMoney(remaining)}</span>
        </p>
      )}
      {payState.status === 'break' && (
        <p className="mt-1 text-xs text-[var(--st-ink-soft)]">现在在休息，不计入带薪时间，结束后金额继续。</p>
      )}
      {payState.status === 'after' && (
        <p className="mt-2 text-sm text-[var(--st-ink-soft)]">今天的班已经上完，金额不再增长。明天继续。</p>
      )}

      {children}

      <details className="mt-5 text-left">
        <summary className="cursor-pointer text-xs text-[var(--st-ink-soft)]">展开计算口径</summary>
        <dl className="st-mono mt-2 space-y-1 rounded border border-dashed border-[var(--st-line)] p-3 text-xs">
          <div className="flex justify-between">
            <dt>时薪等值（未取整）</dt>
            <dd className={amountClass}>{rate.toFixed(4)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>班次</dt>
            <dd>
              {settings.shiftStart}–{settings.shiftEnd}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>每日带薪</dt>
            <dd>{settings.paidHoursPerDay} 小时</dd>
          </div>
          <div className="flex justify-between">
            <dt>工作日</dt>
            <dd>{settings.workdays.map((day) => WEEKDAY_NAMES[day]).join('、')}</dd>
          </div>
        </dl>
      </details>
    </section>
  )
}
