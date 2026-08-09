import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'
import type { DeviceType } from '../lib/api-client'
import { formatDuration } from '../lib/format'
import type { FinishReason } from '../lib/timer-machine'

export interface HoldScreenProps {
  phase: 'preparing' | 'holding'
  countdownSeconds: number
  shownMs: number
  milestoneText: string
  longPressHint: boolean
  onHoldStart: (deviceType: DeviceType) => void
  onHoldEnd: (reason: FinishReason) => void
  onInterrupt: () => void
}

/**
 * 按压层：只允许首个 pointer 控制，双指不重启；空格可体验但归入 desktop。
 * 切页（hidden）与失焦（blur）都直接结束本轮。
 */
export function HoldScreen({
  phase,
  countdownSeconds,
  shownMs,
  milestoneText,
  longPressHint,
  onHoldStart,
  onHoldEnd,
  onInterrupt,
}: HoldScreenProps) {
  const activePointerId = useRef<number | null>(null)
  const spaceActive = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    const handleBlur = () => {
      if (phaseRef.current === 'holding') onHoldEnd('blurred')
      else onInterrupt()
    }
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      if (phaseRef.current === 'holding') onHoldEnd('hidden')
      else onInterrupt()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return
      event.preventDefault()
      if (spaceActive.current) return
      spaceActive.current = true
      if (phaseRef.current === 'preparing') onHoldStart('desktop')
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !spaceActive.current) return
      spaceActive.current = false
      if (phaseRef.current === 'holding') onHoldEnd('released')
    }
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onHoldStart, onHoldEnd, onInterrupt])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return
    activePointerId.current = event.pointerId
    const zone = event.currentTarget
    if (typeof zone.setPointerCapture === 'function') {
      try {
        zone.setPointerCapture(event.pointerId)
      } catch {
        // 某些环境不支持 capture，pointerup 仍会送达
      }
    }
    if (phase === 'preparing') onHoldStart(event.pointerType === 'touch' ? 'touch' : 'desktop')
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== activePointerId.current) return
    activePointerId.current = null
    if (phase === 'holding') onHoldEnd('released')
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== activePointerId.current) return
    activePointerId.current = null
    if (phase === 'holding') onHoldEnd('cancelled')
  }

  return (
    <main className="hb-screen flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      {phase === 'preparing' ? (
        <div aria-live="polite">
          <p className="hb-countdown">{countdownSeconds}</p>
          <p className="mt-4 text-sm text-[var(--hb-ink-soft)]">准备……随时按住屏幕或空格开始</p>
        </div>
      ) : (
        <div aria-live="polite">
          <p className="hb-duration">{formatDuration(shownMs)}</p>
          <p className="mt-3 min-h-6 text-sm text-[var(--hb-ink-soft)]">{milestoneText}</p>
          {longPressHint && (
            <p className="mt-2 text-xs text-[var(--hb-accent)]">已经五分钟了，这是真正的坚持。</p>
          )}
          <p className="hb-pixel-tag mt-4">别松手</p>
        </div>
      )}

      <div
        data-testid="hold-zone"
        className="hb-zone"
        role="presentation"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        按住这里
      </div>
      <p className="text-xs text-[var(--hb-ink-soft)]">桌面端可以长按空格</p>
    </main>
  )
}
