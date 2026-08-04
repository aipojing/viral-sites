import { useState } from 'react'
import {
  DEFAULT_EXPECTANCY,
  DEFAULT_MEETINGS_PER_YEAR,
  validateBirth,
  type LifeInput,
} from '../lib/life-math'

const ERROR_COPY: Record<'future' | 'too-old', string> = {
  future: '你还没出生，不用焦虑',
  'too-old': '恭喜您打破吉尼斯纪录',
}

interface Props {
  onSubmit: (input: LifeInput) => void
  today: Date
}

export function InputScreen({ onSubmit, today }: Props) {
  const [birthStr, setBirthStr] = useState('')
  const [expectancy, setExpectancy] = useState(DEFAULT_EXPECTANCY)
  const [parentAgeStr, setParentAgeStr] = useState('')
  const [meetingsStr, setMeetingsStr] = useState(String(DEFAULT_MEETINGS_PER_YEAR))
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!birthStr) return
    const [y, m, d] = birthStr.split('-').map(Number)
    const birth = new Date(y, m - 1, d)
    const check = validateBirth(birth, today)
    if (!check.ok) {
      setError(ERROR_COPY[check.reason])
      return
    }
    setError(null)
    const parentAge = parentAgeStr === '' ? undefined : Number(parentAgeStr)
    const meetingsPerYear = meetingsStr === '' ? undefined : Number(meetingsStr)
    onSubmit({ birth, today, expectancy, parentAge, meetingsPerYear })
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-serif-cn text-3xl">人生进度条</h1>
      <p className="text-sm text-[#8c8678]">
        输入出生日期，看看你的人生还剩多少个格子。
      </p>
      <label className="flex flex-col gap-2 text-sm">
        出生日期
        <input
          type="date"
          value={birthStr}
          onChange={(e) => setBirthStr(e.target.value)}
          className="rounded-md border border-[#d9d2c0] bg-transparent px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-[#c8392b]">{error}</p>}
      <details>
        <summary className="cursor-pointer text-sm text-[#8c8678]">高级选项</summary>
        <div className="mt-4 flex flex-col gap-4 text-sm">
          <label className="flex flex-col gap-2">
            预期寿命：{expectancy} 岁
            <input
              type="range"
              min={60}
              max={100}
              value={expectancy}
              onChange={(e) => setExpectancy(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-2">
            父母年龄（不填按你的年龄 +28 算）
            <input
              type="number"
              value={parentAgeStr}
              onChange={(e) => setParentAgeStr(e.target.value)}
              className="rounded-md border border-[#d9d2c0] bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-2">
            每年见父母次数
            <input
              type="number"
              value={meetingsStr}
              onChange={(e) => setMeetingsStr(e.target.value)}
              className="rounded-md border border-[#d9d2c0] bg-transparent px-3 py-2"
            />
          </label>
        </div>
      </details>
      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-lg bg-[#c8392b] py-3 font-medium text-[#f7f4ec]"
      >
        看看我的人生
      </button>
    </section>
  )
}
