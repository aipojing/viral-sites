import { useMemo, useState, type FormEvent } from 'react'
import { shiftDurationMinutes, validateSettings, type SalaryBasis, type SalarySettings, type Weekday } from '../lib/settings'
import { localDateKey } from '../lib/time-local'

const WEEKDAY_LABELS: readonly { day: Weekday; label: string }[] = [
  { day: 1, label: '周一' },
  { day: 2, label: '周二' },
  { day: 3, label: '周三' },
  { day: 4, label: '周四' },
  { day: 5, label: '周五' },
  { day: 6, label: '周六' },
  { day: 0, label: '周日' },
]

export interface SetupScreenProps {
  now: Date
  initial?: SalarySettings
  submitLabel?: string
  onComplete: (settings: SalarySettings) => void
}

export function SetupScreen({ now, initial, submitLabel = '开始计价', onComplete }: SetupScreenProps) {
  const [salaryText, setSalaryText] = useState(initial ? String(initial.monthlySalary) : '')
  const [basis, setBasis] = useState<SalaryBasis>(initial?.salaryBasis ?? 'net')
  const [workdays, setWorkdays] = useState<readonly Weekday[]>(initial?.workdays ?? [1, 2, 3, 4, 5])
  const [shiftStart, setShiftStart] = useState(initial?.shiftStart ?? '09:00')
  const [shiftEnd, setShiftEnd] = useState(initial?.shiftEnd ?? '18:00')
  const [hasLunch, setHasLunch] = useState(initial ? Boolean(initial.lunchStart) : true)
  const [lunchStart, setLunchStart] = useState(initial?.lunchStart ?? '12:00')
  const [lunchEnd, setLunchEnd] = useState(initial?.lunchEnd ?? '13:00')
  const [lunchPaid, setLunchPaid] = useState(initial?.lunchPaid ?? false)
  const [persistMode, setPersistMode] = useState<'session' | 'local'>(initial?.persistMode ?? 'local')
  const [error, setError] = useState<string | null>(null)

  // 口径预览：由班次与午休推导出每日带薪小时，用户无需手算。
  const derivedPaidHours = useMemo(() => {
    try {
      const shiftMinutes = shiftDurationMinutes(shiftStart, shiftEnd)
      const unpaidLunch = hasLunch && !lunchPaid ? shiftDurationMinutes(lunchStart, lunchEnd) : 0
      const minutes = shiftMinutes - unpaidLunch
      if (minutes <= 0) return null
      return Math.round((minutes / 60) * 100) / 100
    } catch {
      return null
    }
  }, [shiftStart, shiftEnd, hasLunch, lunchStart, lunchEnd, lunchPaid])

  const toggleWeekday = (day: Weekday) => {
    setWorkdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (derivedPaidHours === null) {
      setError('班次和午休时间互相矛盾，请检查一下。')
      return
    }
    const raw = {
      version: 1,
      monthlySalary: Number(salaryText),
      salaryBasis: basis,
      workdays: [...workdays].sort((a, b) => a - b),
      paidHoursPerDay: derivedPaidHours,
      shiftStart,
      shiftEnd,
      ...(hasLunch ? { lunchStart, lunchEnd } : {}),
      lunchPaid,
      persistMode,
      effectiveFrom: localDateKey(now),
    }
    try {
      onComplete(validateSettings(raw))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '设置有问题，请检查一下。')
    }
  }

  return (
    <form className="text-left" onSubmit={handleSubmit} aria-label="工资计价设置">
      <p className="rounded bg-[var(--st-paper)] px-3 py-2 text-xs text-[var(--st-ink-soft)]">
        工资不会上传，全部只保存在你的浏览器里。
      </p>

      <label className="mt-5 block text-sm font-bold">
        月薪（{basis === 'gross' ? '税前' : '到手'}）
        <input
          className="st-mono mt-1 w-full rounded border border-[var(--st-line)] bg-white px-3 py-2 text-base"
          type="number"
          inputMode="decimal"
          step="any"
          value={salaryText}
          onChange={(event) => setSalaryText(event.target.value)}
          placeholder="例如 15000"
          aria-label="月薪"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold">工资口径</legend>
        <div className="mt-1 flex gap-2">
          {(
            [
              { value: 'net', label: '到手' },
              { value: 'gross', label: '税前' },
            ] as const
          ).map((option) => (
            <label key={option.value} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="salary-basis"
                value={option.value}
                checked={basis === option.value}
                onChange={() => setBasis(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-[var(--st-ink-soft)]">口径只影响标签，不做税务换算。</p>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold">每周工作日</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WEEKDAY_LABELS.map(({ day, label }) => {
            const selected = workdays.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                className={`rounded px-2.5 py-1.5 text-sm font-bold ${
                  selected
                    ? 'bg-[var(--st-ink)] text-[var(--st-receipt)]'
                    : 'border border-[var(--st-line)] text-[var(--st-ink-soft)]'
                }`}
                onClick={() => toggleWeekday(day)}
              >
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold">
          上班
          <input
            className="st-mono mt-1 w-full rounded border border-[var(--st-line)] bg-white px-3 py-2"
            type="time"
            value={shiftStart}
            onChange={(event) => setShiftStart(event.target.value)}
            aria-label="上班时间"
          />
        </label>
        <label className="block text-sm font-bold">
          下班
          <input
            className="st-mono mt-1 w-full rounded border border-[var(--st-line)] bg-white px-3 py-2"
            type="time"
            value={shiftEnd}
            onChange={(event) => setShiftEnd(event.target.value)}
            aria-label="下班时间"
          />
        </label>
      </div>

      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={hasLunch}
            onChange={(event) => setHasLunch(event.target.checked)}
          />
          有固定午休
        </label>
        {hasLunch && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="block text-sm">
              午休开始
              <input
                className="st-mono mt-1 w-full rounded border border-[var(--st-line)] bg-white px-3 py-2"
                type="time"
                value={lunchStart}
                onChange={(event) => setLunchStart(event.target.value)}
                aria-label="午休开始时间"
              />
            </label>
            <label className="block text-sm">
              午休结束
              <input
                className="st-mono mt-1 w-full rounded border border-[var(--st-line)] bg-white px-3 py-2"
                type="time"
                value={lunchEnd}
                onChange={(event) => setLunchEnd(event.target.value)}
                aria-label="午休结束时间"
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={lunchPaid}
                onChange={(event) => setLunchPaid(event.target.checked)}
              />
              午休计入带薪时间
            </label>
          </div>
        )}
      </div>

      <div className="st-mono mt-4 rounded border border-dashed border-[var(--st-line)] px-3 py-2 text-sm">
        口径预览：每天带薪 {derivedPaidHours === null ? '——' : `${derivedPaidHours} 小时`}，
        每周 {workdays.length} 天
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold">数据保存方式</legend>
        <div className="mt-1 flex flex-col gap-1 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="persist-mode"
              checked={persistMode === 'local'}
              onChange={() => setPersistMode('local')}
            />
            长期保存在本机
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="persist-mode"
              checked={persistMode === 'session'}
              onChange={() => setPersistMode('session')}
            />
            仅本次使用（关闭标签页即清除）
          </label>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-[var(--st-accent)]">
          {error}
        </p>
      )}

      <button type="submit" className="st-btn mt-5 w-full">
        {submitLabel}
      </button>
      <p className="mt-3 text-center text-xs text-[var(--st-ink-soft)]">
        这是时间等值，不是工资单、税务或劳动报酬结算。
      </p>
    </form>
  )
}
