import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './copy-link'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('copyText', () => {
  it('clipboard API 可用：写入成功返回 true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await expect(copyText('https://x/c?d=abc')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://x/c?d=abc')
  })

  it('clipboard 被拒：降级 execCommand 成功返回 true', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    document.execCommand = vi.fn().mockReturnValue(true)
    await expect(copyText('link')).resolves.toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('clipboard 不存在：直接走 execCommand', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn().mockReturnValue(true)
    await expect(copyText('link')).resolves.toBe(true)
  })

  it('两条路都失败：返回 false 不抛错', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported')
    })
    await expect(copyText('link')).resolves.toBe(false)
  })

  it('降级路径不在 DOM 留下 textarea', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn().mockReturnValue(true)
    await copyText('link')
    expect(document.querySelector('textarea')).toBeNull()
  })
})
