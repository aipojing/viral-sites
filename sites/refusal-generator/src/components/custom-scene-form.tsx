import { useState } from 'react'
import { normalizeSituation } from '../lib/custom-scene'

interface Props {
  initialValue?: string
  onSubmit: (situation: string) => void
}

export function CustomSceneForm({ initialValue = '', onSubmit }: Props) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState(false)

  const submit = () => {
    const normalized = normalizeSituation(value)
    if (!normalized) {
      setError(true)
      return
    }
    setError(false)
    onSubmit(normalized)
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <label className="flex flex-col gap-2 text-sm font-medium">
        描述你想拒绝的具体事情
        <textarea
          value={value}
          maxLength={40}
          rows={3}
          onChange={(event) => setValue(event.target.value)}
          placeholder="例如：同事让我替他背锅"
          className="resize-none rounded-xl border border-[#d1d5db] px-3 py-2 font-normal"
        />
      </label>
      <div className="mt-2 flex items-center justify-between text-xs text-[#606774]">
        <span>{error ? '先写清楚你想拒绝什么' : '内容只在本地处理'}</span>
        <span>{[...value].length}/40</span>
      </div>
      <button
        type="button"
        onClick={submit}
        className="mt-3 min-h-11 w-full rounded-xl bg-[#475569] px-4 py-2 font-medium text-white"
      >
        继续选语气
      </button>
    </section>
  )
}
