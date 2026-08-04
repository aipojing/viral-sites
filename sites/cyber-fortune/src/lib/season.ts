export type SkinRule =
  | { type: 'annual'; from: string; to: string }
  | { type: 'monthly'; day: number }

export interface SeasonSkin {
  id: string
  name: string
  rules: readonly SkinRule[]
}

export const SEASON_SKINS: readonly SeasonSkin[] = [
  { id: 'new-year', name: '新年签', rules: [{ type: 'annual', from: '01-20', to: '02-10' }] },
  { id: 'gaokao', name: '高考签', rules: [{ type: 'annual', from: '06-05', to: '06-10' }] },
  {
    id: 'payday',
    name: '发薪日签',
    rules: [
      { type: 'monthly', day: 10 },
      { type: 'monthly', day: 15 },
    ],
  },
]

export function activeSkinId(
  dateKey: string,
  skins: readonly SeasonSkin[] = SEASON_SKINS,
): string | null {
  const monthDay = dateKey.slice(5)
  const day = Number(dateKey.slice(8, 10))
  for (const skin of skins) {
    const hit = skin.rules.some((rule) =>
      rule.type === 'annual' ? rule.from <= monthDay && monthDay <= rule.to : rule.day === day,
    )
    if (hit) return skin.id
  }
  return null
}
