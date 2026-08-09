import { useRef, useState, type ReactNode } from 'react'
import { REPORT_LEADS } from '../content/transitions'
import type { ReportSlide } from '../lib/report-model'

export interface ReportViewerProps {
  slides: readonly ReportSlide[]
  /** 报告下方的操作区，由上层决定（分享 / 重新写 / 返回）*/
  actions?: ReactNode
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 报告阅读器：scroll-snap 竖向翻页，同时提供明确的上/下一页按钮。
 * 页码用 aria-live 播报；减少动态效果时直接跳转不做平滑滚动；全程没有声音。
 */
export function ReportViewer({ slides, actions }: ReportViewerProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  // 按钮触发的滚动会连续冒出 scroll 事件，末页更是根本滚不到位（最后一页顶部超过容器的最大滚动距离），
  // 若让这些事件反过来改页码，就会把页码拽回上一页、末页永远按不到。按完先屏蔽一段时间的同步。
  const ignoreScrollUntilRef = useRef(0)

  const goTo = (next: number) => {
    const clamped = Math.min(slides.length - 1, Math.max(0, next))
    setIndex(clamped)
    ignoreScrollUntilRef.current = Date.now() + 700
    const target = trackRef.current?.children[clamped]
    if (target instanceof HTMLElement && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    }
  }

  // 手动滚动时同步页码：取距离当前滚动位置最近的一页
  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return
    if (Date.now() < ignoreScrollUntilRef.current) return
    let nearest = 0
    let best = Number.POSITIVE_INFINITY
    for (const [position, child] of Array.from(track.children).entries()) {
      if (!(child instanceof HTMLElement)) continue
      const distance = Math.abs(child.offsetTop - track.scrollTop)
      if (distance < best) {
        best = distance
        nearest = position
      }
    }
    setIndex(nearest)
  }

  return (
    <div className="yr-viewer">
      <div className="yr-viewer__track" ref={trackRef} onScroll={handleScroll} tabIndex={0} aria-label="年度报告">
        {slides.map((slide) => (
          <article className="yr-slide" key={slide.id} aria-label={slide.title}>
            <p className="yr-slide__lead">{REPORT_LEADS[slide.kind]}</p>
            <h2 className="yr-slide__title">{slide.title}</h2>
            {slide.lines.map((line) => (
              <p className="yr-slide__line" key={line}>
                {line}
              </p>
            ))}
          </article>
        ))}
      </div>

      <div className="yr-pager">
        <button
          type="button"
          className="yr-button yr-button--ghost"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
        >
          上一页
        </button>
        <p className="yr-pager__status" role="status" aria-live="polite">
          第 {index + 1} / {slides.length} 页
        </p>
        <button
          type="button"
          className="yr-button yr-button--ghost"
          onClick={() => goTo(index + 1)}
          disabled={index === slides.length - 1}
        >
          下一页
        </button>
      </div>

      {actions}
    </div>
  )
}
