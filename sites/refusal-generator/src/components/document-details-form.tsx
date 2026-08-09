import { useState } from 'react'
import type { DocumentScene } from '../configs/document-scenes'
import type { DocumentValues } from '../lib/document-render'

const FREE_INPUT_MAX = 30

interface Props {
  scene: DocumentScene
  onSubmit: (values: DocumentValues) => void
}

export function DocumentDetailsForm({ scene, onSubmit }: Props) {
  const [addressee, setAddressee] = useState('')
  const [reason, setReason] = useState(scene.label)
  const [date, setDate] = useState('')
  const [remedy, setRemedy] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('事由不能为空，写一两个关键词就行。')
      return
    }
    setError(null)
    onSubmit({
      addressee: addressee.trim(),
      reason: reason.trim(),
      date: date.trim() || undefined,
      remedy: remedy.trim() || undefined,
    })
  }

  const fieldClass =
    'w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2'

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-[#3c4251]">
        对方称呼（可不填）
        <input
          value={addressee}
          onChange={(e) => setAddressee(e.target.value)}
          maxLength={FREE_INPUT_MAX}
          placeholder="留空会用中性称呼"
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[#3c4251]">
        具体事由（可补充事实，{FREE_INPUT_MAX} 字以内）
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={FREE_INPUT_MAX}
          required
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[#3c4251]">
        预计返回时间（可不填）
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          maxLength={FREE_INPUT_MAX}
          placeholder="例如：下周一"
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[#3c4251]">
        补救动作（可不填）
        <input
          value={remedy}
          onChange={(e) => setRemedy(e.target.value)}
          maxLength={FREE_INPUT_MAX}
          placeholder="例如：补上进度"
          className={fieldClass}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-[#b45309]">
          {error}
        </p>
      )}
      <p className="text-xs text-[#606774]">填写内容只在当前页面处理，不会上传。</p>
      <button
        type="submit"
        className="rounded-xl bg-[#1f2937] px-4 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        生成 3 条候选
      </button>
    </form>
  )
}
