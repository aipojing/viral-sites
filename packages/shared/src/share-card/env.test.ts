import { describe, expect, it } from 'vitest'
import { detectSaveStrategy } from './env'

const UA = {
  wechatAndroid:
    'Mozilla/5.0 (Linux; Android 14; V2244A) AppleWebKit/537.36 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160083 MMWEBSDK/20231202 MicroMessenger/8.0.47',
  wechatIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.47(0x18002f2c) NetType/WIFI',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Version/17.1 Mobile/15E148 Safari/604.1',
  desktopChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36',
}

describe('detectSaveStrategy', () => {
  it('微信安卓 → long-press', () => expect(detectSaveStrategy(UA.wechatAndroid)).toBe('long-press'))
  it('微信 iOS → long-press', () => expect(detectSaveStrategy(UA.wechatIOS)).toBe('long-press'))
  it('iOS Safari → long-press', () => expect(detectSaveStrategy(UA.iosSafari)).toBe('long-press'))
  it('桌面 Chrome → download', () => expect(detectSaveStrategy(UA.desktopChrome)).toBe('download'))
  it('安卓 Chrome → download', () => expect(detectSaveStrategy(UA.androidChrome)).toBe('download'))
})
