import { track } from '@viral/shared'
import { useMemo, useState } from 'react'
import { QUESTIONS } from '../content/questions'
import { isAnswered } from '../lib/answers'
import { formatAnswer } from '../lib/format-answer'
import {
  PUBLIC_FIELD_LABELS,
  SENSITIVE_PUBLIC_FIELDS,
  selectPublicAnswers,
  type PublicFieldId,
} from '../lib/public-fields'
import { buildPublicReportUrl } from '../lib/report-codec'
import type { ReportAnswers } from '../lib/report-types'
import { SaveCardButton } from './save-card-button'

export interface SharePrivacyScreenProps {
  year: number
  answers: ReportAnswers
  fields: readonly PublicFieldId[]
  onToggleField: (id: PublicFieldId) => void
  onBack: () => void
}

const SENSITIVE_NOTES: Partial<Record<PublicFieldId, string>> = {
  place: '会暴露你今年去过哪里',
  'important-person': '会暴露另一个人的信息，建议先问过 TA',
  'hard-moment': '这是你最私人的一条，公开前想清楚',
}

/**
 * 分享前的字段级隐私选择：图片和完整链接共用同一份勾选。
 * 敏感三项默认关闭并单独说明；完整链接默认折叠，展开后还要再确认一次不可撤回。
 */
export function SharePrivacyScreen({ year, answers, fields, onToggleField, onBack }: SharePrivacyScreenProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [tooLong, setTooLong] = useState(false)

  const publicAnswers = useMemo(() => selectPublicAnswers(answers, fields), [answers, fields])
  const fieldCount = Object.keys(publicAnswers).length
  // 勾选一变，已生成的链接立刻失效，避免用户拿着旧链接以为改动生效了
  const answeredQuestions = QUESTIONS.filter((question) => isAnswered(answers, question.id))

  const handleToggle = (id: PublicFieldId) => {
    setLink(null)
    setTooLong(false)
    onToggleField(id)
  }

  const handleCreateLink = () => {
    const url = buildPublicReportUrl(new URL(window.location.href), {
      version: 1,
      year,
      answers: publicAnswers,
    })
    if (!url) {
      setTooLong(true)
      setLink(null)
      return
    }
    setTooLong(false)
    setLink(url)
    track('share_link_created', { version: 1, field_count: fieldCount })
    void navigator.clipboard?.writeText(url).catch(() => undefined)
  }

  return (
    <section className="yr-card">
      <h2 className="yr-card__title">选择要公开的内容</h2>
      <p className="yr-card__note">
        下面勾上的就是允许公开的内容。总结卡是摘要，版面不足时会优先展示核心条目；
        完整链接才会包含全部勾选项。默认只公开四项，敏感的三项默认关着。
      </p>

      <div role="group" aria-label="公开字段">
        {answeredQuestions.map((question) => {
          const checked = fields.includes(question.id)
          const sensitive = SENSITIVE_PUBLIC_FIELDS.includes(question.id)
          return (
            <label className="yr-privacy__field" key={question.id}>
              <input
                className="yr-privacy__checkbox"
                type="checkbox"
                checked={checked}
                onChange={() => handleToggle(question.id)}
              />
              <span>
                {PUBLIC_FIELD_LABELS[question.id]}
                {sensitive && (
                  <span className="yr-privacy__sensitive">默认不公开 · {SENSITIVE_NOTES[question.id]}</span>
                )}
                {checked && (
                  <span className="yr-privacy__preview">{formatAnswer(question.id, answers[question.id])}</span>
                )}
              </span>
            </label>
          )
        })}
      </div>

      <p className="yr-progress" style={{ marginTop: 14 }} role="status">
        会公开 {fieldCount} 项
      </p>

      <div style={{ marginTop: 16 }}>
        <SaveCardButton year={year} publicAnswers={publicAnswers} />
      </div>

      <div style={{ marginTop: 18 }}>
        {!linkOpen ? (
          <button type="button" className="yr-button yr-button--ghost yr-button--block" onClick={() => setLinkOpen(true)}>
            我还想生成一条完整链接
          </button>
        ) : (
          <div>
            <p className="yr-card__note">
              任何拿到链接的人都能查看，转发之后无法撤回。内容只写在链接的 # 之后，服务器拿不到。
            </p>
            <label className="yr-privacy__field">
              <input
                className="yr-privacy__checkbox"
                type="checkbox"
                checked={confirmed}
                onChange={() => setConfirmed(!confirmed)}
              />
              <span>我知道链接一旦转发就收不回来了</span>
            </label>
            <button type="button" className="yr-button" onClick={handleCreateLink} disabled={!confirmed}>
              生成链接并复制
            </button>
            {tooLong && (
              <p className="yr-error">
                勾选的内容太长，装不进一条链接。取消几项再试，或者直接发上面那张图。
              </p>
            )}
            {link && (
              <>
                <p className="yr-link-box">{link}</p>
                <p className="yr-card__note">已尝试复制到剪贴板；没成功就长按上面的地址手动复制。</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="yr-actions" style={{ marginTop: 18 }}>
        <button type="button" className="yr-button yr-button--quiet" onClick={onBack}>
          返回报告
        </button>
      </div>
    </section>
  )
}
