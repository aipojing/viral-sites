import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import { makeLetterCardDraw, type LetterCardData } from '../card/draw-letter-card'
import type { DocumentType } from '../configs/document-types'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  data: LetterCardData
  documentType: DocumentType
}

export function SaveLetterButton({ data, documentType }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeLetterCardDraw(data))
      saveCard(canvas, {
        filename: `${documentType}-letter.png`,
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      // 埋点只带枚举，不带正文、称呼等任何用户内容
      track('save_image', { mode: 'document', type: documentType, tone: data.tone })
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
        保存信纸卡片
      </button>
      {failed && <p className="text-xs text-[#6b7280]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
