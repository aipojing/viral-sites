/** 挑战链接只携带一个整型 beat（毫秒），不携带 token 或个人信息 */

const MAX_HOLD_MS = 20 * 60_000

function clampBeat(durationMs: number): number {
  const rounded = Math.round(durationMs)
  return Math.min(Math.max(Number.isFinite(rounded) ? rounded : 0, 0), MAX_HOLD_MS)
}

/** 固定生成同源 `/hold-button/?beat=<ms>`，不生成根路径或外部域名 */
export function buildChallengeUrl(base: URL, durationMs: number): string {
  return `${base.origin}/hold-button/?beat=${clampBeat(durationMs)}`
}

export function parseChallengeTarget(url: URL): number | null {
  const beat = url.searchParams.get('beat')
  if (beat === null || !/^\d+$/.test(beat)) return null
  return clampBeat(Number(beat))
}
