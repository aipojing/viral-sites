import { track } from '@viral/shared'
import { useEffect, useState } from 'react'
import type { WorldFact } from '../data/fact-types'
import { CHAPTER_META } from '../lib/chapters'
import { durationBucket } from '../lib/duration-bucket'
import { formatFactValue } from '../lib/format-value'
import { replaceSnapshotFact, type SnapshotItem } from '../lib/snapshot'
import { SaveCardButton } from './save-card-button'

export interface SnapshotBuilderProps {
  /** 可替换候选池（A 级事实），已在快照中的事实会自动排除 */
  candidates: readonly WorldFact[]
  initial: readonly [WorldFact, WorldFact, WorldFact]
  /** 点击定格时冻结的有效停留毫秒数，之后不再随背景时钟变化 */
  frozenElapsedMs: number
  onClose: () => void
  onGenerate: (items: readonly [SnapshotItem, SnapshotItem, SnapshotItem]) => void
}

function toTriple<T>(items: readonly T[]): readonly [T, T, T] {
  return [items[0], items[1], items[2]]
}

/**
 * 定格这一刻：三条事实与冻结时刻的数值只读展示，
 * 用户只能替换事实，不能编辑数字。
 */
export function SnapshotBuilder({
  candidates,
  initial,
  frozenElapsedMs,
  onClose,
  onGenerate,
}: SnapshotBuilderProps) {
  const [facts, setFacts] = useState<readonly WorldFact[]>(initial)
  const [generated, setGenerated] = useState<readonly [SnapshotItem, SnapshotItem, SnapshotItem] | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const frozenSeconds = Math.floor(frozenElapsedMs / 1000)

  const handleReplace = (slot: number, id: string) => {
    const candidate = candidates.find((fact) => fact.id === id)
    if (!candidate) return
    try {
      setFacts(replaceSnapshotFact(facts, slot, candidate))
      // 事实变了，已生成的快照卡作废，需要重新定格
      setGenerated(null)
    } catch {
      // 候选列表已过滤违规项，这里是防御性兜底：保持原快照不变
    }
  }

  const handleGenerate = () => {
    const items = toTriple(
      facts.map((fact) => ({
        fact,
        display: formatFactValue(fact, frozenElapsedMs),
      })),
    )
    track('generate', { kind: 'snapshot' })
    track('snapshot_generated', { duration_bucket: durationBucket(frozenElapsedMs) })
    setGenerated(items)
    onGenerate(items)
  }

  return (
    <div className="osw-panel-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="定格这一刻"
        className="osw-panel osw-snapshot"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="osw-panel__head">
          <button type="button" className="osw-panel__close" onClick={onClose} aria-label="关闭快照编辑">
            关闭
          </button>
        </header>
        <h3 className="osw-panel__title">定格这一刻</h3>
        <p className="osw-snapshot__sub">
          你在这个世界停留的 {frozenSeconds} 秒已经冻结，下面的数字不再变化。
        </p>
        <ol className="osw-snapshot__list">
          {facts.map((fact, slot) => {
            const display = formatFactValue(fact, frozenElapsedMs)
            const options = candidates.filter((candidate) => {
              try {
                replaceSnapshotFact(facts, slot, candidate)
                return true
              } catch {
                return false
              }
            })
            return (
              <li key={fact.id} className="osw-snapshot__item">
                <span className="osw-snapshot__chapter">{CHAPTER_META[fact.chapter].title}</span>
                <p className="osw-snapshot__fact-title">{fact.title}</p>
                <p className="osw-snapshot__value">
                  {display.kind === 'count' ? `约 ${display.text}` : display.text}
                </p>
                <select
                  className="osw-snapshot__replace"
                  value={fact.id}
                  aria-label={`替换「${fact.title}」`}
                  onChange={(event) => handleReplace(slot, event.target.value)}
                >
                  <option value={fact.id}>保留这条</option>
                  {options.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      换成：{candidate.title}
                    </option>
                  ))}
                </select>
              </li>
            )
          })}
        </ol>
        {generated ? (
          <SaveCardButton elapsedMs={frozenElapsedMs} items={generated} />
        ) : (
          <button type="button" className="osw-snapshot__generate" onClick={handleGenerate}>
            生成快照卡
          </button>
        )}
      </section>
    </div>
  )
}
