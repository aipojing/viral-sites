import { useState } from 'react'
import { track } from '@viral/shared'
import type { DocumentScene } from '../configs/document-scenes'
import { DOCUMENT_TYPES } from '../configs/document-types'
import { copyText } from '../lib/copy-text'
import type { DocumentSelection, RenderedDocument } from '../lib/document-render'
import { SaveLetterButton } from './save-letter-button'

const DRAFT_MAX = 220

interface Props {
  selection: DocumentSelection
  scene: DocumentScene
  candidates: readonly RenderedDocument[]
  /** 以中性称呼重新渲染的同批文本，信纸卡默认用它，避免把用户填写的真实称呼带进图片 */
  neutralTexts: readonly string[]
  onBack: () => void
}

export function DocumentResults({ selection, scene, candidates, neutralTexts, onBack }: Props) {
  const [drafts, setDrafts] = useState<string[]>(() => candidates.map((c) => c.text))
  const [keepAddressee, setKeepAddressee] = useState<boolean[]>(() => candidates.map(() => false))
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)

  const handleDraftChange = (index: number, value: string) => {
    setDrafts((prev) => prev.map((draft, i) => (i === index ? value : draft)))
  }

  const handleCopy = async (index: number) => {
    const candidate = candidates[index]
    const draft = drafts[index]
    try {
      await copyText(draft)
      setCopyFailed(false)
      setCopiedIndex(index)
      // 埋点只带枚举，不带称呼、事由、正文等任何用户内容
      track('copy', {
        mode: 'document',
        type: selection.type,
        scene: selection.scene,
        audience: selection.audience,
        tone: selection.tone,
        kind: candidate.kind,
      })
      if (draft !== candidate.text) {
        track('edited_before_copy', { type: selection.type, tone: selection.tone })
      }
      window.setTimeout(() => setCopiedIndex(null), 1500)
    } catch {
      setCopyFailed(true)
    }
  }

  const isJoke = candidates.some((candidate) => candidate.kind === 'joke')
  const typeLabel = DOCUMENT_TYPES.find((t) => t.id === selection.type)?.label ?? '文书'
  const letterTone = selection.tone === 'wenyan' || selection.tone === 'fafeng' ? selection.tone : null

  return (
    <section className="flex flex-col gap-4">
      {isJoke && (
        <p role="note" className="rounded-lg bg-[#fef3c7] px-3 py-2 text-xs text-[#92400e]">
          玩梗版本仅供娱乐，发出前请确认对方接得住玩笑。
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {candidates.map((candidate, index) => (
          <li
            key={candidate.id}
            className="rounded-2xl bg-white p-4 shadow-sm"
            style={{ borderLeft: `4px solid ${scene.color}` }}
          >
            <textarea
              value={drafts[index]}
              onChange={(e) => handleDraftChange(index, e.target.value)}
              maxLength={DRAFT_MAX}
              rows={4}
              aria-label={`候选 ${index + 1}`}
              className="w-full resize-y rounded-lg border border-[#e5e7eb] bg-white p-3 text-base leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => void handleCopy(index)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: scene.color }}
              >
                {copiedIndex === index ? '已复制，去发送' : '复制并去发送'}
              </button>
              {candidate.kind === 'joke' && letterTone && (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-[#606774]">
                    <input
                      type="checkbox"
                      checked={keepAddressee[index]}
                      onChange={(e) =>
                        setKeepAddressee((prev) => prev.map((kept, i) => (i === index ? e.target.checked : kept)))
                      }
                      className="focus-visible:outline-2 focus-visible:outline-offset-2"
                    />
                    保留我填写的称呼
                  </label>
                  <SaveLetterButton
                    data={{
                      typeLabel,
                      tone: letterTone,
                      text: keepAddressee[index] ? drafts[index] : neutralTexts[index],
                      includeAddressee: keepAddressee[index],
                    }}
                    documentType={selection.type}
                  />
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {copyFailed && <p className="text-xs text-[#606774]">复制失败了，长按文字也能复制</p>}
      <button
        type="button"
        onClick={onBack}
        className="self-start py-1 text-sm text-[#606774] underline underline-offset-4"
      >
        返回修改
      </button>
    </section>
  )
}
