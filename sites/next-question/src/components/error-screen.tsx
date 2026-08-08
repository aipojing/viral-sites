interface FailureCopy {
  title: string
  hint: string
}

const FAILURE_COPY: Record<string, FailureCopy> = {
  chain_not_found: { title: '这条问题不存在', hint: '链接可能有误，或者发起者已经删除了它。' },
  deleted: { title: '这条问题不存在', hint: '发起者已经删除了这条接力。' },
  expired: { title: '这条接力已经过期', hint: '未完成的问题只保留 7 天。你可以重新发起一问。' },
  chain_expired: { title: '这条接力已经过期', hint: '未完成的问题只保留 7 天。你可以重新发起一问。' },
  cancelled: {
    title: '有一棒撤回了问题，这条接力停在这里',
    hint: '其余人已经提交的内容仍然保留。',
  },
  chain_cancelled: {
    title: '有一棒撤回了问题，这条接力停在这里',
    hint: '其余人已经提交的内容仍然保留。',
  },
  invalid_token: {
    title: '这不是当前可用的接力棒',
    hint: '这一棒可能已经被接走，或者链接已经失效。',
  },
  rate_limited: { title: '今天发出的问题有点多', hint: '晚一点再来发起新的接力。' },
  timeout: { title: '网络好像开小差了', hint: '检查一下网络，稍后再试。' },
  network_error: { title: '网络好像开小差了', hint: '检查一下网络，稍后再试。' },
  invalid_response: { title: '网络好像开小差了', hint: '检查一下网络，稍后再试。' },
  internal_error: { title: '刚才出了点小状况', hint: '稍后再试一次。' },
}

export function ErrorScreen({ code, slug: _slug }: { code: string; slug?: string }) {
  const copy = FAILURE_COPY[code] ?? FAILURE_COPY.internal_error
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center px-6 pb-12 pt-16">
      <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-stone-400">下一问</p>
      <h1 className="font-serif-cn text-2xl font-bold leading-snug text-stone-900">{copy.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-stone-600">{copy.hint}</p>
      <a
        href="/next-question/"
        className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#e63b2e] px-6 text-base font-semibold text-white shadow-[0_3px_0_#a32418]"
      >
        回到下一问首页
      </a>
    </main>
  )
}
