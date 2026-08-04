import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import { makeQuoteCardDraw, type QuoteCardData } from '../card/draw-quote-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  data: QuoteCardData
}

export function SaveQuoteButton({ data }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeQuoteCardDraw(data))
      saveCard(canvas, {
        filename: 'refusal-quote.png',
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { scene: data.sceneId, tone: data.toneId })
    } catch {
      setFailed(true)
      track('export_error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSave}
        className="text-sm text-[#6b7280] underline underline-offset-4"
      >
        保存卡片
      </button>
      {failed && <p className="text-xs text-[#6b7280]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
