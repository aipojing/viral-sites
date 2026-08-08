import { vi } from 'vitest'

export type AnalyticsSpy = ReturnType<typeof vi.fn<(event: string, data?: unknown) => void>>

export function installAnalyticsSpy(): AnalyticsSpy {
  const analyticsSpy = vi.fn<(event: string, data?: unknown) => void>()
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    enumerable: true,
    value: (_url: string | URL, body?: BodyInit | null) => {
      const payload = JSON.parse(String(body)) as { event: string; data?: unknown }
      analyticsSpy(payload.event, payload.data)
      return true
    },
  })
  return analyticsSpy
}

export function removeAnalyticsSpy(): void {
  delete (navigator as unknown as { sendBeacon?: unknown }).sendBeacon
}
