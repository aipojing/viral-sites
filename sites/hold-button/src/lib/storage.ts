/** 本机最好成绩：只存一个数字，损坏或越界一律降级为 0 */

const BEST_KEY = 'hold-button:best'
const MAX_SANE_MS = 20 * 60_000

export function loadPersonalBest(storage: Storage): number {
  try {
    const raw = storage.getItem(BEST_KEY)
    if (raw === null) return 0
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 0) return 0
    return Math.min(parsed, MAX_SANE_MS)
  } catch {
    return 0
  }
}

/** 保存更高的成绩并返回当前最好成绩；写入失败不阻断返回 */
export function savePersonalBest(storage: Storage, durationMs: number): number {
  const best = Math.max(loadPersonalBest(storage), Math.min(durationMs, MAX_SANE_MS))
  try {
    storage.setItem(BEST_KEY, JSON.stringify(best))
  } catch {
    // 隐私模式等场景下写入可能失败，成绩仍在本次会话可用
  }
  return best
}
