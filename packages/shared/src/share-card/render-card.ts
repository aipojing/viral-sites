export interface CardSize {
  width: number
  height: number
}

export const CARD_SIZE: CardSize = { width: 1080, height: 1440 }

export type DrawFn = (ctx: CanvasRenderingContext2D, size: CardSize) => void

export function renderCard(draw: DrawFn, size: CardSize = CARD_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  draw(ctx, size)
  return canvas
}
