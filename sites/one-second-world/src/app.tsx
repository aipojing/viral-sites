import { track } from '@viral/shared'
import { useEffect, useRef, useState } from 'react'
import { FactSection } from './components/fact-section'
import { IntroScreen } from './components/intro-screen'
import { SnapshotBuilder } from './components/snapshot-builder'
import { SourcePanel } from './components/source-panel'
import { FACTS } from './data/facts'
import type { WorldChapter, WorldFact } from './data/fact-types'
import { CHAPTER_ORDER } from './lib/chapters'
import { durationBucket } from './lib/duration-bucket'
import { selectSnapshotFacts } from './lib/snapshot'
import { useVisibleElapsed, type VisibleElapsedOptions } from './hooks/use-visible-elapsed'

export type AppDeps = Pick<VisibleElapsedOptions, 'now' | 'raf' | 'cancelRaf'>
export { durationBucket }

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * 一秒钟世界：全站只有一个有效停留时钟，四章叙事纵向展开，
 * 来源面板与快照入口挂在同一棵树上。
 */
export function App(deps: AppDeps = {}) {
  const reducedMotion = useReducedMotion()
  const elapsedMs = useVisibleElapsed({ reducedMotion, ...deps })

  const [sourceFact, setSourceFact] = useState<WorldFact | null>(null)
  const [snapshot, setSnapshot] = useState<{
    frozenElapsedMs: number
    facts: readonly [WorldFact, WorldFact, WorldFact]
  } | null>(null)
  const elapsedRef = useRef(elapsedMs)
  elapsedRef.current = elapsedMs
  const bucketSentRef = useRef(false)

  // 页面隐藏或离开时，最多上报一次停留时长桶
  useEffect(() => {
    const sendBucket = () => {
      if (bucketSentRef.current) return
      bucketSentRef.current = true
      track('engaged_time_bucket', { bucket: durationBucket(elapsedRef.current) })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendBucket()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', sendBucket)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', sendBucket)
    }
  }, [])

  const showSource = (fact: WorldFact) => {
    track('source_opened', { source: fact.id })
    setSourceFact(fact)
  }

  // 点击定格时冻结当前有效停留时长，之后背景时钟继续走也不影响快照
  const openSnapshot = () => {
    const frozen = elapsedRef.current
    setSnapshot({ frozenElapsedMs: frozen, facts: selectSnapshotFacts(FACTS, frozen) })
  }

  const viewedChaptersRef = useRef(new Set<WorldChapter>())
  const onChapterViewed = (chapter: WorldChapter) => {
    if (viewedChaptersRef.current.has(chapter)) return
    viewedChaptersRef.current.add(chapter)
    track('chapter_viewed', { chapter })
  }

  return (
    <div className="osw-page">
      <IntroScreen elapsedMs={elapsedMs} />
      {CHAPTER_ORDER.map((chapter) => (
        <FactSection
          key={chapter}
          chapter={chapter}
          facts={FACTS.filter((fact) => fact.chapter === chapter)}
          elapsedMs={elapsedMs}
          onShowSource={showSource}
          onViewed={onChapterViewed}
        />
      ))}
      <section className="osw-snapshot-entry">
        <p className="osw-snapshot-entry__index">05</p>
        <h2 className="osw-snapshot-entry__title">定格这一刻</h2>
        <p className="osw-snapshot-entry__lede">
          把你这段停留里世界发生的三件事，定格成一张属于本次会话的快照卡。
        </p>
        <button type="button" className="osw-button" onClick={openSnapshot}>
          定格这一刻
        </button>
      </section>
      <footer className="osw-footer">
        <p>数据版本 v1 · 最后复核 2026-08-08 · 所有数字为公开统计的均值折算，带「约」语义</p>
        <p>切到后台会暂停计时；刷新页面开始新的一次停留。</p>
      </footer>
      {sourceFact && (
        <SourcePanel fact={sourceFact} elapsedMs={elapsedRef.current} onClose={() => setSourceFact(null)} />
      )}
      {snapshot && (
        <SnapshotBuilder
          candidates={FACTS.filter((fact) => fact.source.confidence === 'A')}
          initial={snapshot.facts}
          frozenElapsedMs={snapshot.frozenElapsedMs}
          onClose={() => setSnapshot(null)}
          onGenerate={() => {
            // 快照卡与保存入口将在 Task 7 中挂进 builder
          }}
        />
      )}
    </div>
  )
}
