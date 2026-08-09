import { useEffect } from 'react'
import type { WorldFact } from '../data/fact-types'
import { accumulatedValue, periodLabel, periodSeconds } from '../lib/rate'

export interface SourcePanelProps {
  fact: WorldFact
  /** 定格打开面板时的有效停留毫秒数，换算式以此为准 */
  elapsedMs: number
  onClose: () => void
}

/** 来源面板：展示发布机构、口径、原始值与完整换算式，B 级明写「估算」 */
export function SourcePanel({ fact, elapsedMs, onClose }: SourcePanelProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const seconds = Math.max(0, elapsedMs) / 1000
  const periodSecs = periodSeconds(fact.period)
  const raw = accumulatedValue(fact, elapsedMs)
  const estimated = fact.source.confidence === 'B'

  return (
    <div className="osw-panel-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`数据来源：${fact.title}`}
        className="osw-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="osw-panel__head">
          <span className={estimated ? 'osw-badge' : 'osw-badge osw-badge--a'}>
            {estimated ? 'B 级来源 · 估算' : 'A 级来源'}
          </span>
          <button type="button" className="osw-panel__close" onClick={onClose} aria-label="关闭来源面板">
            关闭
          </button>
        </header>
        <h3 className="osw-panel__title">{fact.title}</h3>
        <dl className="osw-panel__meta">
          <div>
            <dt>发布机构</dt>
            <dd>{fact.source.publisher}</dd>
          </div>
          <div>
            <dt>口径</dt>
            <dd>
              {periodLabel(fact.period)} · {fact.region}
            </dd>
          </div>
          <div>
            <dt>发布 / 复核</dt>
            <dd>
              {fact.source.publishedAt} · 复核于 {fact.source.reviewedAt}
            </dd>
          </div>
        </dl>
        <p className="osw-panel__formula">
          换算式：{fact.value.toLocaleString('zh-CN')}（原始值） ÷ {Math.round(periodSecs).toLocaleString('zh-CN')}
          （周期秒数） × {seconds.toFixed(1)}（本次有效秒数） ≈ {raw.toPrecision(6)} {fact.outputUnit}
        </p>
        <p className="osw-panel__explain">{fact.explanation}</p>
        <a
          className="osw-panel__link"
          href={fact.source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          打开原始来源：{fact.source.title}
        </a>
      </section>
    </div>
  )
}
