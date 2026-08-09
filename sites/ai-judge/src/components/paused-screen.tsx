export type PausedReason = 'refused' | 'rate_limited' | 'paused' | 'error'

const COPY: Record<PausedReason, { title: string; detail: string; action: string }> = {
  refused: {
    title: '本官不审此案',
    detail: '呈堂证供有不宜入卷之处。换个说法，再来击鼓。',
    action: '重新呈状',
  },
  rate_limited: {
    title: '本官今日已阅卷过多',
    detail: '每人每日限审 3 次，明日子时（北京时间 0 点）后再来。',
    action: '知道了',
  },
  paused: {
    title: '衙门今日已下班',
    detail: '今日判词额度已用尽，明日开堂。急案可稍后重试。',
    action: '知道了',
  },
  error: {
    title: '堂上传讯出了岔子',
    detail: '网络颠簸或衙门临时故障，判词没能送达。稍等片刻再试一次。',
    action: '重试',
  },
}

interface Props {
  reason: PausedReason
  /** rate_limited / paused 只有「知道了」，返回落地页 */
  onBack: () => void
  /** error 允许原地重试上一次提交 */
  onRetry?: () => void
}

export function PausedScreen({ reason, onBack, onRetry }: Props) {
  const copy = COPY[reason]

  return (
    <section className="flex flex-col gap-5">
      <article className="aj-card flex flex-col items-center gap-4 p-8 text-center" role="alert">
        <span className="aj-seal text-sm" aria-hidden="true">
          退堂
        </span>
        <h1 className="text-3xl font-black">{copy.title}</h1>
        <p className="text-sm leading-relaxed text-[var(--aj-ink-soft)]">{copy.detail}</p>
      </article>
      {reason === 'error' && onRetry ? (
        <button type="button" className="aj-btn" onClick={onRetry}>
          {copy.action}
        </button>
      ) : (
        <button type="button" className="aj-btn" onClick={onBack}>
          {copy.action}
        </button>
      )}
    </section>
  )
}
