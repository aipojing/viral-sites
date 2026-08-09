import type { ReactNode } from 'react'
import { sceneLabel, type FragmentResult, type SceneId } from '../lib/fragment'
import { formatDuration, formatMoney } from '../lib/pay-math'

// 克制锐评：自嘲不攻击，不引用真实商品价格。小票卡共用同一套文案。
export const SCENE_QUIPS: Record<SceneId, string> = {
  meeting: '会议内容会忘，等值已经记下。',
  toilet: '如厕也算带薪，这是科学。',
  idle: '带薪发呆，今日最佳片段。',
  queue: '排队的时间也是你的。',
  custom: '这段时间的名字是你起的。',
}

export interface FragmentReceiptProps {
  result: FragmentResult
  privacyMode: boolean
  onDismiss: () => void
  children?: ReactNode
}

function formatDate(ms: number): string {
  const date = new Date(ms)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function FragmentReceipt({ result, privacyMode, onDismiss, children }: FragmentReceiptProps) {
  const amountClass = privacyMode ? 'st-privacy-blur' : ''
  const paidDiffers = result.paidDurationMs !== result.durationMs

  return (
    <section className="st-printing mt-6" aria-label="片段小票">
      <div className="rounded border border-dashed border-[var(--st-line)] px-4 py-5">
        <p className="st-mono text-center text-xs tracking-[0.3em] text-[var(--st-ink-soft)]">
          FRAGMENT RECEIPT
        </p>
        <p className="mt-2 text-center text-lg font-black">{sceneLabel(result)}</p>
        <p className="st-mono mt-1 text-center text-xs text-[var(--st-ink-soft)]">{formatDate(result.endedAtMs)}</p>

        <div className="st-dashed my-3" aria-hidden="true" />

        <dl className="st-mono space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>持续时间</dt>
            <dd>{formatDuration(result.durationMs)}</dd>
          </div>
          {paidDiffers && (
            <div className="flex justify-between">
              <dt>其中带薪</dt>
              <dd>{formatDuration(result.paidDurationMs)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>片段等值</dt>
            <dd className={`font-bold ${amountClass}`}>{formatMoney(result.equivalent)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-center text-xs text-[var(--st-ink-soft)]">{SCENE_QUIPS[result.scene]}</p>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--st-ink-soft)]">
          等值是今日金额的切片，不重复计算。小票不含月薪与时薪。
        </p>

        {children}

        <button type="button" className="st-btn mt-3 w-full" onClick={onDismiss}>
          收起小票，继续下一段
        </button>
      </div>
    </section>
  )
}
