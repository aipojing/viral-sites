import { useState } from 'react'
import { renderCard, saveCard, track, type TagsResult, type TestConfig } from '@viral/shared'
import { makeExamCardDraw } from '../card/draw-exam-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  config: TestConfig
  result: TagsResult
}

export function SaveCardButton({ config, result }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeExamCardDraw(config, result))
      saveCard(canvas, {
        filename: `${config.meta.slug}-exam.png`,
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
      <button type="button" onClick={handleSave} className="y2k-btn py-4 text-lg">
        保存成绩单
      </button>
      {failed && (
        <p className="text-center text-sm font-bold text-white [text-shadow:0_1px_0_rgba(0,0,0,0.35)]">
          保存失败了，直接截图也一样
        </p>
      )}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
