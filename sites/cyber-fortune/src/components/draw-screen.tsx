import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { loadNickname } from '../lib/storage'

const CHARGE_FULL_MS = 1200
const FALL_MS = 1500
const CHARGE_TICK_MS = 50
const MAX_NICKNAME_LEN = 12

type Phase = 'idle' | 'charging' | 'falling'

interface Props {
  onDraw: (nickname: string) => void
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export function DrawScreen({ onDraw }: Props) {
  const [nickname, setNickname] = useState(() => loadNickname() ?? '')
  const [phase, setPhase] = useState<Phase>('idle')
  const [charge, setCharge] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const chargeTimer = useRef<number | null>(null)
  const pressStart = useRef(0)

  useEffect(
    () => () => {
      if (chargeTimer.current !== null) window.clearInterval(chargeTimer.current)
    },
    [],
  )

  const startCharge = () => {
    if (phase !== 'idle') return
    if (!nickname.trim()) {
      setHint('先留个昵称，签才认得你')
      return
    }
    setHint(null)
    setPhase('charging')
    setCharge(0)
    pressStart.current = Date.now()
    chargeTimer.current = window.setInterval(() => {
      setCharge(Math.min(1, (Date.now() - pressStart.current) / CHARGE_FULL_MS))
    }, CHARGE_TICK_MS)
  }

  const release = () => {
    if (phase !== 'charging') return
    if (chargeTimer.current !== null) {
      window.clearInterval(chargeTimer.current)
      chargeTimer.current = null
    }
    setPhase('falling')
    const wait = prefersReducedMotion() ? 0 : FALL_MS
    window.setTimeout(() => onDraw(nickname.trim()), wait)
  }

  const isActivationKey = (key: string) => key === 'Enter' || key === ' '

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isActivationKey(event.key) || event.repeat) return
    event.preventDefault()
    startCharge()
  }

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isActivationKey(event.key)) return
    event.preventDefault()
    release()
  }

  return (
    <section className="flex flex-col items-center gap-6">
      <h1 className="font-serif-cn text-3xl">赛博求签</h1>
      <p className="text-center text-sm" style={{ color: 'var(--cf-ink-faded)' }}>
        打工人电子黄历。同名同天，签必相同。
      </p>
      <label className="flex w-full flex-col gap-2 text-sm">
        怎么称呼你
        <input
          type="text"
          value={nickname}
          maxLength={MAX_NICKNAME_LEN}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="写个昵称，明天接着签"
          className="rounded-md border bg-transparent px-3 py-2"
          style={{ borderColor: 'var(--cf-paper-line)' }}
        />
      </label>
      {hint && (
        <p className="text-sm" style={{ color: 'var(--cf-vermilion)' }}>
          {hint}
        </p>
      )}
      <button
        type="button"
        aria-label="签筒"
        data-phase={phase}
        onPointerDown={startCharge}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        aria-describedby="fortune-draw-hint"
        className="relative flex touch-none select-none flex-col items-center pt-10"
        style={
          phase === 'charging'
            ? {
                transform: `scale(${1 + charge * 0.08})`,
                animation: 'cf-shake 0.3s infinite',
              }
            : undefined
        }
      >
        <span aria-hidden className="absolute top-0 flex gap-1">
          <i className="cf-stick" />
          <i className="cf-stick cf-stick-tall" />
          <i className="cf-stick" />
        </span>
        <span className="cf-tube font-serif-cn text-3xl">签</span>
      </button>
      {phase === 'falling' && <div aria-hidden className="cf-fall-stick" />}
      <p id="fortune-draw-hint" className="text-xs" style={{ color: 'var(--cf-ink-faded)' }}>
        长按签筒蓄力；也可用 Enter 或空格键求签
      </p>
    </section>
  )
}
