import { render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { App } from './app'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

describe('App', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    setClipboard(undefined)
    vi.restoreAllMocks()
  })

  it('初始只有九宫格，无语气胶囊无话术', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /被借钱/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '委婉体面' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('对方称呼')).not.toBeInTheDocument()
  })

  it('选场景：上报 scene_selected 且语气胶囊出现', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    expect(analyticsSpy).toHaveBeenCalledWith('scene_selected', { scene: 'jieqian' })
    expect(screen.getByRole('button', { name: '委婉体面' })).toBeInTheDocument()
  })

  it('选语气：上报 tone_selected、出 3 条话术并报 generate', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    await userEvent.click(screen.getByRole('button', { name: '直球硬刚' }))
    expect(analyticsSpy).toHaveBeenCalledWith('tone_selected', { tone: 'yinggang' })
    expect(analyticsSpy).toHaveBeenCalledWith('generate', { scene: 'jieqian', tone: 'yinggang' })
    expect(screen.getByText('不借。我的钱也是一分一分挣的。')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '复制' })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '保存卡片' })).toHaveLength(3)
  })

  it('复制全链路：点复制上报 copy（核心指标）', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    await userEvent.click(screen.getByRole('button', { name: '直球硬刚' }))
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(analyticsSpy).toHaveBeenCalledWith('copy', { scene: 'jieqian', tone: 'yinggang' })
  })

  it('切换场景后话术跟着换', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    await userEvent.click(screen.getByRole('button', { name: '直球硬刚' }))
    await userEvent.click(screen.getByRole('button', { name: /被拉去团建/ }))
    expect(screen.getByText('占用周末的团建我不参加，工作日的我都配合。')).toBeInTheDocument()
    expect(
      screen.queryByText('不借。我的钱也是一分一分挣的。'),
    ).not.toBeInTheDocument()
  })

  it('页脚免责/定位声明常驻', () => {
    render(<App />)
    expect(screen.getByText(/话术仅供参考/)).toBeInTheDocument()
    expect(screen.getByText(/不上传任何数据/)).toBeInTheDocument()
  })

  it('自定义场景：站内输入 → 选语气 → 得到 3 条本地话术', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /自己输入/ }))
    await userEvent.type(
      screen.getByLabelText('描述你想拒绝的具体事情'),
      '同事让我替他背锅',
    )
    await userEvent.click(screen.getByRole('button', { name: '继续选语气' }))
    await userEvent.click(screen.getByRole('button', { name: '委婉体面' }))

    expect(screen.getAllByRole('button', { name: '复制' })).toHaveLength(3)
    expect(screen.getAllByText(/同事让我替他背锅/).length).toBeGreaterThan(0)
    expect(analyticsSpy).toHaveBeenCalledWith('custom_scene_opened', { mode: 'local' })
    expect(analyticsSpy).toHaveBeenCalledWith('custom_scene_submitted', { mode: 'local' })
    expect(JSON.stringify(analyticsSpy.mock.calls)).not.toContain('同事让我替他背锅')
  })
})
