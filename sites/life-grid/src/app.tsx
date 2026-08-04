import { useState } from 'react'
import { track } from '@viral/shared'
import { computeStats, type LifeInput } from './lib/life-math'
import { InputScreen } from './components/input-screen'
import { ResultScreen } from './components/result-screen'
import { SaveCardButton } from './components/save-card-button'

type Screen = { screen: 'input' } | { screen: 'result'; input: LifeInput }

export function App() {
  const [state, setState] = useState<Screen>({ screen: 'input' })

  const handleSubmit = (input: LifeInput) => {
    track('generate')
    setState({ screen: 'result', input })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex-1">
        {state.screen === 'input' ? (
          <InputScreen onSubmit={handleSubmit} today={new Date()} />
        ) : (
          <ResultScreen input={state.input} onRestart={() => setState({ screen: 'input' })}>
            <SaveCardButton stats={computeStats(state.input)} />
          </ResultScreen>
        )}
      </div>
      <footer className="pt-10 text-center text-xs text-[#a29b8a]">
        所有计算在本地完成，你的生日不会被上传
      </footer>
    </main>
  )
}
