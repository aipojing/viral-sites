import { useState } from 'react'
import { track } from '@viral/shared'
import { DocumentDetailsForm } from '../components/document-details-form'
import { DocumentPicker, type DocumentPickerSelection } from '../components/document-picker'
import { DocumentResults } from '../components/document-results'
import { DOCUMENT_SCENES } from '../configs/document-scenes'
import { DOCUMENT_TONES } from '../configs/document-tones'
import { templatesFor } from '../configs/document-templates'
import {
  renderDocumentBatch,
  type DocumentSelection,
  type DocumentValues,
  type RenderedDocument,
} from '../lib/document-render'
import { classifyDocumentInput } from '../lib/document-safety'

type Step = 'pick' | 'details' | 'results'

// 敏感输入时的正式语气降级目标，启用矩阵内每个单元都有 sincere
const FORMAL_FALLBACK_TONE = 'sincere'

export function DocumentMode() {
  const [step, setStep] = useState<Step>('pick')
  const [selection, setSelection] = useState<DocumentPickerSelection>({
    type: null,
    scene: null,
    audience: null,
    tone: null,
  })
  const [values, setValues] = useState<DocumentValues | null>(null)
  const [candidates, setCandidates] = useState<readonly RenderedDocument[] | null>(null)
  const [neutralTexts, setNeutralTexts] = useState<readonly string[] | null>(null)
  const [sensitiveInput, setSensitiveInput] = useState(false)

  const completeSelection: DocumentSelection | null =
    selection.type && selection.scene && selection.audience && selection.tone
      ? {
          type: selection.type,
          scene: selection.scene,
          audience: selection.audience,
          tone: selection.tone,
        }
      : null
  const scene = DOCUMENT_SCENES.find((s) => s.id === selection.scene) ?? null
  const tone = DOCUMENT_TONES.find((t) => t.id === selection.tone) ?? null

  const handlePick = (next: DocumentPickerSelection) => {
    setSelection(next)
    if (next.type && next.scene && next.audience && next.tone) {
      setStep('details')
    }
  }

  const handleDetailsSubmit = (next: DocumentValues) => {
    if (!completeSelection) return
    // 敏感输入只关闭娱乐语气，不阻止正式文案；命中词不进埋点
    const sensitive = classifyDocumentInput(next) === 'sensitive'
    const toneId =
      sensitive && tone?.kind === 'joke' ? FORMAL_FALLBACK_TONE : completeSelection.tone
    const effectiveSelection: DocumentSelection = { ...completeSelection, tone: toneId }
    const effectiveTone = DOCUMENT_TONES.find((t) => t.id === toneId) ?? tone
    if (!effectiveTone) return

    const templates = templatesFor(effectiveSelection)
    const batch = renderDocumentBatch(templates, next)
    // 额外渲染一份中性称呼版本，供信纸卡默认使用，避免把真实称呼带进图片
    const neutralBatch = renderDocumentBatch(templates, { ...next, addressee: '' })
    setSelection((prev) => ({ ...prev, tone: toneId }))
    setValues(next)
    setCandidates(batch)
    setNeutralTexts(neutralBatch.map((doc) => doc.text))
    setSensitiveInput(sensitive)
    setStep('results')
    if (sensitive) {
      track('safety_mode', { mode: 'formal-only' })
    }
    // 只记录枚举值，不记录称呼、事由、日期等任何用户填写内容
    track('generate', {
      mode: 'document',
      type: effectiveSelection.type,
      scene: effectiveSelection.scene,
      audience: effectiveSelection.audience,
      tone: effectiveSelection.tone,
      kind: effectiveTone.kind,
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">道歉与请假</h1>
        <p className="mt-1 text-sm text-[#606774]">
          选对象、事由和语气，生成一段真能发出去的消息。
        </p>
      </header>

      {step === 'pick' && <DocumentPicker selection={selection} onPick={handlePick} />}

      {step === 'details' && scene && (
        <>
          {tone?.kind === 'joke' && (
            <p role="note" className="rounded-lg bg-[#fef3c7] px-3 py-2 text-xs text-[#92400e]">
              玩梗版本：发出去之前，先确认对方接得住玩笑。
            </p>
          )}
          <DocumentDetailsForm key={`${selection.type}-${scene.id}`} scene={scene} onSubmit={handleDetailsSubmit} />
          <button
            type="button"
            onClick={() => setStep('pick')}
            className="self-start py-1 text-sm text-[#606774] underline underline-offset-4"
          >
            返回重选
          </button>
        </>
      )}

      {step === 'results' && sensitiveInput && (
        <p role="note" className="rounded-lg bg-[#e0f2fe] px-3 py-2 text-xs text-[#075985]">
          这件事更适合直接、认真地联系对方或可信任的人。以下文案已只提供正式语气。
        </p>
      )}

      {step === 'results' && completeSelection && scene && candidates && values && neutralTexts && (
        <DocumentResults
          selection={completeSelection}
          scene={scene}
          candidates={candidates}
          neutralTexts={neutralTexts}
          onBack={() => setStep('details')}
        />
      )}

      <footer className="pt-6 text-center text-xs text-[#606774]">
        文案仅供参考，发送前请确认适合你的处境 · 所有内容本地处理，不上传任何数据
      </footer>
    </div>
  )
}
