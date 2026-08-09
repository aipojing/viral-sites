import { renderCard, saveCard, track } from '@viral/shared'
import { useState } from 'react'
import { makeRelationCardDraw } from '../card/draw-relation-card'
import type { RegionalLabel } from '../data/region-packs'
import type { Confidence, RelationEntry } from '../data/relation-types'
import { LongPressOverlay } from './long-press-overlay'

export interface SaveRelationCardProps {
  entry: RelationEntry
  confidence: Confidence
  pathLabels: readonly string[]
  regionalLabels: readonly RegionalLabel[]
}

/**
 * 保存称呼卡：只在 resolved 时由上层渲染。
 * 地域称呼由用户选一个进卡，避免把所有候选堆上卡面；
 * 桌面直接下载，微信等环境降级为长按保存提示层。
 */
export function SaveRelationCardButton({ entry, confidence, pathLabels, regionalLabels }: SaveRelationCardProps) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [selectedRegionIndex, setSelectedRegionIndex] = useState(0)

  const selectedRegional = regionalLabels[selectedRegionIndex]

  const handleSave = () => {
    try {
      const canvas = renderCard(
        makeRelationCardDraw({
          label: entry.labels.join(' / '),
          pathLabels,
          regionalLabel: selectedRegional?.label,
          confidence,
        }),
      )
      saveCard(canvas, {
        filename: `kinship-${entry.id}.png`,
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { card: 'kinship' })
    } catch {
      setFailed(true)
      track('export_error')
    }
  }

  return (
    <div className="kcc-save">
      {regionalLabels.length > 1 && (
        <div className="kcc-save__region" role="group" aria-label="选一个地区叫法放进卡片">
          <p className="kcc-save__region-caption">选一个地区叫法放进卡片</p>
          {regionalLabels.map((item, index) => (
            <button
              key={`${item.region}-${item.label}`}
              type="button"
              className={`kcc-save__region-option${index === selectedRegionIndex ? ' kcc-save__region-option--active' : ''}`}
              aria-pressed={index === selectedRegionIndex}
              onClick={() => setSelectedRegionIndex(index)}
            >
              {item.label}（{item.region}）
            </button>
          ))}
        </div>
      )}
      <button type="button" className="kcc-button kcc-save__button" onClick={handleSave}>
        保存称呼卡
      </button>
      {failed && <p className="kcc-save__hint">保存失败了，直接截图也一样</p>}
      {overlayUrl && (
        <LongPressOverlay
          dataUrl={overlayUrl}
          alt="亲戚称呼卡"
          onClose={() => setOverlayUrl(null)}
        />
      )}
    </div>
  )
}
