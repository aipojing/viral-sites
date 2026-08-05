import { useState } from 'react'
import { track } from '@viral/shared'
import { PHRASES } from './configs/phrases'
import { SCENES } from './configs/scenes'
import { TONES } from './configs/tones'
import { PhraseList } from './components/phrase-list'
import { SaveQuoteButton } from './components/save-quote-button'
import { SceneGrid } from './components/scene-grid'
import { TonePicker } from './components/tone-picker'
import { CustomSceneForm } from './components/custom-scene-form'
import { CUSTOM_SCENE, buildCustomPhrases } from './lib/custom-scene'

export function App() {
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [toneId, setToneId] = useState<string | null>(null)
  const [customDraftOpen, setCustomDraftOpen] = useState(false)
  const [customSituation, setCustomSituation] = useState('')

  const scene = sceneId === CUSTOM_SCENE.id
    ? CUSTOM_SCENE
    : SCENES.find((s) => s.id === sceneId) ?? null
  const tone = TONES.find((t) => t.id === toneId) ?? null
  const phrases =
    scene && tone
      ? scene.id === CUSTOM_SCENE.id
        ? buildCustomPhrases(tone.id, customSituation)
        : PHRASES.filter((p) => p.scene === scene.id && p.tone === tone.id)
      : []

  const handleSceneSelect = (id: string) => {
    track('scene_selected', { scene: id })
    setSceneId(id)
    setCustomDraftOpen(false)
    setCustomSituation('')
  }

  const handleCustomSelect = () => {
    setSceneId(CUSTOM_SCENE.id)
    setToneId(null)
    setCustomDraftOpen(true)
    track('custom_scene_opened', { mode: 'local' })
  }

  const handleCustomSubmit = (situation: string) => {
    setCustomSituation(situation)
    setCustomDraftOpen(false)
    track('custom_scene_submitted', { mode: 'local' })
  }

  const handleToneSelect = (id: string) => {
    track('tone_selected', { tone: id })
    setToneId(id)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">拒绝话术生成器</h1>
        <p className="mt-1 text-sm text-[#606774]">选场景、挑语气，一键复制，好好说「不」。</p>
      </header>
      <div className="flex flex-1 flex-col gap-6">
        <SceneGrid selected={sceneId} onSelect={handleSceneSelect} onCustomSelect={handleCustomSelect} />
        {customDraftOpen && (
          <CustomSceneForm onSubmit={handleCustomSubmit} />
        )}
        {scene && !customDraftOpen && <TonePicker selected={toneId} onSelect={handleToneSelect} />}
        {scene && tone && (
          <PhraseList
            key={`${scene.id}-${tone.id}`}
            phrases={phrases}
            scene={scene}
            tone={tone}
            renderSaveAction={(renderedText) => (
              <SaveQuoteButton
                data={{
                  text: renderedText,
                  sceneId: scene.id,
                  sceneLabel: scene.label,
                  sceneColor: scene.color,
                  toneId: tone.id,
                  toneLabel: tone.label,
                }}
              />
            )}
          />
        )}
      </div>
      <footer className="pt-10 text-center text-xs text-[#606774]">
        话术仅供参考，分寸请自行把握 · 所有内容本地处理，不上传任何数据
      </footer>
    </main>
  )
}
