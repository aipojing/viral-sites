import { RELATION_TOKENS, RELATION_TOKEN_LABELS, type RelationToken } from '../data/relation-types'
import { MAX_RELATION_DEPTH } from '../lib/path'

export interface RelationBuilderProps {
  path: readonly RelationToken[]
  onAdd: (token: RelationToken) => void
  onUndo: () => void
  onClear: () => void
}

/** 关系链逐级点选：顶部可撤销面包屑，下方单手关系按钮 */
export function RelationBuilder({ path, onAdd, onUndo, onClear }: RelationBuilderProps) {
  const atLimit = path.length >= MAX_RELATION_DEPTH

  return (
    <div className="kcc-builder">
      <div className="kcc-builder__crumbs" aria-live="polite">
        <span className="kcc-builder__crumb kcc-builder__crumb--self">我</span>
        {path.map((token, index) => (
          <span key={`${token}-${index}`} className="kcc-builder__crumb">
            <span className="kcc-builder__arrow" aria-hidden="true">
              →
            </span>
            {RELATION_TOKEN_LABELS[token]}
          </span>
        ))}
        {path.length === 0 && <span className="kcc-builder__placeholder">TA 是你的谁的谁？</span>}
      </div>

      <div className="kcc-builder__actions">
        <button type="button" className="kcc-button kcc-button--ghost" onClick={onUndo} disabled={path.length === 0}>
          撤销一级
        </button>
        <button type="button" className="kcc-button kcc-button--ghost" onClick={onClear} disabled={path.length === 0}>
          清空重选
        </button>
      </div>

      <p className="kcc-builder__question">点一下，TA 是你的——</p>
      <div className="kcc-builder__grid" role="group" aria-label="关系按钮">
        {RELATION_TOKENS.map((token) => (
          <button
            key={token}
            type="button"
            className="kcc-builder__token"
            onClick={() => onAdd(token)}
            disabled={atLimit}
          >
            {RELATION_TOKEN_LABELS[token]}
          </button>
        ))}
      </div>
      {atLimit && <p className="kcc-builder__limit">关系链最多 {MAX_RELATION_DEPTH} 级，先撤销一级再继续。</p>}
    </div>
  )
}
