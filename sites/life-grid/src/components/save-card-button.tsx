import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import type { LifeStats } from '../lib/life-math'
import { makeLifeCardDraw } from '../card/draw-life-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  stats: LifeStats
}

export function SaveCardButton({ stats }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeLifeCardDraw(stats))
      saveCard(canvas, {
        filename: 'my-life-grid.png',
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
        className="rounded-lg bg-[#c8392b] py-3 font-medium text-[#f7f4ec]"
      >
        保存我的人生卡片
      </button>
      {failed && <p className="text-sm text-[#6d675b]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
