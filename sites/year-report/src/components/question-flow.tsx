import { useState } from 'react'
import { transitionOf } from '../content/transitions'
import { isAnsweredValue, truncateCodePoints } from '../lib/answers'
import { isGoalAnswer, type AnswerValue, type GoalAnswer, type Question } from '../lib/report-types'

export interface QuestionFlowProps {
  question: Question
  index: number
  total: number
  /** 上次填过的答案，返回修改时用 */
  initialValue: AnswerValue | undefined
  onSubmit: (value: AnswerValue | undefined) => void
  onBack: (() => void) | null
}

const GOAL_DEFAULT_COMPLETION = 50

function initialText(value: AnswerValue | undefined): string {
  return typeof value === 'string' ? value : ''
}

function initialGoal(value: AnswerValue | undefined): GoalAnswer {
  return isGoalAnswer(value) ? value : { completion: GOAL_DEFAULT_COMPLETION, release: '' }
}

/**
 * 单题界面：题面 + 示例 + 输入 + 继续/跳过/上一题。
 * 头部显示当前章节标题，跳过与继续同级别可见；空白提交等同跳过。
 * 父级用 key={question.id} 渲染，切题时输入状态自然重置。
 */
export function QuestionFlow({ question, index, total, initialValue, onSubmit, onBack }: QuestionFlowProps) {
  const [text, setText] = useState(() => initialText(initialValue))
  const [scale, setScale] = useState<number | null>(() =>
    typeof initialValue === 'number' ? initialValue : null,
  )
  const [goal, setGoal] = useState<GoalAnswer>(() => initialGoal(initialValue))

  const chapter = transitionOf(question.chapter)
  const maxLength = question.maxLength ?? 60
  const percent = Math.round((index / total) * 100)

  const collect = (): AnswerValue | undefined => {
    if (question.kind === 'scale') return scale ?? undefined
    if (question.kind === 'goal') return goal
    return text.trim() === '' ? undefined : text
  }

  const handleContinue = () => {
    onSubmit(collect())
  }

  return (
    <section className="yr-card" aria-labelledby="yr-question-prompt">
      <p className="yr-progress" aria-live="polite">
        第 {index + 1} / {total} 题
      </p>
      <div className="yr-progress__bar" aria-hidden="true">
        <div className="yr-progress__fill" style={{ width: `${percent}%` }} />
      </div>

      <p className="yr-question__chapter" style={{ marginTop: 14 }}>
        {chapter.title}
      </p>
      <h2 className="yr-question__prompt" id="yr-question-prompt">
        {question.prompt}
      </h2>
      <p className="yr-question__example">{question.example}</p>
      {question.hint && <p className="yr-question__hint">{question.hint}</p>}

      {(question.kind === 'text' || question.kind === 'keyword') && (
        <>
          {question.kind === 'keyword' ? (
            <input
              className="yr-input"
              type="text"
              value={text}
              aria-label={question.prompt}
              onChange={(event) => setText(truncateCodePoints(event.target.value, maxLength))}
            />
          ) : (
            <textarea
              className="yr-textarea"
              value={text}
              aria-label={question.prompt}
              onChange={(event) => setText(truncateCodePoints(event.target.value, maxLength))}
            />
          )}
          <p className="yr-counter">
            {[...text].length} / {maxLength}
          </p>
          {question.presets && (
            <div className="yr-chips" role="group" aria-label="常见关键词">
              {question.presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`yr-chip${text === preset ? ' yr-chip--active' : ''}`}
                  aria-pressed={text === preset}
                  onClick={() => setText(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {question.kind === 'scale' && (
        <div className="yr-scale" role="group" aria-label={question.prompt}>
          {(question.scaleLabels ?? []).map((label, labelIndex) => {
            const value = labelIndex + 1
            return (
              <button
                key={label}
                type="button"
                className={`yr-scale__option${scale === value ? ' yr-scale__option--active' : ''}`}
                aria-pressed={scale === value}
                onClick={() => setScale(value)}
              >
                <span className="yr-scale__index">{value}</span>
                {label}
              </button>
            )
          })}
        </div>
      )}

      {question.kind === 'goal' && (
        <>
          <label className="yr-question__hint" htmlFor="yr-goal-completion">
            走到 {goal.completion}%
          </label>
          <input
            id="yr-goal-completion"
            className="yr-slider"
            type="range"
            min={0}
            max={100}
            step={5}
            value={goal.completion}
            onChange={(event) => setGoal({ ...goal, completion: Number(event.target.value) })}
          />
          <p className="yr-question__hint" style={{ marginTop: 16 }}>
            {question.releasePrompt}
          </p>
          <textarea
            className="yr-textarea"
            value={goal.release}
            aria-label={question.releasePrompt}
            onChange={(event) =>
              setGoal({ ...goal, release: truncateCodePoints(event.target.value, maxLength) })
            }
          />
          <p className="yr-counter">
            {[...goal.release].length} / {maxLength}
          </p>
        </>
      )}

      <div className="yr-actions" style={{ marginTop: 18 }}>
        <button type="button" className="yr-button" onClick={handleContinue}>
          继续
        </button>
        <button type="button" className="yr-button yr-button--ghost" onClick={() => onSubmit(undefined)}>
          跳过这题
        </button>
        {onBack && (
          <button type="button" className="yr-button yr-button--quiet" onClick={onBack}>
            上一题
          </button>
        )}
      </div>
      {!isAnsweredValue(collect()) && (
        <p className="yr-question__hint">留空点「继续」也算跳过，报告里就不会出现这一段。</p>
      )}
    </section>
  )
}
