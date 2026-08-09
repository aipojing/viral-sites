import { track } from '@viral/shared'
import { RELATION_SOURCES } from '../data/mandarin-relations'
import type { RegionalLabel } from '../data/region-packs'
import type { Confidence, RelationEntry } from '../data/relation-types'
import { CorrectionPanel } from './correction-panel'
import { SaveRelationCardButton } from './save-card-button'

export interface RelationResultProps {
  entry: RelationEntry
  confidence: Confidence
  regionalLabels: readonly RegionalLabel[]
  pathLabels: readonly string[]
}

const CONFIDENCE_TEXT: Record<Confidence, string> = {
  exact: '明确',
  regional: '有地域差异',
  insufficient: '关系信息不足',
}

const LINEAGE_TEXT: Record<RelationEntry['lineage'], string> = {
  paternal: '父系',
  maternal: '母系',
  spousal: '姻亲',
  mixed: '双系',
}

/** 结果面板：第一层给可开口的称呼，第二层解释为什么这么叫 */
export function RelationResult({ entry, confidence, regionalLabels, pathLabels }: RelationResultProps) {
  const sources = RELATION_SOURCES.filter((source) => entry.sourceIds.includes(source.id))

  return (
    <section className="kcc-result" aria-label="查询结果">
      <p className="kcc-result__path">我 → {pathLabels.join(' → ')}</p>

      <div className="kcc-result__answer">
        <p className="kcc-result__label-caption">
          {entry.labels.length > 1 ? '以下叫法都正确（看 TA 比你大还是小）' : '建议叫'}
        </p>
        <p className="kcc-result__labels">
          {entry.labels.map((label) => (
            <span key={label} className="kcc-result__label">
              {label}
            </span>
          ))}
        </p>
        <p className={`kcc-result__confidence kcc-result__confidence--${confidence}`}>
          置信：{CONFIDENCE_TEXT[confidence]} · {LINEAGE_TEXT[entry.lineage]} ·{' '}
          {entry.generation > 0 ? `高 ${entry.generation} 辈` : entry.generation < 0 ? `低 ${-entry.generation} 辈` : '同辈'}
        </p>
      </div>

      <p className="kcc-result__explanation">{entry.explanation}</p>

      {entry.aliases.length > 0 && (
        <p className="kcc-result__aliases">常见别称：{entry.aliases.join('、')}</p>
      )}

      {regionalLabels.length > 0 && (
        <div className="kcc-result__regional">
          <p className="kcc-result__regional-title">地区常用叫法</p>
          <ul>
            {regionalLabels.map((item) => (
              <li key={`${item.region}-${item.label}`}>
                {item.label}（{item.region}
                {item.pronunciation ? `，读作 ${item.pronunciation}` : ''}）
              </li>
            ))}
          </ul>
        </div>
      )}

      {regionalLabels.length === 0 && (
        <p className="kcc-result__regional-empty">地域称呼包暂未上线：缺少可靠资料与母语者审核前不填猜测数据。</p>
      )}

      <details className="kcc-result__sources">
        <summary>依据与来源</summary>
        <ul>
          {sources.map((source) => (
            <li key={source.id}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => track('source_opened', { source: source.id })}
              >
                {source.title}（{source.publisher}）
              </a>
              ，复核 {source.reviewedAt}
            </li>
          ))}
        </ul>
        <p className="kcc-result__sources-note">不同家庭叫法可能有差异，开口前拿不准就先微笑问好。</p>
      </details>

      <SaveRelationCardButton
        entry={entry}
        confidence={confidence}
        pathLabels={pathLabels}
        regionalLabels={regionalLabels}
      />

      <CorrectionPanel entryId={entry.id} labels={entry.labels} />
    </section>
  )
}
