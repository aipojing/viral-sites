import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  beginPath: ReturnType<typeof vi.fn>
  moveTo: ReturnType<typeof vi.fn>
  lineTo: ReturnType<typeof vi.fn>
  quadraticCurveTo: ReturnType<typeof vi.fn>
  stroke: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  translate: ReturnType<typeof vi.fn>
  rotate: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
  measureText: ReturnType<typeof vi.fn>
  fillStyles: string[]
  strokeStyles: string[]
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  globalAlpha: number
  font: string
  textAlign: string
}

export function makeRecordingCtx(): RecordingCtx {
  const fillStyles: string[] = []
  const strokeStyles: string[] = []
  const ctx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    fillStyles,
    strokeStyles,
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as RecordingCtx
  Object.defineProperty(ctx, 'fillStyle', {
    get: () => fillStyles[fillStyles.length - 1] ?? '',
    set: (v: string) => {
      fillStyles.push(v)
    },
  })
  Object.defineProperty(ctx, 'strokeStyle', {
    get: () => strokeStyles[strokeStyles.length - 1] ?? '',
    set: (v: string) => {
      strokeStyles.push(v)
    },
  })
  return ctx
}

export function installCanvasStub(): RecordingCtx {
  const ctx = makeRecordingCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}
