// 隐私模式 UI 状态：独立 sessionStorage key，不跨设备、不进分享数据，
// 刷新后仍保持隐藏，恢复金额必须主动操作。
const PRIVACY_STORAGE_KEY = 'viral:salary-timer:privacy:v1'

export function loadPrivacyMode(): boolean {
  try {
    return sessionStorage.getItem(PRIVACY_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function savePrivacyMode(enabled: boolean): void {
  try {
    if (enabled) sessionStorage.setItem(PRIVACY_STORAGE_KEY, '1')
    else sessionStorage.removeItem(PRIVACY_STORAGE_KEY)
  } catch {
    /* 忽略存储异常 */
  }
}

export interface PrivacyToggleProps {
  enabled: boolean
  onChange: (next: boolean) => void
}

export function PrivacyToggle({ enabled, onChange }: PrivacyToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--st-line)] px-3 py-1.5 text-xs font-bold tracking-wider text-[var(--st-ink-soft)]"
      onClick={() => onChange(!enabled)}
    >
      <span aria-hidden="true">{enabled ? '🙈' : '👁️'}</span>
      {enabled ? '金额已隐藏，点击恢复' : '隐私模式：隐藏金额'}
    </button>
  )
}
