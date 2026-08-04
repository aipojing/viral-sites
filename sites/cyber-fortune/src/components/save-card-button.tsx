import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import type { Fortune } from '../lib/fortune-math'
import { makeFortuneCardDraw } from '../card/draw-fortune-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  fortune: Fortune
  streak: number
}

export function SaveCardButton({ fortune, streak }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeFortuneCardDraw(fortune, streak))
      saveCard(canvas, {
        filename: 'cyber-fortune.png',
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image')
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
        className="rounded-lg py-3 font-medium"
        style={{ backgroundColor: 'var(--cf-vermilion)', color: 'var(--cf-paper)' }}
      >
        保存今日签
      </button>
      {failed && (
        <p className="text-center text-sm" style={{ color: 'var(--cf-ink-faded)' }}>
          保存失败了，直接截图也一样
        </p>
      )}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
