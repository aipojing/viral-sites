import { useEffect, useState, type ReactNode } from 'react'
import { renderTemplate, track, type Phrase } from '@viral/shared'
import type { Scene } from '../configs/scenes'
import type { Tone } from '../configs/tones'
import { copyText } from '../lib/copy-text'
import { BATCH_SIZE, pickBatch } from '../lib/pick-batch'

interface Props {
  phrases: readonly Phrase[]
  scene: Scene
  tone: Tone
  renderSaveAction?: (renderedText: string) => ReactNode
}

export function PhraseList({ phrases, scene, tone, renderSaveAction }: Props) {
  const [addressee, setAddressee] = useState('')
  const [batchIndex, setBatchIndex] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)

  useEffect(() => {
    track('generate', { scene: scene.id, tone: tone.id })
  }, [scene.id, tone.id, batchIndex])

  const batch = pickBatch(phrases, batchIndex)

  const handleCopy = async (renderedText: string, index: number) => {
    try {
      await copyText(renderedText)
      setCopyFailed(false)
      setCopiedIndex(index)
      track('copy', { scene: scene.id, tone: tone.id })
      window.setTimeout(() => setCopiedIndex(null), 1500)
    } catch {
      setCopyFailed(true)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        对方称呼
        <input
          value={addressee}
          onChange={(e) => setAddressee(e.target.value)}
          placeholder="不填就是「亲」"
          className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2"
        />
      </label>
      <ul className="flex flex-col gap-3">
        {batch.map((phrase, index) => {
          const rendered = renderTemplate(phrase.text, addressee)
          return (
            <li
              key={phrase.text}
              className="rounded-2xl bg-white p-4 shadow-sm"
              style={{ borderLeft: `4px solid ${scene.color}` }}
            >
              <p className="text-base leading-relaxed">{rendered}</p>
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => void handleCopy(rendered, index)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: scene.color }}
                >
                  {copiedIndex === index ? '已复制' : '复制'}
                </button>
                {renderSaveAction?.(rendered)}
              </div>
            </li>
          )
        })}
      </ul>
      {copyFailed && <p className="text-xs text-[#6b7280]">复制失败了，长按文字也能复制</p>}
      {phrases.length > BATCH_SIZE && (
        <button
          type="button"
          onClick={() => setBatchIndex((i) => i + 1)}
          className="py-2 text-sm text-[#6b7280]"
        >
          换一批
        </button>
      )}
    </section>
  )
}
