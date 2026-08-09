import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import { makeScoreCardDraw, type ScoreCardData } from '../card/draw-score-card'
import { LongPressOverlay } from './long-press-overlay'

const SLUG = 'hold-button'

interface Props {
  data: ScoreCardData
}

export function SaveCardButton({ data }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeScoreCardDraw(data))
      saveCard(canvas, {
        filename: 'hold-button-score.png',
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
      <button type="button" className="hb-button" onClick={handleSave}>
        保存成绩卡
      </button>
      {failed && <p className="hb-fallback">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
