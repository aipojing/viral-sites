import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeBaseFact } from '../lib/fact-lint'
import type { ObserverFactory } from '../lib/observer'
import { FactSection } from './fact-section'

const heart = makeBaseFact({
  id: 'osw-self-heartbeat',
  chapter: 'self',
  title: '你的心脏跳动',
  value: 72,
  period: { unit: 'custom-seconds', seconds: 60 },
  outputUnit: '次',
  decimals: 1,
})
const breath = makeBaseFact({
  id: 'osw-self-breath',
  chapter: 'self',
  title: '你的呼吸',
  value: 16,
  period: { unit: 'custom-seconds', seconds: 60 },
  outputUnit: '次',
  decimals: 2,
})

/** 可手动触发的观察器 stub */
function makeObserverStub() {
  let notify: ((intersecting: boolean) => void) | null = null
  const disconnect = vi.fn()
  const factory: ObserverFactory = (callback) => {
    notify = callback
    return { observe: vi.fn(), disconnect }
  }
  return {
    factory,
    disconnect,
    trigger: (intersecting: boolean) => notify?.(intersecting),
  }
}

describe('FactSection', () => {
  it('渲染章节标题与该章事实卡片', () => {
    const stub = makeObserverStub()
    render(
      <FactSection
        chapter="self"
        facts={[heart, breath]}
        elapsedMs={0}
        onShowSource={() => {}}
        observerFactory={stub.factory}
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: '你在这里' })).toBeInTheDocument()
    expect(screen.getByText('你的心脏跳动')).toBeInTheDocument()
    expect(screen.getByText('你的呼吸')).toBeInTheDocument()
  })

  it('未进入视口时卡片不随时间更新，进入后才实时更新', () => {
    const stub = makeObserverStub()
    const { rerender } = render(
      <FactSection
        chapter="self"
        facts={[heart]}
        elapsedMs={1_000}
        onShowSource={() => {}}
        observerFactory={stub.factory}
      />,
    )
    expect(screen.getByText('1.2 次')).toBeInTheDocument()

    // 不在视口：时间推进但数值定格
    rerender(
      <FactSection
        chapter="self"
        facts={[heart]}
        elapsedMs={5_000}
        onShowSource={() => {}}
        observerFactory={stub.factory}
      />,
    )
    expect(screen.getByText('1.2 次')).toBeInTheDocument()

    // 进入视口后恢复实时更新
    act(() => stub.trigger(true))
    expect(screen.getByText('6 次')).toBeInTheDocument()
  })

  it('首次进入视口只上报一次章节曝光', () => {
    const stub = makeObserverStub()
    const onViewed = vi.fn()
    const { unmount } = render(
      <FactSection
        chapter="self"
        facts={[heart]}
        elapsedMs={0}
        onShowSource={() => {}}
        onViewed={onViewed}
        observerFactory={stub.factory}
      />,
    )
    act(() => stub.trigger(true))
    act(() => stub.trigger(true))
    expect(onViewed).toHaveBeenCalledTimes(1)
    expect(onViewed).toHaveBeenCalledWith('self')
    unmount()
    expect(stub.disconnect).toHaveBeenCalled()
  })
})
