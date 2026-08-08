import { codePointLength } from '../../worker/validation'

interface CountedFieldProps {
  id: string
  label: string
  value: string
  onChange(value: string): void
  maxCodePoints: number
  placeholder?: string
  multiline?: boolean
  autoComplete?: string
}

// 标签、输入与 code point 计数一体；超长时计数变红，由提交侧统一拦截。
export function CountedField({
  id,
  label,
  value,
  onChange,
  maxCodePoints,
  placeholder,
  multiline = false,
  autoComplete = 'off',
}: CountedFieldProps) {
  const count = codePointLength(value)
  const over = count > maxCodePoints
  const shared = {
    id,
    value,
    placeholder,
    autoComplete,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    className:
      'min-h-12 w-full rounded-xl border border-stone-300 bg-white/90 px-4 py-3 text-base text-stone-900 outline-none transition-colors focus-visible:border-[#2b59c3] focus-visible:ring-2 focus-visible:ring-[#2b59c3]/30',
  }
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={id}>
      <span className="flex items-baseline justify-between font-medium text-stone-800">
        {label}
        <span className={`text-xs tabular-nums ${over ? 'text-[#c8392b]' : 'text-stone-400'}`}>
          {count} / {maxCodePoints}
        </span>
      </span>
      {multiline ? (
        <textarea {...shared} rows={3} className={`${shared.className} resize-y`} />
      ) : (
        <input {...shared} type="text" />
      )}
    </label>
  )
}
