import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  strokeRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  createLinearGradient: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  translate: ReturnType<typeof vi.fn>
  rotate: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
  fillStyle: unknown
  strokeStyle: string
  lineWidth: number
  globalAlpha: number
  font: string
  textAlign: string
}

export function installCanvasStub(): RecordingCtx {
  const ctx: RecordingCtx = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}
