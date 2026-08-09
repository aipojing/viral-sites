import { track } from '@viral/shared'
import { useEffect, useRef, useState } from 'react'
import { ChapterBreak } from './components/chapter-break'
import { LandingScreen } from './components/landing-screen'
import { PublicReport } from './components/public-report'
import { QuestionFlow } from './components/question-flow'
import { ReportViewer } from './components/report-viewer'
import { ReviewScreen } from './components/review-screen'
import { SharePrivacyScreen } from './components/share-privacy-screen'
import { CHAPTER_ORDER, QUESTIONS } from './content/questions'
import { transitionOf } from './content/transitions'
import { answeredCount, normalizeAnswer } from './lib/answers'
import { browserDraftStorage, clearDraft, loadDraft, saveDraft, type DraftV1 } from './lib/draft-storage'
import { consumeReportFragment } from './lib/fragment-bootstrap'
import {
  DEFAULT_PUBLIC_FIELDS,
  togglePublicField,
  type PublicFieldId,
  type PublicReportPayload,
} from './lib/public-fields'
import { readReportFragment } from './lib/report-codec'
import { buildReportSlides } from './lib/report-model'
import { currentReportYear } from './lib/report-year'
import type { AnswerValue, ChapterId, QuestionId, ReportAnswers } from './lib/report-types'

type AppState =
  | { screen: 'landing' }
  | { screen: 'break'; chapter: ChapterId }
  | { screen: 'questions'; index: number; fromReview: boolean }
  | { screen: 'review' }
  | { screen: 'report' }
  | { screen: 'share' }
  | { screen: 'public'; payload: PublicReportPayload }
  | { screen: 'broken' }

export interface AppProps {
  /** 直接注入分享 fragment（本地调试与测试用）；生产路径由 HTML bootstrap 提供 */
  fragment?: string
}

function chapterOf(index: number): ChapterId {
  return QUESTIONS[index]!.chapter
}

/** 该题是不是本章第一题：是则进入前先放章节过渡 */
function isChapterStart(index: number): boolean {
  return index === 0 || chapterOf(index - 1) !== chapterOf(index)
}

function firstIndexOfChapter(chapter: ChapterId): number {
  return QUESTIONS.findIndex((question) => question.chapter === chapter)
}

export function App({ fragment: injectedFragment }: AppProps = {}) {
  const year = useState(() => currentReportYear())[0]
  const fragment = useState(() =>
    injectedFragment === undefined ? consumeReportFragment() : readReportFragment(injectedFragment),
  )[0]

  const [state, setState] = useState<AppState>(() => {
    if (fragment === 'invalid') return { screen: 'broken' }
    if (fragment) return { screen: 'public', payload: fragment }
    return { screen: 'landing' }
  })
  const [answers, setAnswers] = useState<ReportAnswers>({})
  const [draftStorage, setDraftStorage] = useState<Storage | null>(null)
  const [fields, setFields] = useState<readonly PublicFieldId[]>(DEFAULT_PUBLIC_FIELDS)
  // 首屏只读一次草稿；接收者视图完全不碰存储
  const [resume, setResume] = useState<DraftV1 | null>(() => {
    if (fragment) return null
    const result = loadDraft(browserDraftStorage(), year)
    return result.status === 'found' ? result.draft : null
  })

  // 接收者视图只在挂载时上报一次，且只带字段数量
  const openTracked = useRef(false)
  useEffect(() => {
    if (openTracked.current || !fragment || fragment === 'invalid') return
    openTracked.current = true
    track('share_report_opened', {
      version: fragment.version,
      field_count: Object.keys(fragment.answers).length,
    })
  }, [fragment])

  const persist = (storage: Storage | null, nextAnswers: ReportAnswers, nextIndex: number) => {
    if (!storage) return
    saveDraft(storage, {
      version: 1,
      reportYear: year,
      currentQuestion: Math.min(nextIndex, QUESTIONS.length - 1),
      answers: nextAnswers,
      updatedAt: Date.now(),
    })
  }

  const startFresh = (keepDraft: boolean) => {
    const storage = keepDraft ? browserDraftStorage() : null
    setDraftStorage(storage)
    setAnswers({})
    setResume(null)
    if (keepDraft) clearDraft(storage)
    track('report_started', { mode: keepDraft ? 'draft' : 'no-draft' })
    setState({ screen: 'break', chapter: CHAPTER_ORDER[0]! })
  }

  const handleResume = () => {
    if (!resume) return
    const storage = browserDraftStorage()
    setDraftStorage(storage)
    setAnswers(resume.answers)
    track('draft_resumed')
    track('report_started', { mode: 'resume' })
    setState({ screen: 'questions', index: resume.currentQuestion, fromReview: false })
  }

  const handleDiscardDraft = () => {
    clearDraft(browserDraftStorage())
    setResume(null)
    track('draft_cleared')
  }

  const handleSubmit = (value: AnswerValue | undefined) => {
    if (state.screen !== 'questions') return
    const question = QUESTIONS[state.index]!
    const normalized = normalizeAnswer(question, value)
    const nextAnswers: ReportAnswers = { ...answers }
    if (normalized === undefined) delete nextAnswers[question.id]
    else nextAnswers[question.id] = normalized
    setAnswers(nextAnswers)
    track('question_completed', {
      question: question.id,
      skipped: normalized === undefined ? 'skipped' : 'answered',
    })

    if (state.fromReview) {
      persist(draftStorage, nextAnswers, state.index)
      setState({ screen: 'review' })
      return
    }

    const nextIndex = state.index + 1
    persist(draftStorage, nextAnswers, nextIndex)
    if (nextIndex >= QUESTIONS.length) {
      setState({ screen: 'review' })
      return
    }
    if (isChapterStart(nextIndex)) {
      setState({ screen: 'break', chapter: chapterOf(nextIndex) })
      return
    }
    setState({ screen: 'questions', index: nextIndex, fromReview: false })
  }

  const handleGenerate = () => {
    clearDraft(draftStorage)
    setFields(DEFAULT_PUBLIC_FIELDS)
    track('generate', { slug: 'year-report' })
    setState({ screen: 'report' })
  }

  const restart = () => {
    clearDraft(draftStorage)
    setAnswers({})
    setResume(null)
    setState({ screen: 'landing' })
  }

  return (
    <main className="yr-app">
      {state.screen === 'landing' && (
        <LandingScreen
          year={year}
          resume={resume}
          answeredCount={resume ? answeredCount(resume.answers) : 0}
          onStart={startFresh}
          onResume={handleResume}
          onDiscard={handleDiscardDraft}
        />
      )}

      {state.screen === 'break' && (
        <ChapterBreak
          transition={transitionOf(state.chapter)}
          onContinue={() =>
            setState({ screen: 'questions', index: firstIndexOfChapter(state.chapter), fromReview: false })
          }
        />
      )}

      {state.screen === 'questions' && (
        <QuestionFlow
          key={QUESTIONS[state.index]!.id}
          question={QUESTIONS[state.index]!}
          index={state.index}
          total={QUESTIONS.length}
          initialValue={answers[QUESTIONS[state.index]!.id]}
          onSubmit={handleSubmit}
          onBack={
            state.fromReview
              ? () => setState({ screen: 'review' })
              : state.index > 0
                ? () => setState({ screen: 'questions', index: state.index - 1, fromReview: false })
                : null
          }
        />
      )}

      {state.screen === 'review' && (
        <ReviewScreen
          year={year}
          answers={answers}
          onEdit={(id: QuestionId) =>
            setState({
              screen: 'questions',
              index: QUESTIONS.findIndex((question) => question.id === id),
              fromReview: true,
            })
          }
          onClear={(id: QuestionId) => {
            const nextAnswers: ReportAnswers = { ...answers }
            delete nextAnswers[id]
            setAnswers(nextAnswers)
            persist(draftStorage, nextAnswers, QUESTIONS.length - 1)
          }}
          onGenerate={handleGenerate}
        />
      )}

      {state.screen === 'report' && (
        <>
          <header className="yr-header">
            <p className="yr-header__year">{year}</p>
            <h1 className="yr-header__title">你的年度报告</h1>
            <p className="yr-header__subtitle">全部内容都来自你自己写的那十条，跳过的题不会出现。</p>
          </header>
          <ReportViewer
            slides={buildReportSlides(year, answers)}
            actions={
              <div className="yr-actions">
                <button
                  type="button"
                  className="yr-button yr-button--block"
                  onClick={() => setState({ screen: 'share' })}
                >
                  保存或分享
                </button>
                <button type="button" className="yr-button yr-button--quiet" onClick={restart}>
                  重新写一份
                </button>
              </div>
            }
          />
        </>
      )}

      {state.screen === 'share' && (
        <SharePrivacyScreen
          year={year}
          answers={answers}
          fields={fields}
          onToggleField={(id) => setFields(togglePublicField(fields, id))}
          onBack={() => setState({ screen: 'report' })}
        />
      )}

      {state.screen === 'public' && (
        <PublicReport payload={state.payload} onStartOwn={() => setState({ screen: 'landing' })} />
      )}

      {state.screen === 'broken' && (
        <section className="yr-card">
          <h1 className="yr-card__title">这份报告链接无法读取</h1>
          <p className="yr-card__note">
            链接可能在转发时被截断或改写了。内容只存在链接里，我们这边没有备份，找发给你的人重发一次就行。
          </p>
          <div className="yr-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="yr-button"
              onClick={() => setState({ screen: 'landing' })}
            >
              我自己写一份
            </button>
          </div>
        </section>
      )}

      <footer className="yr-footer">
        答案只留在这台设备上，服务器不保存任何一条。分享时逐项勾选，图片和链接的内容完全一致。
      </footer>
    </main>
  )
}
