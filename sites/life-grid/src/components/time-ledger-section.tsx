import { useRef, useState } from 'react'
import { track } from '@viral/shared'
import { ageInYears, type LifeInput } from '../lib/life-math'
import { DEFAULT_HABITS, sameHabits, type HabitInput } from '../lib/time-ledger'
import { TimeLedgerForm } from './time-ledger-form'
import { TimeLedgerResult } from './time-ledger-result'

type Phase = 'closed' | 'editing' | 'result'

interface Props {
  life: LifeInput
}

export function TimeLedgerSection({ life }: Props) {
  const [phase, setPhase] = useState<Phase>('closed')
  const [habits, setHabits] = useState<HabitInput>(DEFAULT_HABITS)
  const [advanced, setAdvanced] = useState(false)
  const openedReported = useRef(false)
  const generatedReported = useRef(false)
  const currentAge = ageInYears(life.birth, life.today)

  if (phase === 'closed') {
    return (
      <button
        type="button"
        onClick={() => {
          if (!openedReported.current) {
            openedReported.current = true
            track('time_ledger_opened')
          }
          setPhase('editing')
        }}
        className="rounded-lg border border-dashed border-[#d9d2c0] py-3 text-sm text-[#6d675b]"
      >
        再看看，你的时间都去哪了
      </button>
    )
  }

  if (phase === 'editing') {
    return (
      <section className="flex flex-col gap-4" aria-label="时间都去哪了">
        <h2 className="font-serif-cn text-xl">时间都去哪了</h2>
        <TimeLedgerForm
          currentAge={currentAge}
          initial={habits}
          advanced={advanced}
          onSubmit={(next) => {
            const isFirst = !generatedReported.current
            if (isFirst) {
              generatedReported.current = true
              track('time_ledger_generated')
            } else if (!sameHabits(habits, next)) {
              track('habit_adjusted')
            }
            setHabits(next)
            setPhase('result')
          }}
        />
      </section>
    )
  }

  return (
    <TimeLedgerResult
      life={life}
      habits={habits}
      onEdit={() => {
        setAdvanced(true)
        setPhase('editing')
      }}
    />
  )
}
