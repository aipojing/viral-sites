import type { TagShare } from '@viral/shared'

interface Props {
  composition: TagShare[]
}

export function CompositionBars({ composition }: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {composition.map((share) => (
        <li key={share.tag} className="flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 font-bold">{share.title}</span>
          <span className="h-5 flex-1 overflow-hidden rounded-full bg-[#F0F0F0]">
            <span
              data-testid={`bar-${share.tag}`}
              className="bar-grow block h-full rounded-full"
              style={{ width: `${share.percent}%`, backgroundColor: share.barColor }}
            />
          </span>
          <span className="w-10 shrink-0 text-right font-black tabular-nums">{share.percent}%</span>
        </li>
      ))}
    </ul>
  )
}
