import { buildReportSlides } from '../lib/report-model'
import type { PublicReportPayload } from '../lib/public-fields'
import { ReportViewer } from './report-viewer'

export interface PublicReportProps {
  payload: PublicReportPayload
  onStartOwn: () => void
}

/**
 * 接收者视图：只渲染链接里带的字段，不写草稿、不碰本机存储。
 * 明确说明看到的只是对方勾选公开的部分，不是 TA 的全部答案。
 */
export function PublicReport({ payload, onStartOwn }: PublicReportProps) {
  const slides = buildReportSlides(payload.year, payload.answers)

  return (
    <>
      <header className="yr-header">
        <p className="yr-header__year">{payload.year}</p>
        <h1 className="yr-header__title">别人分享给你的年度报告</h1>
        <p className="yr-header__subtitle">
          你看到的是 TA 勾选公开的 {Object.keys(payload.answers).length} 项，其余内容留在了 TA 自己的设备上。
        </p>
      </header>

      <ReportViewer
        slides={slides}
        actions={
          <div className="yr-actions">
            <button type="button" className="yr-button yr-button--block" onClick={onStartOwn}>
              我也写一份
            </button>
          </div>
        }
      />
    </>
  )
}
