import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'
import type { AppDeps } from './app'

let now = 0
let rafCallback: FrameRequestCallback | null = null
let rafId = 0

const deps: AppDeps = {
  clock: () => now,
  raf: (callback) => {
    rafCallback = callback
    rafId += 1
    return rafId
  },
  cancelRaf: () => {
    rafCallback = null
  },
}

/** 推进一帧：先设置 monotonic 时间，再执行当前 rAF 回调；包 act 保证状态刷新 */
function frame(time: number) {
  act(() => {
    now = time
    const callback = rafCallback
    rafCallback = null
    callback?.(time)
  })
}

/** jsdom 不会从 init 解析 pointerId/pointerType，手工赋到原生事件上 */
function pointerEvent(type: string, init: { pointerId: number; pointerType: string }) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, init)
  return event
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function mockApi({ startStatus = 200, finishStatus = 200, percentile = 40, todayCount = 12 } = {}) {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async (input) => {
      const url = String(input)
      if (url.includes('/session')) {
        if (startStatus !== 200) return json(startStatus, { code: 'scores_disabled' })
        return json(200, { token: 'tok.en', startedAt: now, expiresAt: now + 1, todayCount })
      }
      if (finishStatus !== 200) return json(finishStatus, { code: 'error' })
      return json(200, { durationMs: 0, durationBucket: 0, percentile, trusted: true })
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('按住不放 App', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    now = 0
    rafId = 0
    rafCallback = null
    localStorage.clear()
    window.history.replaceState({}, '', '/hold-button/')
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('首页展示开始入口，点击后进入 3 秒准备倒计时', async () => {
    const user = userEvent.setup()
    mockApi()
    render(<App {...deps} />)
    await user.click(screen.getByRole('button', { name: /按住开始/ }))
    expect(screen.getByText('3')).toBeInTheDocument()
    frame(1_200)
    expect(screen.getByText('2')).toBeInTheDocument()
    frame(3_100)
    expect(screen.getByText(/随时按住屏幕/)).toBeInTheDocument()
  })

  it('完整一局：本地结果先出现，API 成功只补百分位不覆盖本地时长', async () => {
    const fetchMock = mockApi()
    render(<App {...deps} />)

    act(() => {
      screen.getByRole('button', { name: /按住开始/ }).click()
    })
    frame(3_000)

    const zone = screen.getByTestId('hold-zone')
    now = 3_500
    fireEvent(zone, pointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch' }))
    frame(5_000)
    expect(screen.getByText('1.5 秒')).toBeInTheDocument()

    now = 23_900
    fireEvent(zone, pointerEvent('pointerup', { pointerId: 1, pointerType: 'touch' }))
    // 本地结果立即出现
    expect(screen.getByText('20.4 秒')).toBeInTheDocument()
    expect(screen.getByText(/正在核对/)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText(/超过今天 40%/)).toBeInTheDocument())
    expect(screen.getByText(/12 人/)).toBeInTheDocument()
    // 本地时长未被服务端覆盖
    expect(screen.getByText('20.4 秒')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('API 失败保留本机成绩并显示降级文案', async () => {
    mockApi({ startStatus: 503 })
    render(<App {...deps} />)

    act(() => {
      screen.getByRole('button', { name: /按住开始/ }).click()
    })
    frame(3_000)
    const zone = screen.getByTestId('hold-zone')
    now = 3_000
    fireEvent(zone, pointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch' }))
    now = 8_000
    fireEvent(zone, pointerEvent('pointerup', { pointerId: 1, pointerType: 'touch' }))

    await waitFor(() => expect(screen.getByText(/成绩保留在本机/)).toBeInTheDocument())
    expect(screen.getByText('5.0 秒')).toBeInTheDocument()
  })

  it('打开带 beat 的链接只记录一次 challenge_opened', async () => {
    window.history.replaceState({}, '', '/hold-button/?beat=30000')
    mockApi()
    render(<App {...deps} />)
    await waitFor(() => expect(analyticsSpy).toHaveBeenCalledWith('challenge_opened', { bucket: 30 }))
    expect(analyticsSpy.mock.calls.filter((c) => c[0] === 'challenge_opened')).toHaveLength(1)
    expect(screen.getByText(/你能按得比我久吗/)).toBeInTheDocument()
  })

  it('generate 与 challenge 事件参数只有桶、原因、设备', async () => {
    window.history.replaceState({}, '', '/hold-button/?beat=10000')
    mockApi()
    render(<App {...deps} />)

    act(() => {
      screen.getByRole('button', { name: /按住开始/ }).click()
    })
    frame(3_000)
    const zone = screen.getByTestId('hold-zone')
    now = 3_000
    fireEvent(zone, pointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch' }))
    now = 15_000
    fireEvent(zone, pointerEvent('pointerup', { pointerId: 1, pointerType: 'touch' }))

    await waitFor(() => expect(analyticsSpy).toHaveBeenCalledWith('challenge_finished', expect.anything()))
    expect(analyticsSpy).toHaveBeenCalledWith('challenge_started', { bucket: 10, device: 'touch' })
    expect(analyticsSpy).toHaveBeenCalledWith('generate', { bucket: 12, reason: 'released', device: 'touch' })
    for (const [, data] of analyticsSpy.mock.calls.filter(([event]) =>
      ['generate', 'challenge_started', 'challenge_finished'].includes(event as string),
    )) {
      for (const key of Object.keys(data as object)) {
        expect(['bucket', 'reason', 'device']).toContain(key)
      }
    }
  })

  it('空格键按住并结束，键盘归入 desktop', async () => {
    const fetchMock = mockApi()
    render(<App {...deps} />)
    act(() => {
      screen.getByRole('button', { name: /按住开始/ }).click()
    })
    frame(3_000)

    now = 3_000
    fireEvent.keyDown(window, { code: 'Space' })
    frame(4_000)
    expect(screen.getByText('1.0 秒')).toBeInTheDocument()
    now = 6_500
    fireEvent.keyUp(window, { code: 'Space' })
    expect(screen.getByText('3.5 秒')).toBeInTheDocument()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const init = fetchMock.mock.calls[0][1] as unknown as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({
      deviceType: 'desktop',
    })
  })
})
