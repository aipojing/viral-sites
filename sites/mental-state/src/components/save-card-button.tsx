import { useState } from 'react'
import { renderCard, saveCard, track, type QuizResult, type TestConfig } from '@viral/shared'
import { makeReportCardDraw } from '../card/draw-report-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  config: TestConfig
  result: QuizResult
}

export function SaveCardButton({ config, result }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeReportCardDraw(config, result))
      saveCard(canvas, {
        filename: `${config.meta.slug}-report.png`,
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { slug: config.meta.slug })
    } catch {
      setFailed(true)
      track('export_error', { slug: config.meta.slug })
    }
  }

  return (
    <>
      <button type="button" onClick={handleSave} className="nb-btn nb-btn-primary py-4 text-lg">
        保存检测报告
      </button>
      {failed && <p className="text-center text-sm font-bold">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
