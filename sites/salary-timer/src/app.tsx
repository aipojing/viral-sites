import { useEffect, useRef, useState } from 'react'
import { track } from '@viral/shared'
import { SetupScreen } from './components/setup-screen'
import { TodayDashboard } from './components/today-dashboard'
import { PrivacyToggle, loadPrivacyMode, savePrivacyMode } from './components/privacy-toggle'
import { SceneTimer } from './components/scene-timer'
import { FragmentReceipt, SCENE_QUIPS } from './components/fragment-receipt'
import { DailySummary } from './components/daily-summary'
import { SettingsPanel } from './components/settings-panel'
import { SaveCardButton } from './components/save-card-button'
import { useVisibleNow } from './hooks/use-visible-now'
import type { SalarySettings } from './lib/settings'
import { localDateKey } from './lib/time-local'
import { hourlyEquivalent } from './lib/pay-math'
import { todayPayState } from './lib/work-schedule'
import { makeFragmentReceiptDraw } from './card/draw-fragment-receipt'
import { makeDailyReceiptDraw } from './card/draw-daily-receipt'
import {
  durationBucket,
  finishFragment,
  paidDurationsByScene,
  sceneLabel,
  startFragment,
  type ActiveFragment,
  type FragmentResult,
  type SceneId,
} from './lib/fragment'
import {
  clearSalaryData,
  loadSalaryData,
  pruneOldRecords,
  saveSalaryData,
  touchActiveDate,
  type SalaryLocalData,
} from './lib/storage'
import { markReturnDaysReported, returnDayEvents } from './lib/return-days'

export const SLUG = 'salary-timer'

export function App() {
  const now = useVisibleNow()
  const [data, setData] = useState<SalaryLocalData | null>(() =>
    loadSalaryData(window.localStorage, window.sessionStorage),
  )
  const [privacyMode, setPrivacyMode] = useState(() => loadPrivacyMode())
  const [forceWorkday, setForceWorkday] = useState(false)
  // 进行中的片段只存内存：刷新即结束，避免伪造持续时间。
  const [active, setActive] = useState<ActiveFragment | null>(null)
  const [lastResult, setLastResult] = useState<FragmentResult | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const bootedRef = useRef(false)

  // 复访登记只在挂载后做一次：裁剪过期记录、记活跃日、上报 D1/D7。
  useEffect(() => {
    if (bootedRef.current || !data) return
    bootedRef.current = true

    let next = pruneOldRecords(data, new Date())
    next = touchActiveDate(next, new Date())
    const events = returnDayEvents(next, new Date())
    for (const day of events) {
      track('return_visit', { slug: SLUG, day })
    }
    next = markReturnDaysReported(next, events)
    saveSalaryData(next, window.localStorage, window.sessionStorage)
    if (next !== data) setData(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSetupComplete = (settings: SalarySettings) => {
    const todayKey = localDateKey(new Date())
    const fresh: SalaryLocalData = {
      version: 1,
      settings,
      fragments: [],
      firstVisitDate: todayKey,
      activeDates: [todayKey],
      reportedReturnDays: [],
    }
    saveSalaryData(fresh, window.localStorage, window.sessionStorage)
    setData(fresh)
    track('setup_completed', { slug: SLUG })
    track('generate', { slug: SLUG })
  }

  const handlePrivacyChange = (enabled: boolean) => {
    setPrivacyMode(enabled)
    savePrivacyMode(enabled)
    track('privacy_mode_used', { slug: SLUG, enabled: enabled ? 1 : 0 })
  }

  const handleStartScene = (scene: SceneId, customLabel?: string) => {
    if (!data || active) return
    try {
      const fragment = startFragment(scene, now, data.settings, customLabel)
      setActive(fragment)
      setLastResult(null)
      // 埋点只带内置场景枚举；custom 不携带任何文本。
      track('scene_started', { slug: SLUG, scene })
    } catch {
      /* 非法自定义标签：按钮已禁用，这里兜底忽略 */
    }
  }

  const handleFinishScene = () => {
    if (!data || !active) return
    const result = finishFragment(active, now)
    const next: SalaryLocalData = { ...data, fragments: [...data.fragments, result] }
    saveSalaryData(next, window.localStorage, window.sessionStorage)
    setData(next)
    setActive(null)
    setLastResult(result)
    track('scene_finished', {
      slug: SLUG,
      scene: result.scene,
      duration_bucket: durationBucket(result.durationMs),
    })
  }

  const handleSaveSettings = (settings: SalarySettings) => {
    if (!data) return
    const next: SalaryLocalData = { ...data, settings }
    saveSalaryData(next, window.localStorage, window.sessionStorage)
    setData(next)
    setSettingsOpen(false)
  }

  const handleClearData = () => {
    clearSalaryData(window.localStorage, window.sessionStorage)
    savePrivacyMode(false)
    setPrivacyMode(false)
    setData(null)
    setActive(null)
    setLastResult(null)
    setSettingsOpen(false)
    setForceWorkday(false)
  }

  const handleSummaryView = () => {
    track('daily_summary_viewed', { slug: SLUG })
  }

  return (
    <main className="st-root flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="st-receipt st-receipt-edge w-full max-w-sm px-6 py-8">
        <header className="flex items-start justify-between gap-2">
          <div>
            <p className="st-mono text-xs tracking-[0.3em] text-[var(--st-ink-soft)]">RECEIPT</p>
            <h1 className="mt-1 text-xl font-black tracking-wide">上班回本计算器</h1>
          </div>
          {data && <PrivacyToggle enabled={privacyMode} onChange={handlePrivacyChange} />}
        </header>

        <div className="st-dashed my-5" aria-hidden="true" />

        {data === null ? (
          <>
            <p className="mb-4 text-center text-sm">30 秒完成设置，开始计价。</p>
            <SetupScreen now={now} onComplete={handleSetupComplete} />
          </>
        ) : settingsOpen ? (
          <>
            <SettingsPanel
              now={now}
              settings={data.settings}
              onSave={handleSaveSettings}
              onClear={handleClearData}
            />
            <button type="button" className="st-btn mt-4 w-full" onClick={() => setSettingsOpen(false)}>
              返回今日面板
            </button>
          </>
        ) : (
          <>
            <TodayDashboard
              settings={data.settings}
              now={now}
              forceWorkday={forceWorkday}
              privacyMode={privacyMode}
              onForceWorkday={() => setForceWorkday(true)}
            />

            {lastResult && (
              <FragmentReceipt
                result={lastResult}
                privacyMode={privacyMode}
                onDismiss={() => setLastResult(null)}
              >
                <div className="mt-3">
                  <SaveCardButton
                    makeDraw={() =>
                      makeFragmentReceiptDraw({
                        sceneLabel: sceneLabel(lastResult),
                        durationMs: lastResult.durationMs,
                        equivalent: lastResult.equivalent,
                        includeDate: true,
                        dateLabel: localDateKey(new Date(lastResult.endedAtMs)),
                        quip: SCENE_QUIPS[lastResult.scene],
                      })
                    }
                    filename="salary-timer-fragment.png"
                    label="保存片段小票"
                    trackProps={{ card: 'scene', scene: lastResult.scene }}
                  />
                </div>
              </FragmentReceipt>
            )}

            {!lastResult && (
              <SceneTimer
                now={now}
                active={active}
                privacyMode={privacyMode}
                onStart={handleStartScene}
                onFinish={handleFinishScene}
              />
            )}

            <DailySummary
              settings={data.settings}
              now={now}
              fragments={data.fragments}
              forceWorkday={forceWorkday}
              privacyMode={privacyMode}
              onView={handleSummaryView}
            >
              {(amountVisible) => {
                const todayKey = localDateKey(now)
                const payState = todayPayState(data.settings, now, forceWorkday)
                const earnedToday = (payState.earnedMs / 3_600_000) * hourlyEquivalent(data.settings)
                const customLabels = data.fragments
                  .filter(
                    (fragment) =>
                      fragment.scene === 'custom' &&
                      fragment.customLabel &&
                      localDateKey(new Date(fragment.endedAtMs)) === todayKey,
                  )
                  .map((fragment) => fragment.customLabel as string)
                return (
                  <div className="mt-3">
                    <SaveCardButton
                      makeDraw={() =>
                        makeDailyReceiptDraw({
                          dateLabel: todayKey,
                          sceneDurations: paidDurationsByScene(data.fragments, todayKey),
                          ...(amountVisible ? { totalEquivalent: earnedToday } : {}),
                          ...(customLabels.length > 0
                            ? { customLabel: [...new Set(customLabels)].join('、') }
                            : {}),
                        })
                      }
                      filename="salary-timer-daily.png"
                      label="保存今日日报"
                      trackProps={{ card: 'daily', amount_visible: amountVisible ? 1 : 0 }}
                    />
                  </div>
                )
              }}
            </DailySummary>

            <div className="mt-6">
              <button
                type="button"
                className="w-full text-center text-sm font-bold underline underline-offset-4"
                onClick={() => setSettingsOpen(true)}
                disabled={active !== null}
              >
                {active ? '先结束当前片段，再修改口径' : '修改口径 / 清除数据'}
              </button>
            </div>
          </>
        )}
      </div>

      <footer className="mt-6 max-w-sm text-center text-xs text-[var(--st-ink-soft)]">
        工资不会上传。这是时间等值，不是工资单、税务或劳动报酬结算。
      </footer>
    </main>
  )
}
