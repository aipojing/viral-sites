import { useRef, useState } from 'react'
import { track } from '@viral/shared'
import { requestVerdict } from './lib/api-client'
import type { VerdictResult } from './lib/verdict'
import { LandingScreen } from './components/landing-screen'
import { LoadingScreen } from './components/loading-screen'
import { PausedScreen, type PausedReason } from './components/paused-screen'
import { SaveCardButton } from './components/save-card-button'
import { VerdictScreen } from './components/verdict-screen'

const SLUG = 'ai-judge'

type Screen =
  | { screen: 'landing' }
  | { screen: 'loading' }
  | { screen: 'verdict'; result: VerdictResult }
  | { screen: 'paused'; reason: PausedReason }

export function App() {
  const [state, setState] = useState<Screen>({ screen: 'landing' })
  // 保留上一次提交，网络错误时允许原地重试
  const lastSubmission = useRef<{ nickname: string; intro: string } | null>(null)
  const submitting = useRef(false)

  const judge = async (nickname: string, intro: string) => {
    // StrictMode 或重复点击下只允许一次在途请求
    if (submitting.current) return
    submitting.current = true
    lastSubmission.current = { nickname, intro }
    setState({ screen: 'loading' })

    try {
      const outcome = await requestVerdict({ nickname, intro })
      switch (outcome.status) {
        case 'ok':
          track('generate', { slug: SLUG })
          if (outcome.result.source === 'fallback') track('fallback_used', { slug: SLUG })
          setState({ screen: 'verdict', result: outcome.result })
          break
        case 'refused':
          setState({ screen: 'paused', reason: 'refused' })
          break
        case 'rate_limited':
          track('rate_limited', { slug: SLUG })
          setState({ screen: 'paused', reason: 'rate_limited' })
          break
        case 'paused':
          track('budget_paused', { slug: SLUG })
          setState({ screen: 'paused', reason: 'paused' })
          break
        case 'error':
          setState({ screen: 'paused', reason: 'error' })
          break
      }
    } finally {
      submitting.current = false
    }
  }

  return (
    <main className="aj-root aj-scanlines">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
        <div className="flex-1">
          {state.screen === 'landing' && <LandingScreen onSubmit={(nickname, intro) => void judge(nickname, intro)} />}
          {state.screen === 'loading' && <LoadingScreen />}
          {state.screen === 'verdict' && (
            <VerdictScreen result={state.result} onRestart={() => setState({ screen: 'landing' })}>
              <SaveCardButton verdict={state.result.verdict} />
            </VerdictScreen>
          )}
          {state.screen === 'paused' && (
            <PausedScreen
              reason={state.reason}
              onBack={() => setState({ screen: 'landing' })}
              onRetry={
                state.reason === 'error' && lastSubmission.current
                  ? () => void judge(lastSubmission.current!.nickname, lastSubmission.current!.intro)
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </main>
  )
}
