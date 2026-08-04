import { useState } from 'react'
import { renderCard, saveCard, track, type DrawFn } from '@viral/shared'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  draw: DrawFn
  filename: string
  label: string
  cardId: 'invite' | 'compare'
}

export function SaveCardButton({ draw, filename, label, cardId }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(draw)
      saveCard(canvas, { filename, onLongPress: setOverlayUrl })
      track('save_image', { card: cardId })
    } catch {
      setFailed(true)
      track('export_error', { card: cardId })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSave}
        className="doodle-border tilt-l bg-[#e0483a] py-3 font-medium text-[#fdfbf4]"
      >
        {label}
      </button>
      {failed && <p className="text-sm text-[#9b948a]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
