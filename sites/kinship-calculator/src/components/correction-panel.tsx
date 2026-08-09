import { track } from '@viral/shared'
import { useState } from 'react'
import { buildCorrectionText, getCorrectionUrl } from '../lib/correction'

export interface CorrectionPanelProps {
  entryId: string
  labels: readonly string[]
}

/** 纠错入口：有人工表单地址就跳表单，没有就降级为复制纠错信息，绝不伪装已提交 */
export function CorrectionPanel({ entryId, labels }: CorrectionPanelProps) {
  const [note, setNote] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle')
  const correctionUrl = getCorrectionUrl()

  const handleCopy = async () => {
    const text = buildCorrectionText(entryId, labels, note)
    try {
      await navigator.clipboard.writeText(text)
      setCopyState('done')
      track('correction_submitted', { method: 'copy' })
    } catch {
      // 剪贴板不可用时把文本摊出来让用户手动复制，不谎报成功
      setCopyState('failed')
    }
  }

  return (
    <div className="kcc-correction">
      <p className="kcc-correction__title">叫法不对？帮我们纠错</p>
      <label className="kcc-correction__label" htmlFor={`kcc-correction-${entryId}`}>
        你的说法或依据（选填，留在本机，只随你主动复制/提交）
      </label>
      <textarea
        id={`kcc-correction-${entryId}`}
        className="kcc-correction__note"
        rows={2}
        maxLength={200}
        value={note}
        onChange={(event) => {
          setNote(event.target.value)
          setCopyState('idle')
        }}
      />

      {correctionUrl ? (
        <a
          className="kcc-button kcc-correction__submit"
          href={correctionUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => track('correction_submitted', { method: 'form' })}
        >
          提交纠错
        </a>
      ) : (
        <>
          <button type="button" className="kcc-button kcc-button--ghost kcc-correction__submit" onClick={handleCopy}>
            复制纠错信息
          </button>
          {copyState === 'done' && (
            <p className="kcc-correction__status" role="status">
              已复制纠错信息。人工审核表单暂未上线，请把内容发给维护者，谢谢！
            </p>
          )}
          {copyState === 'failed' && (
            <p className="kcc-correction__status" role="status">
              自动复制失败，请长按选择下方文本手动复制。
            </p>
          )}
          {copyState === 'failed' && (
            <pre className="kcc-correction__fallback">{buildCorrectionText(entryId, labels, note)}</pre>
          )}
        </>
      )}
    </div>
  )
}
