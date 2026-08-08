import { useState, type FormEvent } from 'react'
import type { PublicChain } from '../../worker/types'
import {
  ANSWER_MAX_CODE_POINTS,
  NICKNAME_MAX_CODE_POINTS,
  QUESTION_MAX_CODE_POINTS,
  codePointLength,
} from '../../worker/validation'
import { CountedField } from './counted-field'
import { errorMessageOf } from './error-messages'

export function BatonScreen({
  chain,
  onSubmit,
}: {
  chain: PublicChain
  onSubmit(nickname: string, answer: string, question: string): Promise<string | null>
}) {
  const slot = chain.nextSlot ?? 6
  const pendingEntry = chain.entries.find((entry) => entry.slot === slot - 1)
  const [accepted, setAccepted] = useState(false)
  const [nickname, setNickname] = useState('')
  const [answer, setAnswer] = useState('')
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const code = await onSubmit(nickname, answer, question)
    if (code) {
      // 失败保留草稿，只更新错误提示
      setError(errorMessageOf(code))
      setBusy(false)
    }
  }

  if (!accepted) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pb-12 pt-16">
        <p className="mb-6 text-sm font-semibold tracking-widest text-[#2b59c3]">第 {slot} / 6 棒</p>
        <section className="rounded-2xl border border-stone-200 bg-white/85 p-6 shadow-sm">
          <p className="mb-2 text-xs text-stone-500">上一棒留给你的问题</p>
          {pendingEntry && !pendingEntry.redacted ? (
            <h1 className="font-serif-cn text-2xl font-bold leading-relaxed text-stone-900">
              {pendingEntry.question}
            </h1>
          ) : (
            <p className="text-base text-stone-500">上一棒的内容已被撤回。</p>
          )}
        </section>
        <button
          type="button"
          onClick={() => setAccepted(true)}
          className="mt-8 min-h-12 rounded-full bg-[#e63b2e] px-8 text-base font-semibold text-white shadow-[0_3px_0_#a32418] transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          接下这一棒
        </button>
        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          接棒后会请你写下回答和下一问；这一棒只能被一个人接走。
        </p>
      </main>
    )
  }

  const overLimit =
    codePointLength(nickname.trim()) > NICKNAME_MAX_CODE_POINTS ||
    codePointLength(answer.trim()) > ANSWER_MAX_CODE_POINTS ||
    codePointLength(question.trim()) > QUESTION_MAX_CODE_POINTS

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pb-12 pt-16">
      <p className="mb-4 text-sm font-semibold tracking-widest text-[#2b59c3]">第 {slot} / 6 棒</p>
      {pendingEntry && !pendingEntry.redacted ? (
        <blockquote className="mb-6 border-l-4 border-[#e63b2e] pl-4">
          <p className="font-serif-cn text-xl font-bold leading-relaxed text-stone-900">
            {pendingEntry.question}
          </p>
        </blockquote>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <CountedField
          id="nickname"
          label="昵称"
          value={nickname}
          onChange={setNickname}
          maxCodePoints={NICKNAME_MAX_CODE_POINTS}
          placeholder="1～8 个字"
        />
        <CountedField
          id="answer"
          label="回答"
          value={answer}
          onChange={setAnswer}
          maxCodePoints={ANSWER_MAX_CODE_POINTS}
          placeholder="1～200 字"
          multiline
        />
        <CountedField
          id="next-question"
          label="下一问"
          value={question}
          onChange={setQuestion}
          maxCodePoints={QUESTION_MAX_CODE_POINTS}
          placeholder="留给下一个人的问题，1～60 字"
        />

        {error ? (
          <p className="text-sm text-[#c8392b]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            busy ||
            overLimit ||
            nickname.trim() === '' ||
            answer.trim() === '' ||
            question.trim() === ''
          }
          className="min-h-12 rounded-full bg-[#e63b2e] px-8 text-base font-semibold text-white shadow-[0_3px_0_#a32418] transition-transform enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? '正在提交……' : '提交'}
        </button>
      </form>
    </main>
  )
}
