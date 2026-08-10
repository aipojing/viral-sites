import { track } from '@viral/shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { HoldScreen } from './components/hold-screen'
import { LandingScreen } from './components/landing-screen'
import { ResultScreen } from './components/result-screen'
import { milestoneAt } from './content/milestones'
import { createHoldApi, type DeviceType, type HoldApi, type StartResponse } from './lib/api-client'
import { buildChallengeUrl, parseChallengeTarget } from './lib/challenge'
import { loadPersonalBest, savePersonalBest } from './lib/storage'
import {
  PREPARATION_MS,
  beginHolding,
  finishHold,
  startPreparation,
  tickHold,
  type FinishReason,
  type HoldState,
} from './lib/timer-machine'

const LONG_PRESS_HINT_MS = 5 * 60_000

export interface AppDeps {
  clock?: () => number
  raf?: (callback: FrameRequestCallback) => number
  cancelRaf?: (id: number) => void
  api?: HoldApi
  storage?: Storage
}

interface ResultState {
  durationMs: number
  percentile: number | null
  percentilePending: boolean
  localOnly: boolean
  todayCount: number
  isNewBest: boolean
}

/**
 * 编排四阶段：landing → preparing（3 秒）→ holding → result。
 * 本地 monotonic 计时是唯一事实；服务端成绩只补百分位，不覆盖用户看到的时长。
 */
export function App({
  clock = () => performance.now(),
  raf = (callback) => requestAnimationFrame(callback),
  cancelRaf = (id) => cancelAnimationFrame(id),
  api = createHoldApi(),
  storage = localStorage,
}: AppDeps = {}) {
  const machineRef = useRef<HoldState>({ phase: 'idle' })
  const [machine, setMachine] = useState<HoldState>(machineRef.current)
  const [countdown, setCountdown] = useState(3)
  const [personalBest, setPersonalBest] = useState(() => loadPersonalBest(storage))
  const [result, setResult] = useState<ResultState | null>(null)

  const challengeTarget = useMemo(() => parseChallengeTarget(new URL(window.location.href)), [])
  const deviceRef = useRef<DeviceType>('desktop')
  const sessionRef = useRef<Promise<StartResponse | null> | null>(null)
  const settledRef = useRef(false)
  const openedRef = useRef(false)
  const abortRef = useRef(new AbortController())
  const destroyedRef = useRef(false)

  useEffect(() => {
    return () => {
      destroyedRef.current = true
      abortRef.current.abort()
    }
  }, [])

  useEffect(() => {
    if (challengeTarget === null || openedRef.current) return
    openedRef.current = true
    track('challenge_opened', { bucket: Math.floor(challengeTarget / 1_000) })
  }, [challengeTarget])

  const transition = (next: HoldState) => {
    machineRef.current = next
    setMachine(next)
  }

  /** 结束顺序：本地状态 → personal best → generate → 异步补服务端百分位 */
  const settle = (durationMs: number, reason: FinishReason) => {
    if (settledRef.current) return
    settledRef.current = true
    transition({ phase: 'finished', durationMs, reason })

    const previousBest = loadPersonalBest(storage)
    setPersonalBest(savePersonalBest(storage, durationMs))
    const bucket = Math.floor(durationMs / 1_000)
    track('generate', { bucket, reason, device: deviceRef.current })
    if (challengeTarget !== null) {
      track('challenge_finished', { bucket, reason, device: deviceRef.current })
    }
    setResult({
      durationMs,
      percentile: null,
      percentilePending: Boolean(sessionRef.current),
      localOnly: false,
      todayCount: 0,
      isNewBest: durationMs > previousBest,
    })

    const markLocalOnly = () => {
      if (!destroyedRef.current) setResult((current) => (current ? { ...current, localOnly: true, percentilePending: false } : current))
    }
    const sessionPromise = sessionRef.current
    if (!sessionPromise) {
      markLocalOnly()
      return
    }
    void sessionPromise
      .then((session) => {
        if (!session) return markLocalOnly()
        return api
          .finish(session.token, durationMs, abortRef.current.signal)
          .then((finish) => {
            if (destroyedRef.current) return
            setResult((current) =>
              current
                ? {
                    ...current,
                    percentile: finish.percentile,
                    percentilePending: false,
                    todayCount: session.todayCount + (finish.trusted ? 1 : 0),
                  }
                : current,
            )
          })
          .catch(markLocalOnly)
      })
      .catch(markLocalOnly)
  }

  // preparing/holding 期间跑 rAF 循环：准备期更新倒计时，按住期 tick 显示值与封顶
  useEffect(() => {
    if (machine.phase !== 'preparing' && machine.phase !== 'holding') return
    let frameId = 0
    const loop = () => {
      const now = clock()
      const current = machineRef.current
      if (current.phase === 'preparing') {
        const remaining = PREPARATION_MS - (now - current.countdownStartedAt)
        setCountdown(Math.max(0, Math.ceil(remaining / 1_000)))
      } else if (current.phase === 'holding') {
        const next = tickHold(current, now)
        if (next.phase === 'finished') {
          settle(next.durationMs, next.reason)
          return
        }
        if (next.phase === 'holding' && next.shownMs !== current.shownMs) {
          machineRef.current = next
          setMachine(next)
        }
      }
      frameId = raf(loop)
    }
    frameId = raf(loop)
    return () => cancelRaf(frameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.phase])

  const begin = () => {
    settledRef.current = false
    sessionRef.current = null
    setResult(null)
    transition(startPreparation(clock()))
  }

  const handleHoldStart = (device: DeviceType) => {
    deviceRef.current = device
    transition(beginHolding(clock()))
    if (challengeTarget !== null) {
      track('challenge_started', { bucket: Math.floor(challengeTarget / 1_000), device })
    }
    // 真正按下的一刻才请求会话，准备倒计时不计入服务端成绩
    sessionRef.current = api.start(device, abortRef.current.signal).catch(() => null)
  }

  const handleHoldEnd = (reason: FinishReason) => {
    const finished = finishHold(machineRef.current, clock(), reason)
    if (finished.phase !== 'finished') return
    settle(finished.durationMs, finished.reason)
  }

  if (machine.phase === 'idle') {
    return <LandingScreen personalBest={personalBest} challengeTarget={challengeTarget} onStart={begin} />
  }

  if (machine.phase === 'finished' && result) {
    return (
      <ResultScreen
        durationMs={result.durationMs}
        percentile={result.percentile}
        percentilePending={result.percentilePending}
        localOnly={result.localOnly}
        todayCount={result.todayCount}
        isNewBest={result.isNewBest}
        challengeTarget={challengeTarget}
        challengeUrl={buildChallengeUrl(new URL(window.location.href), result.durationMs)}
        onRetry={begin}
      />
    )
  }

  const shownMs = machine.phase === 'holding' ? machine.shownMs : 0
  return (
    <HoldScreen
      phase={machine.phase === 'preparing' ? 'preparing' : 'holding'}
      countdownSeconds={countdown}
      shownMs={shownMs}
      milestoneText={milestoneAt(shownMs).text}
      longPressHint={shownMs >= LONG_PRESS_HINT_MS}
      onHoldStart={handleHoldStart}
      onHoldEnd={handleHoldEnd}
      onInterrupt={() => transition({ phase: 'idle' })}
    />
  )
}
