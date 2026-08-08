import { useState } from 'react'
import { renderCard, saveCard, track, type DrawFn } from '@viral/shared'
import type { Slot } from '../../worker/types'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  draw: DrawFn
  filename: string
  label: string
  kind: 'baton' | 'result'
  slot?: Slot
}

// 埋点只携带 slot 与 method；URL 可能带 token，绝不进入事件。
export function SaveCardButton({ draw, filename, label, kind, slot }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(draw)
      saveCard(canvas, { filename, onLongPress: setOverlayUrl })
      track('save_image', { card: kind })
      if (kind === 'baton' && slot !== undefined) {
        track('next_question_baton_shared', { q: slot, mode: 'card' })
      } else if (kind === 'result') {
        track('next_question_result_saved')
      }
    } catch {
      setFailed(true)
      track('export_error', { card: kind })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSave}
        className="min-h-12 rounded-full border-2 border-[#e63b2e] px-6 text-base font-semibold text-[#e63b2e] transition-colors hover:bg-[#e63b2e]/10"
      >
        {label}
      </button>
      {failed ? <p className="text-sm text-stone-500">保存失败了，直接截图也一样</p> : null}
      {overlayUrl ? <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} /> : null}
    </>
  )
}
