import { fireEvent, render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy, type AnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { WorldChapter, WorldFact } from '../data/fact-types'
import { formatFactValue } from '../lib/format-value'
import type { SnapshotItem } from '../lib/snapshot'
import { formatLocalTime, SaveCardButton } from './save-card-button'

function makeFact(id: string, chapter: WorldChapter, title: string): WorldFact {
  return {
    id,
    chapter,
    title,
    explanation: '测试合成事实',
    value: 1,
    period: { unit: 'custom-seconds', seconds: 1 },
    outputUnit: '个',
    region: '测试',
    decimals: 0,
    snapshotPriority: 50,
    chineseContext: false,
    source: {
      title: '测试来源',
      publisher: '测试机构',
      url: 'https://example.com',
      publishedAt: '2026-01-01',
      reviewedAt: '2026-08-08',
      confidence: 'A',
    },
  }
}

const ELAPSED = 5_000
const factA = makeFact('a', 'daily', '快递在路上')
const factB = makeFact('b', 'human', '婴儿到来')
const factC = makeFact('c', 'planet', '地球飞行')

const items: readonly [SnapshotItem, SnapshotItem, SnapshotItem] = [
  { fact: factA, display: formatFactValue(factA, ELAPSED) },
  { fact: factB, display: formatFactValue(factB, ELAPSED) },
  { fact: factC, display: formatFactValue(factC, ELAPSED) },
]

let analyticsSpy: AnalyticsSpy

beforeEach(() => {
  installCanvasStub()
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
  analyticsSpy = installAnalyticsSpy()
})

afterEach(() => {
  removeAnalyticsSpy()
  vi.restoreAllMocks()
})

describe('formatLocalTime', () => {
  it('输出补零的 YYYY-MM-DD HH:mm', () => {
    expect(formatLocalTime(new Date(2026, 7, 9, 5, 7))).toBe('2026-08-09 05:07')
  })
})

describe('SaveCardButton', () => {
  it('桌面：点击触发下载并埋点 save_image（带卡片类型）', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton elapsedMs={ELAPSED} items={items} />)
    fireEvent.click(screen.getByRole('button', { name: '保存快照卡' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { card: 'world-snapshot' })
  })

  it('微信：点击弹出长按保存提示层，可关闭', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton elapsedMs={ELAPSED} items={items} />)
    fireEvent.click(screen.getByRole('button', { name: '保存快照卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
    expect(screen.getByAltText('一秒钟世界快照卡')).toBeInTheDocument()

    fireEvent.click(screen.getByText('长按图片保存'))
    expect(screen.queryByText('长按图片保存')).not.toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示截图降级', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton elapsedMs={ELAPSED} items={items} />)
    fireEvent.click(screen.getByRole('button', { name: '保存快照卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
