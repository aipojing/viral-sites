import { useState } from 'react'
import { renderCard, saveCard, track, type DrawFn } from '@viral/shared'
import { LongPressOverlay } from './long-press-overlay'

const SLUG = 'salary-timer'

export interface SaveCardButtonProps {
  makeDraw: () => DrawFn
  filename: string
  label: string
  /** 埋点只允许功能枚举（card/scene/amount_visible），禁止金额与文本 */
  trackProps: Record<string, string | number>
}

export function SaveCardButton({ makeDraw, filename, label, trackProps }: SaveCardButtonProps) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeDraw())
      saveCard(canvas, {
        filename,
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { slug: SLUG, ...trackProps })
    } catch {
      setFailed(true)
      track('export_error', { slug: SLUG })
    }
  }

  return (
    <>
      <button type="button" className="st-btn w-full" onClick={handleSave}>
        {label}
      </button>
      {failed && <p className="mt-2 text-center text-sm font-bold">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} alt={`${label}图片`} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
