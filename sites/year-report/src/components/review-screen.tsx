import { QUESTIONS } from '../content/questions'
import { formatAnswer } from '../lib/format-answer'
import { PUBLIC_FIELD_LABELS } from '../lib/public-fields'
import type { QuestionId, ReportAnswers } from '../lib/report-types'

export interface ReviewScreenProps {
  year: number
  answers: ReportAnswers
  onEdit: (id: QuestionId) => void
  /** 「删掉这条」：把该题恢复成跳过，报告里整段不出现 */
  onClear: (id: QuestionId) => void
  onGenerate: () => void
}

/**
 * 生成前的复核页：十题逐条列出，任一条都能重新编辑或直接删掉。
 * 这是答案离开答题流程前的最后一次确认，删掉后报告与分享都不会再出现它。
 */
export function ReviewScreen({ year, answers, onEdit, onClear, onGenerate }: ReviewScreenProps) {
  return (
    <section className="yr-card">
      <h2 className="yr-card__title">{year} 年，你写下的十条</h2>
      <p className="yr-card__note">生成前再看一眼。删掉的条目不会出现在报告、卡片和分享链接里。</p>

      <div>
        {QUESTIONS.map((question) => {
          const text = formatAnswer(question.id, answers[question.id])
          return (
            <div className="yr-review__item" key={question.id}>
              <p className="yr-review__label">{PUBLIC_FIELD_LABELS[question.id]}</p>
              <p className={`yr-review__value${text ? '' : ' yr-review__value--empty'}`}>
                {text ?? '跳过了'}
              </p>
              <div className="yr-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="yr-button yr-button--quiet"
                  onClick={() => onEdit(question.id)}
                >
                  {text ? '改一改' : '现在写'}
                </button>
                {text && (
                  <button
                    type="button"
                    className="yr-button yr-button--quiet"
                    onClick={() => onClear(question.id)}
                  >
                    删掉这条
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="yr-actions" style={{ marginTop: 18 }}>
        <button type="button" className="yr-button yr-button--block" onClick={onGenerate}>
          生成我的年度报告
        </button>
      </div>
    </section>
  )
}
