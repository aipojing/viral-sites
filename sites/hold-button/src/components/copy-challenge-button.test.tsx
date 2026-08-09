import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyChallengeButton } from './copy-challenge-button'

const CHALLENGE_URL = 'https://example.com/hold-button/?beat=23400'

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
}

describe('CopyChallengeButton', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
  })

  it('复制成功：写入剪贴板并埋点 challenge_shared（只带 channel，不带 token）', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    render(<CopyChallengeButton url={CHALLENGE_URL} />)
    await userEvent.click(screen.getByRole('button', { name: '复制挑战链接' }))
    expect(writeText).toHaveBeenCalledWith(CHALLENGE_URL)
    expect(analyticsSpy).toHaveBeenCalledWith('challenge_shared', { channel: 'copy' })
    expect(screen.getByText('已复制，发给朋友吧')).toBeInTheDocument()
  })

  it('复制失败：展示降级文案，不埋点', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')))
    render(<CopyChallengeButton url={CHALLENGE_URL} />)
    await userEvent.click(screen.getByRole('button', { name: '复制挑战链接' }))
    expect(analyticsSpy).not.toHaveBeenCalled()
    expect(screen.getByText('复制失败，请手动长按复制链接')).toBeInTheDocument()
  })
})
