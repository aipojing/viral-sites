import { fireEvent, render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy, type AnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorldChapter, WorldFact } from '../data/fact-types'
import type { SnapshotItem } from '../lib/snapshot'
import { SnapshotBuilder } from './snapshot-builder'

/** 合成事实：period=custom-seconds 1 秒，ratePerSecond 即每秒速率 */
function makeFact(options: {
  id: string
  chapter?: WorldChapter
  title?: string
  ratePerSecond?: number
}): WorldFact {
  return {
    id: options.id,
    chapter: options.chapter ?? 'daily',
    title: options.title ?? options.id,
    explanation: '测试合成事实',
    value: options.ratePerSecond ?? 1,
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

const daily = makeFact({ id: 'a1', chapter: 'daily', title: '快递在路上' })
const dailySpare = makeFact({ id: 'a2', chapter: 'daily', title: '外卖在锅里' })
const human = makeFact({ id: 'b1', chapter: 'human', title: '婴儿到来', ratePerSecond: 2 })
const humanSpare = makeFact({ id: 'b2', chapter: 'human', title: '汽车出厂', ratePerSecond: 2 })
const planet = makeFact({ id: 'c1', chapter: 'planet', title: '地球飞行', ratePerSecond: 3 })

const candidates = [daily, dailySpare, human, humanSpare, planet]
const initial = [daily, human, planet] as const

let analyticsSpy: AnalyticsSpy

beforeEach(() => {
  analyticsSpy = installAnalyticsSpy()
})

afterEach(() => {
  removeAnalyticsSpy()
})

describe('SnapshotBuilder', () => {
  it('只读展示冻结时刻的数值，并标注“约”', () => {
    render(
      <SnapshotBuilder
        candidates={candidates}
        initial={initial}
        frozenElapsedMs={5_000}
        onClose={vi.fn()}
        onGenerate={vi.fn()}
      />,
    )
    expect(screen.getByText(/你在这个世界停留的 5 秒已经冻结/)).toBeInTheDocument()
    expect(screen.getByText('约 5 个')).toBeInTheDocument()
    expect(screen.getByText('约 10 个')).toBeInTheDocument()
    expect(screen.getByText('约 15 个')).toBeInTheDocument()
  })

  it('替换候选中不出现快照内已有的事实', () => {
    render(
      <SnapshotBuilder
        candidates={candidates}
        initial={initial}
        frozenElapsedMs={5_000}
        onClose={vi.fn()}
        onGenerate={vi.fn()}
      />,
    )
    const select = screen.getByLabelText('替换「快递在路上」') as HTMLSelectElement
    const optionTexts = [...select.options].map((option) => option.textContent)
    expect(optionTexts.some((text) => text?.includes('婴儿到来'))).toBe(false)
    expect(optionTexts.some((text) => text?.includes('地球飞行'))).toBe(false)
    expect(optionTexts.some((text) => text?.includes('外卖在锅里'))).toBe(true)
  })

  it('替换事实后显示新事实与它冻结时刻的数值', () => {
    render(
      <SnapshotBuilder
        candidates={candidates}
        initial={initial}
        frozenElapsedMs={5_000}
        onClose={vi.fn()}
        onGenerate={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('替换「快递在路上」'), { target: { value: 'a2' } })
    expect(screen.getByText('外卖在锅里')).toBeInTheDocument()
    expect(screen.queryByText('快递在路上')).not.toBeInTheDocument()
  })

  it('替换后章节覆盖不足两个的候选不出现在选择器中', () => {
    render(
      <SnapshotBuilder
        candidates={[daily, dailySpare, planet]}
        initial={[daily, dailySpare, planet]}
        frozenElapsedMs={5_000}
        onClose={vi.fn()}
        onGenerate={vi.fn()}
      />,
    )
    // 仅剩的替换候选是同章节 daily，替换掉唯一的 planet 会只剩一个章节
    const select = screen.getByLabelText('替换「地球飞行」') as HTMLSelectElement
    expect(select.options).toHaveLength(1)
    expect(select.options[0].textContent).toBe('保留这条')
  })

  it('生成快照时上报工厂与产品事件，并回传三条冻结条目', () => {
    const onGenerate = vi.fn()
    render(
      <SnapshotBuilder
        candidates={candidates}
        initial={initial}
        frozenElapsedMs={50_000}
        onClose={vi.fn()}
        onGenerate={onGenerate}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '生成快照卡' }))

    expect(analyticsSpy).toHaveBeenCalledWith('generate', { kind: 'snapshot' })
    expect(analyticsSpy).toHaveBeenCalledWith('snapshot_generated', { duration_bucket: '45_119' })

    expect(onGenerate).toHaveBeenCalledTimes(1)
    const items = onGenerate.mock.calls[0][0] as readonly SnapshotItem[]
    expect(items).toHaveLength(3)
    for (const item of items) {
      expect(item.display.kind).toBe('count')
    }
    expect(items[0].fact.id).toBe('a1')
    expect(items[0].display.text).toBe('50 个')
  })

  it('生成快照后出现保存入口，替换事实后需要重新定格', () => {
    render(
      <SnapshotBuilder
        candidates={candidates}
        initial={initial}
        frozenElapsedMs={5_000}
        onClose={vi.fn()}
        onGenerate={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '生成快照卡' }))
    expect(screen.getByRole('button', { name: '保存快照卡' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '生成快照卡' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('替换「快递在路上」'), { target: { value: 'a2' } })
    expect(screen.queryByRole('button', { name: '保存快照卡' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成快照卡' })).toBeInTheDocument()
  })

  it('Escape 关闭快照编辑', () => {
    const onClose = vi.fn()
    render(
      <SnapshotBuilder
        candidates={candidates}
        initial={initial}
        frozenElapsedMs={5_000}
        onClose={onClose}
        onGenerate={vi.fn()}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
