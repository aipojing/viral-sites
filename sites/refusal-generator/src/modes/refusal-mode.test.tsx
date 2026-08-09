import { render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { RefusalMode } from './refusal-mode'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

describe('RefusalMode（原 App 行为回归）', () => {
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

  it('场景 → 语气 → 3 条话术与保存按钮', async () => {
    render(<RefusalMode />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    await userEvent.click(screen.getByRole('button', { name: '直球硬刚' }))
    expect(analyticsSpy).toHaveBeenCalledWith('generate', { scene: 'jieqian', tone: 'yinggang' })
    expect(screen.getByText('不借。我的钱也是一分一分挣的。')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '复制' })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '保存卡片' })).toHaveLength(3)
  })

  it('复制上报 copy（核心指标）', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<RefusalMode />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    await userEvent.click(screen.getByRole('button', { name: '直球硬刚' }))
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(analyticsSpy).toHaveBeenCalledWith('copy', { scene: 'jieqian', tone: 'yinggang' })
  })
})
