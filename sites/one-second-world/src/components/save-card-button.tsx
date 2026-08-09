import { renderCard, saveCard, track } from '@viral/shared'
import { useState } from 'react'
import { makeWorldSnapshotCardDraw } from '../card/draw-snapshot-card'
import type { SnapshotItem } from '../lib/snapshot'
import { LongPressOverlay } from './long-press-overlay'

export interface SaveCardButtonProps {
  elapsedMs: number
  items: readonly [SnapshotItem, SnapshotItem, SnapshotItem]
}

/** 卡片上的本地时刻标签：YYYY-MM-DD HH:mm */
export function formatLocalTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 保存快照卡：桌面直接下载，微信等环境降级为长按保存提示层 */
export function SaveCardButton({ elapsedMs, items }: SaveCardButtonProps) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(
        makeWorldSnapshotCardDraw({
          elapsedMs,
          localTimeLabel: formatLocalTime(new Date()),
          items,
        }),
      )
      saveCard(canvas, {
        filename: 'my-one-second-world.png',
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { card: 'world-snapshot' })
    } catch {
      setFailed(true)
      track('export_error')
    }
  }

  return (
    <>
      <button type="button" className="osw-snapshot__save" onClick={handleSave}>
        保存快照卡
      </button>
      {failed && <p className="osw-snapshot__save-hint">保存失败了，直接截图也一样</p>}
      {overlayUrl && (
        <LongPressOverlay
          dataUrl={overlayUrl}
          alt="一秒钟世界快照卡"
          onClose={() => setOverlayUrl(null)}
        />
      )}
    </>
  )
}
