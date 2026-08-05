import { TONES } from '../configs/tones'

interface Props {
  selected: string | null
  onSelect: (toneId: string) => void
}

export function TonePicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="选择语气">
      {TONES.map((tone) => (
        <button
          key={tone.id}
          type="button"
          aria-pressed={selected === tone.id}
          onClick={() => onSelect(tone.id)}
          className={`min-h-11 rounded-full px-3 py-2 text-sm ${
            selected === tone.id
              ? 'bg-[#1f2937] text-white'
              : 'bg-white text-[#1f2937] shadow-sm'
          }`}
        >
          {tone.label}
        </button>
      ))}
    </div>
  )
}
