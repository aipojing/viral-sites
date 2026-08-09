import { useState } from 'react'
import type { SalarySettings } from '../lib/settings'
import { SetupScreen } from './setup-screen'

export interface SettingsPanelProps {
  now: Date
  settings: SalarySettings
  onSave: (settings: SalarySettings) => void
  onClear: () => void
}

export function SettingsPanel({ now, settings, onSave, onClear }: SettingsPanelProps) {
  const [confirmingClear, setConfirmingClear] = useState(false)

  return (
    <section className="mt-6" aria-label="设置与隐私">
      <div className="st-dashed mb-4" aria-hidden="true" />
      <h3 className="st-mono text-xs tracking-[0.25em] text-[var(--st-ink-soft)]">修改口径</h3>
      <p className="mt-2 text-xs text-[var(--st-ink-soft)]">
        修改工资或作息后，历史片段保留当时的等值，不会重算。
      </p>
      <div className="mt-3">
        <SetupScreen now={now} initial={settings} submitLabel="保存设置" onComplete={onSave} />
      </div>

      <div className="st-dashed my-5" aria-hidden="true" />

      {confirmingClear ? (
        <div className="rounded border border-[var(--st-accent)] p-3 text-sm">
          <p className="font-bold text-[var(--st-accent)]">
            确定清除本机全部数据？工资、作息和片段记录都会消失，无法恢复。
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="st-btn flex-1" onClick={onClear}>
              确定清除
            </button>
            <button
              type="button"
              className="st-btn flex-1 border border-[var(--st-line)] bg-transparent text-[var(--st-ink)]"
              onClick={() => setConfirmingClear(false)}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full text-center text-sm font-bold text-[var(--st-accent)] underline underline-offset-4"
          onClick={() => setConfirmingClear(true)}
        >
          清除本机数据
        </button>
      )}
    </section>
  )
}
