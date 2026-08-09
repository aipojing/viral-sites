import type { ChapterTransition } from '../content/transitions'

export interface ChapterBreakProps {
  transition: ChapterTransition
  onContinue: () => void
}

/** 章节过渡：只交代接下来问什么，不评价已经填的内容 */
export function ChapterBreak({ transition, onContinue }: ChapterBreakProps) {
  return (
    <section className="yr-chapter" aria-live="polite">
      <h2 className="yr-chapter__title">{transition.title}</h2>
      <p className="yr-chapter__line">{transition.line}</p>
      <div className="yr-actions" style={{ marginTop: 20, justifyContent: 'center' }}>
        <button type="button" className="yr-button" onClick={onContinue}>
          继续
        </button>
      </div>
    </section>
  )
}
