import { useEffect, useState } from 'react'
import type { WorldFact } from '../data/fact-types'
import { formatFactValue, type DisplayValue } from '../lib/format-value'

export interface FactCardProps {
  fact: WorldFact
  elapsedMs: number
  /** 所在章节是否在视口内；不可见时保留最后一次值，不持续重算 */
  active: boolean
  onShowSource: (fact: WorldFact) => void
}

/** 每屏一个主数字：可见时实时更新，离开视口后定格在最后一次值 */
export function FactCard({ fact, elapsedMs, active, onShowSource }: FactCardProps) {
  const [frozen, setFrozen] = useState<DisplayValue>(() => formatFactValue(fact, elapsedMs))

  useEffect(() => {
    if (active) {
      setFrozen(formatFactValue(fact, elapsedMs))
    }
  }, [active, elapsedMs, fact])

  const display = active ? formatFactValue(fact, elapsedMs) : frozen
  const isEstimated = fact.source.confidence === 'B'

  return (
    <article className="osw-card" data-fact-id={fact.id} data-active={active || undefined}>
      <div className="osw-card__head">
        <h3 className="osw-card__title">{fact.title}</h3>
        <div className="osw-card__tags">
          {isEstimated && <span className="osw-badge">估算</span>}
          <span className="osw-card__region">{fact.region}</span>
        </div>
      </div>
      <p className="osw-number osw-card__value" aria-live="off">
        {display.text}
      </p>
      {display.kind === 'waiting' && <p className="osw-card__hint">这件事正在来的路上，按平均速率折算</p>}
      <p className="osw-card__explain">{fact.explanation}</p>
      <button type="button" className="osw-card__source" onClick={() => onShowSource(fact)}>
        查看数据来源
      </button>
    </article>
  )
}
