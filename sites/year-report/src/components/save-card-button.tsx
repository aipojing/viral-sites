import { renderCard, saveCard, track } from '@viral/shared'
import { useState } from 'react'
import { makeSummaryCardDraw } from '../card/draw-summary-card'
import type { ReportAnswers } from '../lib/report-types'
import { LongPressOverlay } from './long-press-overlay'

export interface SaveCardButtonProps {
  year: number
  /** 已按勾选过滤过的答案：卡片只画这里面有的字段 */
  publicAnswers: ReportAnswers
}

/**
 * 保存总结卡：卡面内容来自与链接完全相同的 publicAnswers。
 * 埋点只上报公开字段数量，不含字段名与内容；桌面直接下载，微信等环境降级为长按保存。
 */
export function SaveCardButton({ year, publicAnswers }: SaveCardButtonProps) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeSummaryCardDraw({ year, answers: publicAnswers }))
      saveCard(canvas, {
        filename: `year-report-${year}.png`,
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { card: 'year-report', field_count: Object.keys(publicAnswers).length })
    } catch {
      setFailed(true)
      track('export_error')
    }
  }

  return (
    <div>
      <button type="button" className="yr-button yr-button--block" onClick={handleSave}>
        保存总结卡
      </button>
      {failed && <p className="yr-error">保存失败了，直接截图也一样</p>}
      {overlayUrl && (
        <LongPressOverlay dataUrl={overlayUrl} alt="年度报告总结卡" onClose={() => setOverlayUrl(null)} />
      )}
    </div>
  )
}
