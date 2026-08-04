import { detectSaveStrategy, type SaveStrategy } from './env'

export interface SaveCardOptions {
  filename: string
  onLongPress: (dataUrl: string) => void
  userAgent?: string
}

export function saveCard(canvas: HTMLCanvasElement, opts: SaveCardOptions): SaveStrategy {
  const strategy = detectSaveStrategy(opts.userAgent ?? navigator.userAgent)
  const dataUrl = canvas.toDataURL('image/png')
  if (strategy === 'long-press') {
    opts.onLongPress(dataUrl)
  } else {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = opts.filename
    a.click()
  }
  return strategy
}
