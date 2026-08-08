import { useState, type FormEvent } from 'react'
import { track } from '@viral/shared'
import type { ChainEntry, PublicChain } from '../../worker/types'
import { ANSWER_MAX_CODE_POINTS, codePointLength } from '../../worker/validation'
import { buildPublicChainUrl } from '../lib/chain-url'
import { shareOrCopy } from '../lib/share'
import { CountedField } from './counted-field'
import { errorMessageOf } from './error-messages'

function excerpt(value: string): string {
  const points = Array.from(value)
  if (points.length <= 24) return value
  return `${points.slice(0, 24).join('')}…`
}

function SeatItem({ entry, waiting }: { entry?: ChainEntry; waiting?: boolean }) {
  const slot = entry?.slot
  return (
    <li
      className="flex min-h-14 items-start gap-3 rounded-xl border border-stone-200 bg-white/85 px-4 py-3"
      aria-current={waiting ? 'step' : undefined}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
          entry
            ? waiting
              ? 'border-[#2b59c3] bg-[#2b59c3] text-white'
              : 'border-[#e63b2e] bg-[#e63b2e]/10 text-[#e63b2e]'
            : 'border-dashed border-stone-300 text-stone-400'
        }`}
        aria-hidden="true"
      >
        {entry ? '✓' : '·'}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-stone-400">第 {slot} 席</p>
        {entry ? (
          entry.redacted ? (
            <p className="text-sm text-stone-500">该内容已撤回</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-stone-900">{entry.nickname}</p>
              {entry.answer ? (
                <p className="truncate text-sm text-stone-600">{excerpt(entry.answer)}</p>
              ) : null}
            </>
          )
        ) : (
          <p className="text-sm text-stone-400">{waiting ? '等待接棒' : '空位'}</p>
        )}
      </div>
    </li>
  )
}

export function ProgressScreen({
  chain,
  ownerToken,
  notice,
  onClose,
  onDelete,
}: {
  chain: PublicChain
  ownerToken?: string
  notice?: string
  onClose?(answer: string): Promise<string | null>
  onDelete?(): Promise<void>
}) {
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shared, setShared] = useState(false)

  const entryOf = (slot: number) => chain.entries.find((entry) => entry.slot === slot)
  const publicUrl = buildPublicChainUrl(window.location.origin, chain.slug)

  async function handleShareProgress() {
    const method = await shareOrCopy({
      title: '下一问 · 接力进度',
      text: '一个问题正在六个人之间接力',
      url: publicUrl,
    })
    setShared(true)
    track('share', { mode: method })
  }

  async function handleClose(event: FormEvent) {
    event.preventDefault()
    if (busy || !onClose) return
    setBusy(true)
    setError(null)
    const code = await onClose(answer)
    if (code) {
      setError(errorMessageOf(code))
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (deleting || !onDelete) return
    setDeleting(true)
    await onDelete()
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pb-12 pt-16">
      <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-[#e63b2e]">下一问 · 守环页</p>
      {chain.status === 'returned' ? (
        <h1 className="font-serif-cn text-3xl font-bold leading-snug text-stone-900">
          问题已经回到起点
        </h1>
      ) : (
        <h1 className="font-serif-cn text-3xl font-bold leading-snug text-stone-900">
          这个问题正在路上
        </h1>
      )}
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        {chain.status === 'returned'
          ? '问题已经走完六个席位，现在只等出发的人回答。'
          : chain.status === 'waiting'
            ? `等待第 ${chain.nextSlot} 棒接棒。`
            : '这条接力已经停下。'}
      </p>

      {notice === 'chain_advanced' ? (
        <p className="mt-4 rounded-xl border border-[#2b59c3]/40 bg-[#2b59c3]/10 px-4 py-3 text-sm text-[#1d3f8f]" role="status">
          这一棒已经被别人接走了，下面是最新的进度。
        </p>
      ) : null}

      <ol className="mt-8 flex flex-col gap-2" aria-label="接力进度">
        {[1, 2, 3, 4, 5, 6].map((slot) => (
          <SeatItem
            key={slot}
            entry={entryOf(slot)}
            waiting={chain.status === 'waiting' && chain.nextSlot === slot}
          />
        ))}
      </ol>

      <section className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleShareProgress}
          className="min-h-12 rounded-full border border-stone-300 px-5 text-sm text-stone-600 hover:border-stone-400"
        >
          分享进度页
        </button>
        <span className="text-xs text-stone-500" role="status">
          {shared ? '进度链接已就绪，去发给关心这条接力的人。' : '进度页是只读链接，不含任何接力棒。'}
        </span>
      </section>

      {chain.status === 'returned' && onClose ? (
        <form onSubmit={handleClose} noValidate className="mt-8 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white/85 p-6">
          <h2 className="text-lg font-bold text-stone-900">回答最后一问</h2>
          <p className="text-sm text-stone-600">第 6 席把问题问回了你：</p>
          <blockquote className="border-l-4 border-[#e63b2e] pl-3 font-serif-cn text-lg font-bold text-stone-900">
            {entryOf(6)?.redacted ? '该内容已撤回' : entryOf(6)?.question}
          </blockquote>
          <CountedField
            id="close-answer"
            label="回答"
            value={answer}
            onChange={setAnswer}
            maxCodePoints={ANSWER_MAX_CODE_POINTS}
            placeholder="1～200 字"
            multiline
          />
          {error ? (
            <p className="text-sm text-[#c8392b]" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || answer.trim() === '' || codePointLength(answer.trim()) > ANSWER_MAX_CODE_POINTS}
            className="min-h-12 rounded-full bg-[#e63b2e] px-8 text-base font-semibold text-white shadow-[0_3px_0_#a32418] transition-transform enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '正在收尾……' : '完成闭环'}
          </button>
        </form>
      ) : null}

      {onDelete ? (
        <div className="mt-8 border-t border-stone-200 pt-4">
          {confirmingDelete ? (
            <div className="flex flex-col gap-3 rounded-xl border border-[#c8392b]/40 bg-[#c8392b]/5 px-4 py-3">
              <p className="text-sm text-stone-700">删除后整条链的问答都会清空，且无法恢复。确定吗？</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="min-h-11 rounded-full bg-[#c8392b] px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? '正在删除……' : '确认删除'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="min-h-11 rounded-full border border-stone-300 px-5 text-sm text-stone-600"
                >
                  先留着
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="min-h-11 text-sm text-stone-400 underline underline-offset-4 hover:text-[#c8392b]"
            >
              删除这条接力
            </button>
          )}
        </div>
      ) : null}
    </main>
  )
}
