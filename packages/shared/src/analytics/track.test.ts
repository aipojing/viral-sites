import { afterEach, describe, expect, it, vi } from 'vitest'
import { track } from './track'

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, unknown>) => void }
  }
}

describe('track', () => {
  afterEach(() => {
    delete window.umami
    vi.restoreAllMocks()
  })

  it('umami 存在时转发事件', () => {
    const spy = vi.fn()
    window.umami = { track: spy }
    track('generate', { from: 'test' })
    expect(spy).toHaveBeenCalledWith('generate', { from: 'test' })
  })

  it('umami 不存在时不抛错', () => {
    expect(() => track('generate')).not.toThrow()
  })

  it('umami.track 抛错时静默吞掉', () => {
    window.umami = {
      track: () => {
        throw new Error('boom')
      },
    }
    expect(() => track('save_image')).not.toThrow()
  })
})
