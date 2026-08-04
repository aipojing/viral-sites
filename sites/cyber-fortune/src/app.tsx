import { useState } from 'react'
import { track } from '@viral/shared'
import { drawFortune, type Fortune } from './lib/fortune-math'
import { advanceStreak, type StreakState } from './lib/streak'
import { loadStreak, saveNickname, saveStreak } from './lib/storage'
import { DrawScreen } from './components/draw-screen'
import { FortuneView } from './components/fortune-view'
import { SaveCardButton } from './components/save-card-button'

type Screen =
  | { screen: 'draw' }
  | { screen: 'result'; fortune: Fortune; streak: StreakState; isRepeat: boolean }

export function App() {
  const [state, setState] = useState<Screen>({ screen: 'draw' })

  const handleDraw = (nickname: string) => {
    const now = new Date()
    const fortune = drawFortune(nickname, now)
    const advanced = advanceStreak(loadStreak(), now)
    saveStreak(advanced.state)
    saveNickname(nickname)
    track('generate', { level: fortune.level })
    if (!advanced.isRepeat) track('streak_day', { streak: advanced.state.count })
    setState({ screen: 'result', fortune, streak: advanced.state, isRepeat: advanced.isRepeat })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex-1">
        {state.screen === 'draw' ? (
          <DrawScreen onDraw={handleDraw} />
        ) : (
          <FortuneView
            fortune={state.fortune}
            streak={state.streak.count}
            isRepeat={state.isRepeat}
            onRestart={() => setState({ screen: 'draw' })}
          >
            <SaveCardButton fortune={state.fortune} streak={state.streak.count} />
          </FortuneView>
        )}
      </div>
      <footer
        className="flex flex-col gap-1 pt-10 text-center text-xs"
        style={{ color: 'var(--cf-ink-faded)' }}
      >
        <p>昵称与求签记录只存在这台设备上，不会上传</p>
        <p>签文为程序生成的玩梗内容，不构成任何预测与建议</p>
      </footer>
    </main>
  )
}
