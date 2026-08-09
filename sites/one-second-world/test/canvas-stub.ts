import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
  fillStyle: string
  globalAlpha: number
  font: string
  textAlign: string
}

export function installCanvasStub(): RecordingCtx {
  const ctx: RecordingCtx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}
