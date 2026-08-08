import { useState } from 'react'
import { track } from '@viral/shared'
import type { PublicChain } from '../../worker/types'
import { buildBatonUrl } from '../lib/chain-url'
import { shareOrCopy } from '../lib/share'
import { makeBatonCardDraw } from '../card/draw-baton-card'
import { SaveCardButton } from './save-card-button'

// Task 6 会在这里补上二维码邀请卡与系统分享；本阶段先提供复制链接的可靠 fallback。
export function HandoffScreen({
  chain,
  nextToken,
  origin,
}: {
  chain: PublicChain
  nextToken: string
  origin: 'create' | 'submit'
}) {
  const nextSlot = chain.nextSlot ?? 2
  const submittedSlot = nextSlot - 1
  const [copied, setCopied] = useState(false)
  const url = buildBatonUrl(window.location.origin, chain.slug, nextToken)

  async function handleShare() {
    const method = await shareOrCopy({
      title: '下一问 · 接力邀请',
      text: `第 ${nextSlot} / 6 棒：上一棒给你留了一个问题`,
      url,
    })
    setCopied(method === 'copy')
    track('next_question_baton_shared', { q: nextSlot, mode: method })
  }

  async function handleCopy() {
    const method = await shareOrCopy({ title: '下一问', text: '', url })
    setCopied(method === 'copy')
    track('next_question_baton_shared', { q: nextSlot, mode: 'copy' })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pb-12 pt-16">
      <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-[#e63b2e]">下一问 · 传棒</p>
      <h1 className="font-serif-cn text-3xl font-bold leading-snug text-stone-900">
        {origin === 'create' ? '第一问已经发出' : `你的回答已经留在第 ${submittedSlot} 棒`}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        这个问题已经走过 {submittedSlot} 个人，还差 {6 - submittedSlot} 棒回到起点。
      </p>

      <section className="mt-8 rounded-2xl border border-dashed border-[#e63b2e]/60 bg-white/85 p-6">
        <p className="text-sm text-stone-600">把这枚一次性链接交给一个人：</p>
        <p className="mt-2 break-all rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500">{url}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="min-h-12 rounded-full bg-[#e63b2e] px-6 text-base font-semibold text-white shadow-[0_3px_0_#a32418] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            把第 {nextSlot} 棒交给一个人
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-12 rounded-full border border-stone-300 px-5 text-sm text-stone-600 hover:border-stone-400"
          >
            复制链接
          </button>
          <SaveCardButton
            draw={makeBatonCardDraw(nextSlot, url)}
            filename={`next-question-baton-${nextSlot}.png`}
            label="保存邀请卡"
            kind="baton"
            slot={nextSlot}
          />
        </div>
        <p className="mt-3 text-xs text-stone-500" role="status">
          {copied ? '链接已复制，去发给那个人吧。' : '邀请卡里有一次性二维码，直接发给对方。'}
        </p>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-stone-500">
        只发给一个人；如果多人打开，最先提交的人接走这一棒。
      </p>
    </main>
  )
}
