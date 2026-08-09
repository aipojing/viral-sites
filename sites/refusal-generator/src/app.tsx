import { useState } from 'react'
import { track } from '@viral/shared'
import { RefusalMode } from './modes/refusal-mode'
import { DocumentMode } from './modes/document-mode'

export type AppMode = 'refusal' | 'document'

const MODE_TABS: ReadonlyArray<{ id: AppMode; label: string }> = [
  { id: 'refusal', label: '拒绝话术' },
  { id: 'document', label: '道歉与请假' },
]

export function App() {
  const [mode, setMode] = useState<AppMode>('refusal')

  const selectMode = (next: AppMode) => {
    if (next === mode) return
    track('mode_selected', { mode: next })
    setMode(next)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div role="group" aria-label="模式切换" className="mb-6 flex gap-2">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={mode === tab.id}
            onClick={() => selectMode(tab.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              mode === tab.id
                ? 'border-[#181d27] bg-[#181d27] text-white'
                : 'border-[#c9ced8] bg-white text-[#3c4251] hover:border-[#8a91a1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* key 重建子树：切换模式不残留称呼、场景或正文 */}
      {mode === 'refusal' ? <RefusalMode key="refusal" /> : <DocumentMode key="document" />}
    </main>
  )
}
