import type { ReactNode } from 'react'
import { DOCUMENT_AUDIENCES } from '../configs/document-audiences'
import { DOCUMENT_SCENES } from '../configs/document-scenes'
import { DOCUMENT_TONES } from '../configs/document-tones'
import { DOCUMENT_TYPES, type DocumentType } from '../configs/document-types'
import { enabledAudiences, enabledScenes, enabledTones } from '../configs/document-templates'

export interface DocumentPickerSelection {
  type: DocumentType | null
  scene: string | null
  audience: string | null
  tone: string | null
}

interface Props {
  selection: DocumentPickerSelection
  onPick: (next: DocumentPickerSelection) => void
}

function PillGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 py-2 text-sm ${
        active ? 'bg-[#1f2937] text-white' : 'bg-white text-[#1f2937] shadow-sm'
      }`}
    >
      {children}
    </button>
  )
}

export function DocumentPicker({ selection, onPick }: Props) {
  const { type, scene, audience, tone } = selection

  const sceneOptions = type
    ? DOCUMENT_SCENES.filter((s) => s.type === type && enabledScenes(type).includes(s.id))
    : []
  const audienceOptions =
    type && scene
      ? DOCUMENT_AUDIENCES.filter((a) => enabledAudiences(type, scene).includes(a.id))
      : []
  const toneOptions =
    type && scene && audience
      ? DOCUMENT_TONES.filter((t) => enabledTones(type, scene, audience).includes(t.id))
      : []
  const selectedTone = DOCUMENT_TONES.find((t) => t.id === tone) ?? null

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-[#3c4251]">1 · 写什么</h2>
        <PillGroup label="选择文书类型">
          {DOCUMENT_TYPES.map((option) => (
            <Pill
              key={option.id}
              active={type === option.id}
              onClick={() => onPick({ type: option.id, scene: null, audience: null, tone: null })}
            >
              {option.label}
            </Pill>
          ))}
        </PillGroup>
      </section>

      {type && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-[#3c4251]">2 · 为了什么事</h2>
          <PillGroup label="选择事由">
            {sceneOptions.map((option) => (
              <Pill
                key={option.id}
                active={scene === option.id}
                onClick={() => onPick({ ...selection, type, scene: option.id, audience: null, tone: null })}
              >
                {option.icon} {option.label}
              </Pill>
            ))}
          </PillGroup>
        </section>
      )}

      {type && scene && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-[#3c4251]">3 · 发给谁</h2>
          <PillGroup label="选择对象">
            {audienceOptions.map((option) => (
              <Pill
                key={option.id}
                active={audience === option.id}
                onClick={() => onPick({ ...selection, type, scene, audience: option.id, tone: null })}
              >
                {option.label}
              </Pill>
            ))}
          </PillGroup>
        </section>
      )}

      {type && scene && audience && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-[#3c4251]">4 · 用什么语气</h2>
          <PillGroup label="选择语气">
            {toneOptions.map((option) => (
              <Pill
                key={option.id}
                active={tone === option.id}
                onClick={() => onPick({ ...selection, type, scene, audience, tone: option.id })}
              >
                {option.label}
              </Pill>
            ))}
          </PillGroup>
          {selectedTone?.kind === 'joke' && (
            <p role="note" className="mt-2 text-xs text-[#b45309]">
              玩梗版本：发出去之前，先确认对方接得住玩笑。
            </p>
          )}
        </section>
      )}
    </div>
  )
}
