import { track } from '@viral/shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PopularGrid } from './components/popular-grid'
import { RelationBuilder } from './components/relation-builder'
import { RelationResult } from './components/relation-result'
import { ReverseSearch } from './components/reverse-search'
import { MANDARIN_RELATIONS } from './data/mandarin-relations'
import {
  RELATION_TOKEN_LABELS,
  type RelationToken,
  type SubjectGender,
} from './data/relation-types'
import { appendRelation, removeLastRelation } from './lib/path'
import { resolveRelation } from './lib/resolve-relation'

type Mode = 'chain' | 'reverse' | 'popular'

const MODES: readonly { id: Mode; label: string }[] = [
  { id: 'chain', label: '关系链查询' },
  { id: 'reverse', label: '称呼反查' },
  { id: 'popular', label: '热门速查' },
]

/**
 * 亲戚称呼计算器：三个入口共用同一份人工审核 corpus。
 * 只做精确匹配，未覆盖就明说「暂未覆盖」，不猜。
 */
export function App() {
  const [mode, setMode] = useState<Mode>('chain')
  const [path, setPath] = useState<readonly RelationToken[]>([])
  const [gender, setGender] = useState<SubjectGender>('unspecified')
  const [directEntryId, setDirectEntryId] = useState<string | null>(null)
  const lastTracked = useRef('')

  const resolution = useMemo(() => resolveRelation({ path, subjectGender: gender }), [path, gender])
  const directEntry = directEntryId
    ? MANDARIN_RELATIONS.find((entry) => entry.id === directEntryId) ?? null
    : null

  // 链路结果变化时上报查询成败；签名防重，避免重复计数
  useEffect(() => {
    if (mode !== 'chain' || path.length === 0) return
    const signature = `${resolution.status}:${gender}:${path.join('>')}`
    if (signature === lastTracked.current) return
    lastTracked.current = signature
    if (resolution.status === 'resolved') {
      track('query_resolved')
      track('generate', { mode: 'relation' })
    } else if (resolution.status === 'unresolved') {
      track('query_unresolved', { reason: resolution.reason })
    }
  }, [resolution, gender, path, mode])

  const handleAdd = (token: RelationToken) => {
    try {
      setPath(appendRelation(path, token))
    } catch {
      return
    }
    setGender('unspecified')
    setDirectEntryId(null)
    if (path.length === 0) track('query_started')
    track('relation_step_added', { relation: token })
  }

  const handleUndo = () => {
    setPath(removeLastRelation(path))
    setGender('unspecified')
  }

  const handleClear = () => {
    setPath([])
    setGender('unspecified')
    setDirectEntryId(null)
    lastTracked.current = ''
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    // 切入口时清掉上一条直达结果，避免跨 tab 残留旧面板
    setDirectEntryId(null)
  }

  const pathLabels = path.map((token) => RELATION_TOKEN_LABELS[token])

  return (
    <main className="kcc-app">
      <header className="kcc-header">
        <h1 className="kcc-header__title">亲戚称呼计算器</h1>
        <p className="kcc-header__subtitle">过年别叫错。点出关系链，马上知道该怎么开口。</p>
      </header>

      <nav className="kcc-tabs" aria-label="查询入口">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`kcc-tab${mode === item.id ? ' kcc-tab--active' : ''}`}
            aria-pressed={mode === item.id}
            onClick={() => switchMode(item.id)}
          >
            {item.label}
            {item.id === 'reverse' && <span className="kcc-tab__beta">Beta</span>}
          </button>
        ))}
      </nav>

      {mode === 'chain' && (
        <>
          <RelationBuilder path={path} onAdd={handleAdd} onUndo={handleUndo} onClear={handleClear} />

          {path.length >= 6 && (
            <p className="kcc-egg" role="note">
              稳妥方案：先叫「您好」——关系链太长时，微笑问好永远不出错。真实结果仍然在下面。
            </p>
          )}

          {resolution.status === 'needs-gender' && (
            <div className="kcc-gender" role="group" aria-label="追问你的性别">
              <p className="kcc-gender__question">这个称呼会随你的性别变化，你是——</p>
              <button type="button" className="kcc-button" onClick={() => setGender('male')}>
                男生
              </button>
              <button type="button" className="kcc-button" onClick={() => setGender('female')}>
                女生
              </button>
            </div>
          )}

          {resolution.status === 'resolved' &&
            resolution.entries.map((item) => (
              <RelationResult
                key={item.entry.id}
                entry={item.entry}
                confidence={resolution.confidence}
                regionalLabels={item.regionalLabels}
                pathLabels={pathLabels}
              />
            ))}

          {resolution.status === 'unresolved' && path.length > 0 && (
            <p className="kcc-uncovered" role="status">
              {resolution.reason === 'too-distant'
                ? '关系链太远了。v1 只覆盖三代以内血亲、常见姻亲和堂表关系。'
                : '暂未覆盖：这条关系链还没有经过人工审核，我们不猜称谓。可以换个思路从更近的亲属查起。'}
            </p>
          )}
        </>
      )}

      {mode === 'reverse' && (
        <ReverseSearch
          onSelect={(entry) => setDirectEntryId(entry.id)}
        />
      )}

      {mode === 'popular' && (
        <PopularGrid
          onSelect={(entryId) => {
            track('query_started', { mode: 'popular' })
            setDirectEntryId(entryId)
          }}
        />
      )}

      {directEntry && (
        <RelationResult
          entry={directEntry}
          confidence="exact"
          regionalLabels={[]}
          pathLabels={directEntry.paths[0].map((token) => RELATION_TOKEN_LABELS[token])}
        />
      )}

      <footer className="kcc-footer">
        称谓数据版本 v1 · 最后复核 2026-08-09 · 关系链只在本机计算，不上传任何姓名与链路
      </footer>
    </main>
  )
}
