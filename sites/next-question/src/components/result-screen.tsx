import type { ChainEntry, PublicChain, Slot } from '../../worker/types'
import { buildPublicChainUrl } from '../lib/chain-url'

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

export function ResultScreen({ chain }: { chain: PublicChain }) {
  const publicUrl = buildPublicChainUrl(window.location.origin, chain.slug)
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
      </section>
    </main>
  )
}
