import { useState } from 'react'
import { track } from '@viral/shared'
import type { ChainEntry, PublicChain, Slot } from '../../worker/types'
import { buildPublicChainUrl } from '../lib/chain-url'
import { shareOrCopy } from '../lib/share'
import { makeResultCardDraw } from '../card/draw-result-card'
import { SaveCardButton } from './save-card-button'

function entryOf(chain: PublicChain, slot: Slot): ChainEntry | undefined {
  return chain.entries.find((entry) => entry.slot === slot)
}

function QuestionBlock({ entry, asker }: { entry?: ChainEntry; asker: Slot }) {
  return (
    <div>
      <p className="text-xs text-stone-400">第 {asker} 席 问</p>
      {entry?.redacted ? (
        <p className="text-sm text-stone-500">该内容已撤回</p>
      ) : (
        <p className="font-serif-cn text-lg font-bold leading-relaxed text-stone-900">
          {entry?.question}
        </p>
      )}
    </div>
  )
}

function AnswerBlock({ entry, answerer }: { entry?: ChainEntry; answerer: Slot }) {
  return (
    <div className="border-l-2 border-stone-200 pl-3">
      <p className="text-xs text-stone-400">第 {answerer} 席 答</p>
      {entry?.redacted ? (
        <p className="text-sm text-stone-500">该内容已撤回</p>
      ) : (
        <p className="text-sm leading-relaxed text-stone-700">{entry?.answer}</p>
      )}
    </div>
  )
}

export function ResultScreen({
  chain,
  onDelete,
}: {
  chain: PublicChain
  onDelete?(): Promise<string | null>
}) {
  const publicUrl = buildPublicChainUrl(window.location.origin, chain.slug)
  const [shared, setShared] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const startDate = new Date(chain.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const closedDate = new Date(chain.updatedAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  async function handleShare() {
    const method = await shareOrCopy({
      title: '下一问 · 闭环结果',
      text: '一个问题走过六个人，又回到了起点',
      url: publicUrl,
    })
    setShared(true)
    track('share', { mode: method })
  }

  async function handleDelete() {
    if (deleting || !onDelete) return
    setDeleting(true)
    setDeleteError(null)
    const code = await onDelete()
    if (code) {
      setDeleteError('删除没有成功，请重试')
      setDeleting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pb-12 pt-16">
      <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-[#e63b2e]">下一问 · 闭环</p>
      <h1 className="font-serif-cn text-3xl font-bold leading-snug text-stone-900">
        一个问题走过六个人，又回到了起点
      </h1>
      <p className="mt-3 text-xs text-stone-500">
        第 1 棒发出于 {startDate} · 第 6 棒闭环于 {closedDate}
      </p>

      <ol className="mt-8 flex flex-col gap-6" aria-label="完整问答">
        {([1, 2, 3, 4, 5, 6] as Slot[]).map((slot) => {
          const questionEntry = entryOf(chain, slot)
          const answerer = (slot === 6 ? 1 : slot + 1) as Slot
          const answerEntry = entryOf(chain, answerer)
          return (
            <li key={slot} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white/85 p-5">
              <QuestionBlock entry={questionEntry} asker={slot} />
              <AnswerBlock entry={answerEntry} answerer={answerer} />
            </li>
          )
        })}
      </ol>

      <section className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white/85 p-5">
        <p className="text-sm text-stone-600">把这条完整的问答分享给链条上的人：</p>
        <p className="mt-2 break-all rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500">{publicUrl}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="min-h-12 rounded-full bg-[#e63b2e] px-6 text-base font-semibold text-white shadow-[0_3px_0_#a32418] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            分享结果页
          </button>
          <SaveCardButton
            draw={makeResultCardDraw(chain, publicUrl)}
            filename="next-question-result.png"
            label="保存结果卡"
            kind="result"
          />
        </div>
        <p className="mt-3 text-xs text-stone-500" role="status">
          {shared ? '结果页链接已就绪。' : '结果卡只放摘录，完整问答留在网页里。'}
        </p>
      </section>

      {onDelete ? (
        <div className="mt-8 border-t border-stone-200 pt-4">
          {confirmingDelete ? (
            <div className="flex flex-col gap-3 rounded-xl border border-[#c8392b]/40 bg-[#c8392b]/5 px-4 py-3">
              <p className="text-sm text-stone-700">删除后整条链的问答都会清空，且无法恢复。确定吗？</p>
              {deleteError ? (
                <p className="text-sm text-[#c8392b]" role="alert">
                  {deleteError}
                </p>
              ) : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
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
