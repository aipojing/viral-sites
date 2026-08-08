import { render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyLinkButton } from './copy-link-button'

const URL = 'https://tacit-test.pages.dev/c?d=abc'

describe('CopyLinkButton', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('复制成功：按钮文案切换并埋点 copy_link', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    render(<CopyLinkButton url={URL} />)
    await userEvent.click(screen.getByRole('button', { name: '复制挑战链接' }))
    expect(await screen.findByText('已复制，去粘贴给对方吧')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('copy_link', undefined)
  })

  it('复制失败：展示可手动复制的只读链接与提示', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported')
    })
    render(<CopyLinkButton url={URL} />)
    await userEvent.click(screen.getByRole('button', { name: '复制挑战链接' }))
    expect(await screen.findByLabelText('挑战链接')).toHaveValue(URL)
    expect(screen.getByText('自动复制被拦下了，长按上面这行手动复制')).toBeInTheDocument()
    expect(analyticsSpy).not.toHaveBeenCalledWith('copy_link', undefined)
  })
})
