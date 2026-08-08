import { useState, type FormEvent } from 'react'
import { ERROR_MESSAGES } from './error-messages'
import { CountedField } from './counted-field'
import {
  NICKNAME_MAX_CODE_POINTS,
  QUESTION_MAX_CODE_POINTS,
  codePointLength,
} from '../../worker/validation'

export function LandingScreen({
  onCreate,
}: {
  onCreate(nickname: string, question: string): Promise<string | null>
}) {
  const [nickname, setNickname] = useState('')
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overLimit =
    codePointLength(nickname.trim()) > NICKNAME_MAX_CODE_POINTS ||
    codePointLength(question.trim()) > QUESTION_MAX_CODE_POINTS

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const code = await onCreate(nickname, question)
    if (code) {
      setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.internal_error)
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pb-12 pt-16">
      <header className="mb-10">
        <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-[#e63b2e]">下一问 · 六人接力</p>
        <h1 className="font-serif-cn text-3xl font-bold leading-snug text-stone-900">
          留一个问题，
          <br />
          看它会经过谁
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          六个人，一人回答一问，再留下一问。最后它会回到你这里。
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <CountedField
          id="nickname"
          label="昵称"
          value={nickname}
          onChange={setNickname}
          maxCodePoints={NICKNAME_MAX_CODE_POINTS}
          placeholder="1～8 个字"
          autoComplete="off"
        />
        <CountedField
          id="question"
          label="第一个问题"
          value={question}
          onChange={setQuestion}
          maxCodePoints={QUESTION_MAX_CODE_POINTS}
          placeholder="想问一个人的话，1～60 个字"
          autoComplete="off"
        />

        {error ? (
          <p className="text-sm text-[#c8392b]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || overLimit || nickname.trim() === '' || question.trim() === ''}
          className="min-h-12 rounded-full bg-[#e63b2e] px-8 text-base font-semibold text-white shadow-[0_3px_0_#a32418] transition-transform enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? '正在发出……' : '发出第一问'}
        </button>

        <p className="text-xs leading-relaxed text-stone-500">
          回答会出现在这条接力的结果页；拿到链接的人可以看到。
        </p>
      </form>
    </main>
  )
}
