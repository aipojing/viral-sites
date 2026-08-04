export type Rand = () => number

export function mulberry32(seed: number): Rand {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const END_JITTER = 3
const MID_JITTER = 6

export function wobblyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rand: Rand,
): void {
  const midX = (x1 + x2) / 2 + (rand() - 0.5) * MID_JITTER
  const midY = (y1 + y2) / 2 + (rand() - 0.5) * MID_JITTER
  ctx.beginPath()
  ctx.moveTo(x1 + (rand() - 0.5) * END_JITTER, y1 + (rand() - 0.5) * END_JITTER)
  ctx.quadraticCurveTo(
    midX,
    midY,
    x2 + (rand() - 0.5) * END_JITTER,
    y2 + (rand() - 0.5) * END_JITTER,
  )
  ctx.stroke()
}

export function wobblyRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rand: Rand,
): void {
  wobblyLine(ctx, x, y, x + w, y, rand)
  wobblyLine(ctx, x + w, y, x + w, y + h, rand)
  wobblyLine(ctx, x + w, y + h, x, y + h, rand)
  wobblyLine(ctx, x, y + h, x, y, rand)
}

export function fillWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  charsPerLine: number,
  lineHeight: number,
): number {
  const chars = Array.from(text)
  let y = startY
  for (let i = 0; i < chars.length; i += charsPerLine) {
    ctx.fillText(chars.slice(i, i + charsPerLine).join(''), centerX, y)
    y += lineHeight
  }
  return y
}
