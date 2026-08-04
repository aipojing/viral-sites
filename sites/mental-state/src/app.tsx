import { useState } from 'react'
import { computeResult, track, type QuizResult } from '@viral/shared'
import { resolveConfig } from './config/registry'
import { LandingScreen } from './components/landing-screen'
import { QuizScreen } from './components/quiz-screen'
import { ReportScreen } from './components/report-screen'
import { SaveCardButton } from './components/save-card-button'

type Screen = { screen: 'landing' } | { screen: 'quiz' } | { screen: 'report'; result: QuizResult }

export function App() {
  const [config] = useState(() => resolveConfig(window.location.search))
  const [state, setState] = useState<Screen>({ screen: 'landing' })

  const handleFinish = (answers: number[]) => {
    const result = computeResult(config, answers)
    track('generate', { slug: config.meta.slug, score: result.score })
    setState({ screen: 'report', result })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="flex-1">
        {state.screen === 'landing' && (
          <LandingScreen config={config} onStart={() => setState({ screen: 'quiz' })} />
        )}
        {state.screen === 'quiz' && (
          <QuizScreen
            config={config}
            onAnswer={(i) => track('q_answered', { slug: config.meta.slug, q: i + 1 })}
            onFinish={handleFinish}
          />
        )}
        {state.screen === 'report' && (
          <ReportScreen
            config={config}
            result={state.result}
            onRestart={() => setState({ screen: 'landing' })}
          >
            <SaveCardButton config={config} result={state.result} />
          </ReportScreen>
        )}
      </div>
      <footer className="pt-8 text-center text-xs leading-relaxed">
        测试纯属玩梗，不构成任何建议 · 所有计算在本地完成，答案不会被上传
      </footer>
    </main>
  )
}
