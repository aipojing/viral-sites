import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import { makeTimeLedgerCardDraw, type TimeLedgerCardData } from '../card/draw-time-ledger-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  data: TimeLedgerCardData
}

export function SaveTimeLedgerButton({ data }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeTimeLedgerCardDraw(data))
      saveCard(canvas, {
        filename: 'my-time-ledger.png',
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { card: 'time-ledger' })
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
        className="rounded-lg bg-[#c8392b] py-3 font-medium text-[#f7f4ec]"
      >
        保存余生时间账单
      </button>
      {failed && <p className="text-sm text-[#6d675b]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
