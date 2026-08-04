import { useEffect, useState } from 'react'
import { track } from '@viral/shared'
import {
  buildChallengeUrl,
  decodeChallenge,
  encodeChallenge,
  type ChallengePayload,
} from './lib/challenge-codec'
import { QUIZZES, type QuizId } from './lib/questions'
import { computeScore } from './lib/scoring'
import { CompareScreen } from './components/compare-screen'
import { HomeScreen } from './components/home-screen'
import { InviteScreen } from './components/invite-screen'
import { NicknameScreen } from './components/nickname-screen'
import { QuizScreen } from './components/quiz-screen'

export type AppState =
  | { screen: 'home'; linkInvalid: boolean }
  | { screen: 'setup'; quiz: QuizId }
  | { screen: 'quiz-initiate'; quiz: QuizId; nickname: string }
  | { screen: 'invite'; payload: ChallengePayload; d: string }
  | { screen: 'intro'; payload: ChallengePayload }
  | { screen: 'quiz-respond'; payload: ChallengePayload; nickname: string }
  | { screen: 'compare'; payload: ChallengePayload; nickname: string; answers: number[] }

export function initialAppState(search: string): AppState {
  const d = new URLSearchParams(search).get('d')
  if (d === null) return { screen: 'home', linkInvalid: false }
  const payload = decodeChallenge(d)
  return payload ? { screen: 'intro', payload } : { screen: 'home', linkInvalid: true }
}

interface Props {
  search?: string
}

export function App({ search = window.location.search }: Props) {
  const [state, setState] = useState<AppState>(() => initialAppState(search))

  useEffect(() => {
    const d = new URLSearchParams(search).get('d')
    if (d === null) return
    track('challenge_opened')
    if (decodeChallenge(d) === null) track('link_invalid')
  }, [search])

  const restart = () => {
    // 清掉 ?d=，防止应战方「我也要发起一个」时旧挑战参数串场
    window.history.replaceState(null, '', '/')
    setState({ screen: 'home', linkInvalid: false })
  }

  const finishInitiate = (quiz: QuizId, nickname: string, answers: number[]) => {
    const d = encodeChallenge(quiz, nickname, answers)
    const payload = decodeChallenge(d)
    if (!payload) return // encode 产物必可解码；防御性兜底
    track('generate', { quiz })
    setState({ screen: 'invite', payload, d })
  }

  const finishRespond = (payload: ChallengePayload, nickname: string, answers: number[]) => {
    track('challenge_completed', { quiz: payload.q, score: computeScore(payload.a, answers) })
    setState({ screen: 'compare', payload, nickname, answers })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex-1">
        {state.screen === 'home' && (
          <HomeScreen
            linkInvalid={state.linkInvalid}
            onPick={(quiz) => setState({ screen: 'setup', quiz })}
          />
        )}
        {state.screen === 'setup' && (
          <NicknameScreen
            heading="怎么称呼你"
            sub={`${QUIZZES[state.quiz].name} · 你的名字会写在挑战卡上`}
            buttonLabel="出题"
            onSubmit={(nickname) =>
              setState({ screen: 'quiz-initiate', quiz: state.quiz, nickname })
            }
          />
        )}
        {state.screen === 'quiz-initiate' && (
          <QuizScreen
            questions={QUIZZES[state.quiz].questions}
            pen="blue"
            onAnswered={(i) => track('q_answered', { q: i + 1, mode: 'initiate' })}
            onComplete={(answers) => finishInitiate(state.quiz, state.nickname, answers)}
          />
        )}
        {state.screen === 'invite' && (
          <InviteScreen
            payload={state.payload}
            url={buildChallengeUrl(window.location.origin, state.d)}
          />
        )}
        {state.screen === 'intro' && (
          <NicknameScreen
            heading={`${state.payload.n} 向你发起默契挑战`}
            sub={`${QUIZZES[state.payload.q].name} · 10 道题，答案一致才算默契`}
            buttonLabel="接招"
            onSubmit={(nickname) =>
              setState({ screen: 'quiz-respond', payload: state.payload, nickname })
            }
          />
        )}
        {state.screen === 'quiz-respond' && (
          <QuizScreen
            questions={QUIZZES[state.payload.q].questions}
            pen="red"
            onAnswered={(i) => track('q_answered', { q: i + 1, mode: 'respond' })}
            onComplete={(answers) => finishRespond(state.payload, state.nickname, answers)}
          />
        )}
        {state.screen === 'compare' && (
          <CompareScreen
            payload={state.payload}
            challengerName={state.nickname}
            challengerAnswers={state.answers}
            onRestart={restart}
          />
        )}
      </div>
      <footer className="pt-10 text-center text-xs text-[#9b948a]">
        答案随挑战链接传递，请只发给你信任的人；本站不保存挑战内容
      </footer>
    </main>
  )
}
