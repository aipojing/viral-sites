export type SaveStrategy = 'download' | 'long-press'

export function detectSaveStrategy(userAgent: string): SaveStrategy {
  const ua = userAgent.toLowerCase()
  const isWeChat = ua.includes('micromessenger')
  const isIOS = /iphone|ipad|ipod/.test(ua)
  return isWeChat || isIOS ? 'long-press' : 'download'
}
