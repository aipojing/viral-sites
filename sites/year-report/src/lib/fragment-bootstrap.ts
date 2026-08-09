import type { PublicReportPayload } from './public-fields'
import { readReportFragment } from './report-codec'

declare global {
  interface Window {
    __YEAR_REPORT_FRAGMENT__?: string
  }
}

let consumed = false
let result: PublicReportPayload | 'invalid' | null = null

/**
 * 每次页面加载只读一次分享 fragment。
 * HTML 里的同步 bootstrap 已经把 hash 从地址栏摘掉并塞进全局变量，这里取完立刻删掉，
 * 之后任何脚本（包括统计）读到的页面地址都不再带答案。
 * bootstrap 缺失时退回读 location.hash，并自己清一次地址栏。
 */
export function consumeReportFragment(): PublicReportPayload | 'invalid' | null {
  if (consumed) return result
  consumed = true
  if (typeof window === 'undefined') return null

  let raw = window.__YEAR_REPORT_FRAGMENT__ ?? ''
  delete window.__YEAR_REPORT_FRAGMENT__
  if (raw === '' && window.location.hash) {
    raw = window.location.hash
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
  result = readReportFragment(raw)
  return result
}
