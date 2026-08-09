import { useState } from 'react'
import { validateHabits, type HabitInput } from '../lib/time-ledger'

interface Props {
  currentAge: number
  initial: HabitInput
  onSubmit: (habits: HabitInput) => void
  /** 调整口径模式：额外显示工作日、必要事务与退休年龄 */
  advanced?: boolean
}

const toNum = (value: string) => (value.trim() === '' ? Number.NaN : Number(value))

export function TimeLedgerForm({ currentAge, initial, onSubmit, advanced = false }: Props) {
  const [sleep, setSleep] = useState(String(initial.sleepHoursPerDay))
  const [work, setWork] = useState(String(initial.workHoursPerWeek))
  const [commute, setCommute] = useState(String(initial.commuteHoursPerWorkday))
  const [screen, setScreen] = useState(
    initial.screenHoursPerDay === undefined ? '' : String(initial.screenHoursPerDay),
  )
  const [workdays, setWorkdays] = useState(String(initial.workdaysPerWeek))
  const [necessary, setNecessary] = useState(String(initial.necessaryHoursPerWeek))
  const [retirement, setRetirement] = useState(String(initial.retirementAge))
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const habits: HabitInput = {
      sleepHoursPerDay: toNum(sleep),
      workHoursPerWeek: toNum(work),
      commuteHoursPerWorkday: toNum(commute),
      workdaysPerWeek: toNum(workdays),
      necessaryHoursPerWeek: toNum(necessary),
      screenHoursPerDay: screen.trim() === '' ? undefined : Number(screen),
      retirementAge: toNum(retirement),
    }
    const check = validateHabits(habits, currentAge)
    if (!check.ok) {
      setError(check.reason)
      return
    }
    setError(null)
    onSubmit(habits)
  }

  const inputCls =
    'w-full rounded-md border border-[#d9d2c0] bg-transparent px-3 py-2 text-base'

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <p className="text-xs text-[#6d675b]">下面是常见值，可修改。所有计算都在本地完成。</p>
      <label className="flex flex-col gap-2 text-sm">
        平均每天睡眠（小时/天）
        <input
          inputMode="decimal"
          value={sleep}
          onChange={(e) => setSleep(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        每周工作/上课（小时/周）
        <input
          inputMode="decimal"
          value={work}
          onChange={(e) => setWork(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        每日往返通勤（小时/天）
        <input
          inputMode="decimal"
          value={commute}
          onChange={(e) => setCommute(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        屏幕时间（小时/天，可不填）
        <input
          inputMode="decimal"
          value={screen}
          onChange={(e) => setScreen(e.target.value)}
          className={inputCls}
        />
        <span className="text-xs text-[#6d675b]">不确定的话，可以去手机系统设置里看一眼屏幕使用时间。</span>
      </label>
      {advanced && (
        <>
          <label className="flex flex-col gap-2 text-sm">
            每周工作日（天）
            <input
              inputMode="decimal"
              value={workdays}
              onChange={(e) => setWorkdays(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            家务与必要事务（小时/周）
            <input
              inputMode="decimal"
              value={necessary}
              onChange={(e) => setNecessary(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            退休年龄（岁）
            <input
              inputMode="numeric"
              value={retirement}
              onChange={(e) => setRetirement(e.target.value)}
              className={inputCls}
            />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-[#c8392b]">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="rounded-lg bg-[#c8392b] py-3 font-medium text-[#f7f4ec]"
      >
        算算余生的时间账本
      </button>
    </form>
  )
}
