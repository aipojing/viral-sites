import { beforeEach, describe, expect, it, vi } from 'vitest'
import { encodePublicReport, REPORT_FRAGMENT_PREFIX } from './report-codec'

const VALID = `#${REPORT_FRAGMENT_PREFIX}${encodePublicReport({
  version: 1,
  year: 2026,
  answers: { keyword: '重启', 'feeling-scale': 4 },
})}`

/** 每个用例都要一份全新的模块实例：consume 是一次性的 */
async function freshConsume() {
  vi.resetModules()
  const module = await import('./fragment-bootstrap')
  return module.consumeReportFragment
}

beforeEach(() => {
  delete (window as { __YEAR_REPORT_FRAGMENT__?: string }).__YEAR_REPORT_FRAGMENT__
  history.replaceState(null, '', '/year-report/')
})

describe('consumeReportFragment', () => {
  it('读 bootstrap 存下的 fragment，并立刻从 window 上删掉', async () => {
    window.__YEAR_REPORT_FRAGMENT__ = VALID
    const consume = await freshConsume()

    const payload = consume()
    expect(payload).toEqual({ version: 1, year: 2026, answers: { keyword: '重启', 'feeling-scale': 4 } })
    expect('__YEAR_REPORT_FRAGMENT__' in window).toBe(false)
  })

  it('重复调用返回同一份结果，不会因为已经删掉全局而变成 null', async () => {
    window.__YEAR_REPORT_FRAGMENT__ = VALID
    const consume = await freshConsume()

    const first = consume()
    const second = consume()
    expect(second).toBe(first)
  })

  it('bootstrap 缺失时回退读 hash，并把 hash 从地址栏清掉', async () => {
    history.replaceState(null, '', `/year-report/${VALID}`)
    const consume = await freshConsume()

    expect(consume()).toMatchObject({ year: 2026 })
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/year-report/')
  })

  it('查询串保留，只清 hash', async () => {
    history.replaceState(null, '', `/year-report/?from=wechat${VALID}`)
    const consume = await freshConsume()

    consume()
    expect(window.location.search).toBe('?from=wechat')
    expect(window.location.hash).toBe('')
  })

  it('损坏的分享链接返回 invalid，而不是当成没有链接', async () => {
    window.__YEAR_REPORT_FRAGMENT__ = `#${REPORT_FRAGMENT_PREFIX}!!!not-base64!!!`
    const consume = await freshConsume()

    expect(consume()).toBe('invalid')
  })

  it('不带 report= 的 hash 与空 hash 都返回 null', async () => {
    window.__YEAR_REPORT_FRAGMENT__ = '#section-2'
    let consume = await freshConsume()
    expect(consume()).toBeNull()

    delete (window as { __YEAR_REPORT_FRAGMENT__?: string }).__YEAR_REPORT_FRAGMENT__
    consume = await freshConsume()
    expect(consume()).toBeNull()
  })
})
