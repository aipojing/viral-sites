import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import type { Verdict } from '../lib/verdict'
import { makeVerdictCardDraw } from '../card/draw-verdict-card'
import { LongPressOverlay } from './long-press-overlay'

const SLUG = 'ai-judge'

interface Props {
  verdict: Verdict
}

export function SaveCardButton({ verdict }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeVerdictCardDraw(verdict))
      saveCard(canvas, {
        filename: 'ai-judge-verdict.png',
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { slug: SLUG })
    } catch {
      setFailed(true)
      track('export_error', { slug: SLUG })
    }
  }

  return (
    <>
      <button type="button" className="aj-btn" onClick={handleSave}>
        保存判词卡
      </button>
      {failed && <p className="text-center text-sm font-bold">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
