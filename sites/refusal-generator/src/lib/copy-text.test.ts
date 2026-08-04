import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText, copyViaExecCommand } from './copy-text'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

afterEach(() => {
  setClipboard(undefined)
  delete (document as { execCommand?: unknown }).execCommand
  vi.restoreAllMocks()
})

describe('copyViaExecCommand（DOM 层）', () => {
  it('创建 textarea、执行 copy、随后移除', () => {
    const execSpy = vi.fn().mockReturnValue(true)
    ;(document as { execCommand?: unknown }).execCommand = execSpy
    const ok = copyViaExecCommand('不借。', document)
    expect(ok).toBe(true)
    expect(execSpy).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('execCommand 抛错时 textarea 仍被移除，且返回 false', () => {
    ;(document as { execCommand?: unknown }).execCommand = vi.fn(() => {
      throw new Error('denied')
    })
    expect(copyViaExecCommand('x', document)).toBe(false)
    expect(document.querySelector('textarea')).toBeNull()
  })
})

describe('copyText（编排层）', () => {
  it('clipboard API 可用且成功 → clipboard-api，不碰 execCommand', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    const execSpy = vi.fn()
    ;(document as { execCommand?: unknown }).execCommand = execSpy
    await expect(copyText('好好说不')).resolves.toBe('clipboard-api')
    expect(writeText).toHaveBeenCalledWith('好好说不')
    expect(execSpy).not.toHaveBeenCalled()
  })

  it('clipboard API 缺失 → 降级 exec-command', async () => {
    setClipboard(undefined)
    ;(document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(true)
    await expect(copyText('好好说不')).resolves.toBe('exec-command')
  })

  it('clipboard API reject（微信内核拒绝）→ 降级 exec-command', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowed')) })
    ;(document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(true)
    await expect(copyText('好好说不')).resolves.toBe('exec-command')
  })

  it('两条路都失败 → 抛错', async () => {
    setClipboard(undefined)
    ;(document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(false)
    await expect(copyText('好好说不')).rejects.toThrow('copy failed')
  })
})
