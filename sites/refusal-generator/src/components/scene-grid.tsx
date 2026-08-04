import { SCENES } from '../configs/scenes'

const WISH_MAILTO = `mailto:afu886.cn@gmail.com?subject=${encodeURIComponent(
  '【拒绝话术许愿】我想拒绝…',
)}`

interface Props {
  selected: string | null
  onSelect: (sceneId: string) => void
}

export function SceneGrid({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label="选择场景">
      {SCENES.map((scene) => (
        <button
          key={scene.id}
          type="button"
          aria-pressed={selected === scene.id}
          onClick={() => onSelect(scene.id)}
          className={`flex min-h-24 flex-col items-start justify-between rounded-2xl bg-white p-4 text-left shadow-sm ${
            scene.span === 2 ? 'col-span-2' : ''
          }`}
          style={
            selected === scene.id ? { boxShadow: `inset 0 0 0 3px ${scene.color}` } : undefined
          }
        >
          <span aria-hidden className="text-2xl">
            {scene.icon}
          </span>
          <span className="mt-2 text-sm font-medium" style={{ color: scene.color }}>
            {scene.label}
          </span>
        </button>
      ))}
      <a
        href={WISH_MAILTO}
        className="flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#9ca3af] p-4 text-center text-xs text-[#6b7280]"
      >
        想拒绝别的？
        <span className="mt-1 font-medium">写信告诉我</span>
      </a>
    </div>
  )
}
