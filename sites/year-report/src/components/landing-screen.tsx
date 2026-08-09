import type { DraftV1 } from '../lib/draft-storage'

export interface LandingScreenProps {
  year: number
  /** 本机存着的未完成草稿；没有就是 null */
  resume: DraftV1 | null
  answeredCount: number
  onStart: (saveDraft: boolean) => void
  onResume: () => void
  onDiscard: () => void
}

/**
 * 首屏：说清要花多久、答案存在哪、最后能得到什么。
 * 「不保存草稿」是并列的正式入口，不是藏在角落的开关。
 */
export function LandingScreen({
  year,
  resume,
  answeredCount,
  onStart,
  onResume,
  onDiscard,
}: LandingScreenProps) {
  return (
    <>
      <header className="yr-header">
        <p className="yr-header__year">{year}</p>
        <h1 className="yr-header__title">年度报告</h1>
        <p className="yr-header__subtitle">
          十个问题，大约 3 分钟。我们不统计你的一年，只把你自己写下的话排成一份能收着的报告。
        </p>
      </header>

      <section className="yr-card">
        <h2 className="yr-card__title">开始之前</h2>
        <ul className="yr-list">
          <li>十问都能跳过，跳过不影响生成报告。</li>
          <li>答案只存在这台设备的浏览器里，不会上传服务器。</li>
          <li>最后会得到一份可以翻页的报告，和一张可保存的总结卡。</li>
          <li>分享时逐项勾选公开内容，敏感的三项默认关着。</li>
        </ul>
      </section>

      {resume && (
        <section className="yr-card" aria-label="继续上次的草稿">
          <h2 className="yr-card__title">上次写到第 {resume.currentQuestion + 1} 题</h2>
          <p className="yr-card__note">已经写了 {answeredCount} 题，草稿只存在本机。</p>
          <div className="yr-actions" style={{ marginTop: 14 }}>
            <button type="button" className="yr-button" onClick={onResume}>
              继续上次
            </button>
            <button type="button" className="yr-button yr-button--ghost" onClick={onDiscard}>
              删掉草稿重新写
            </button>
          </div>
        </section>
      )}

      <div className="yr-actions">
        <button type="button" className="yr-button yr-button--block" onClick={() => onStart(true)}>
          开始回答（本机保存草稿）
        </button>
        <button type="button" className="yr-button yr-button--ghost yr-button--block" onClick={() => onStart(false)}>
          不保存草稿（公共设备）
        </button>
      </div>
      <p className="yr-progress">不保存草稿时，关掉页面答案就没了，我们也不会往浏览器里写一个字。</p>
    </>
  )
}
