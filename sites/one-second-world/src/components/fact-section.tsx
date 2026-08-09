import { useEffect, useRef, useState } from 'react'
import type { WorldChapter, WorldFact } from '../data/fact-types'
import { CHAPTER_META } from '../lib/chapters'
import { defaultObserverFactory, type ObserverFactory } from '../lib/observer'
import { FactCard } from './fact-card'

export interface FactSectionProps {
  chapter: WorldChapter
  facts: readonly WorldFact[]
  elapsedMs: number
  onShowSource: (fact: WorldFact) => void
  /** 章节首次进入视口时触发一次（埋点用） */
  onViewed?: (chapter: WorldChapter) => void
  observerFactory?: ObserverFactory
}

/**
 * 一个章节只维护自己是否 active：进入视口才让卡片实时更新，
 * 离开后卡片定格，不启动独立 timer。
 */
export function FactSection({
  chapter,
  facts,
  elapsedMs,
  onShowSource,
  onViewed,
  observerFactory = defaultObserverFactory,
}: FactSectionProps) {
  const meta = CHAPTER_META[chapter]
  const sectionRef = useRef<HTMLElement | null>(null)
  const [active, setActive] = useState(false)
  const viewedRef = useRef(false)
  // 用 ref 稳定回调，观察器 effect 不因父组件重渲染而重建
  const onViewedRef = useRef(onViewed)
  onViewedRef.current = onViewed

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return
    const observer = observerFactory((intersecting) => {
      setActive(intersecting)
      if (intersecting && !viewedRef.current) {
        viewedRef.current = true
        onViewedRef.current?.(chapter)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [chapter, observerFactory])

  return (
    <section
      ref={sectionRef}
      className="osw-chapter"
      id={`osw-chapter-${chapter}`}
      data-chapter={chapter}
      aria-labelledby={`osw-chapter-title-${chapter}`}
    >
      <header className="osw-chapter__head">
        <p className="osw-kicker">第 {meta.index} 章</p>
        <h2 className="osw-chapter__title" id={`osw-chapter-title-${chapter}`}>
          {meta.title}
        </h2>
        <p className="osw-chapter__lede">{meta.lede}</p>
      </header>
      <div className="osw-chapter__cards">
        {facts.map((fact) => (
          <FactCard
            key={fact.id}
            fact={fact}
            elapsedMs={elapsedMs}
            active={active}
            onShowSource={onShowSource}
          />
        ))}
      </div>
    </section>
  )
}
