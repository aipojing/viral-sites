import { useState } from 'react'
import { clampNickname } from '../lib/challenge-codec'

interface Props {
  heading: string
  sub: string
  buttonLabel: string
  onSubmit: (nickname: string) => void
}

export function NicknameScreen({ heading, sub, buttonLabel, onSubmit }: Props) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = () => {
    const clean = clampNickname(nickname)
    if (clean === '') {
      setError(true)
      return
    }
    onSubmit(clean)
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{heading}</h1>
      <p className="text-sm text-[#9b948a]">{sub}</p>
      <label className="flex flex-col gap-2 text-sm">
        你的昵称
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(clampNickname(e.target.value))}
          placeholder="最多 8 个字"
          className="sketch-dash bg-transparent px-3 py-2 text-lg"
        />
      </label>
      {error && <p className="pen-red text-sm">先留个称呼，好让对方知道你是谁</p>}
      <button
        type="button"
        onClick={handleSubmit}
        className="doodle-border tilt-l bg-[#2b59c3] py-3 font-medium text-[#fdfbf4]"
      >
        {buttonLabel}
      </button>
    </section>
  )
}
