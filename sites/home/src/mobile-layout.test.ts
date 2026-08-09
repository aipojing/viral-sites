import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const mobileBlock = css.match(
  /@media \(max-width: 620px\) \{([\s\S]*?)\n\}\n\n@media \(prefers-reduced-motion/,
)?.[1]
const compactMobileBlock = css.match(
  /@media \(max-width: 380px\) \{([\s\S]*?)\n\}\n\n@media \(prefers-reduced-motion/,
)?.[1]

describe('H5 layout contract', () => {
  it('使用无白底的深色卡带壳并保持标题可读', () => {
    expect(css).toMatch(/background-image:\s*url\('\/assets\/cartridge-shell-v3\.png'\)/)
    expect(css).toMatch(/\.cartridge__title\s*\{[\s\S]*?color:\s*#f7fbff/)
  })

  it('随机抽取期间不重复播放整屏入场闪烁', () => {
    expect(css).toMatch(
      /\.site-shell\[data-shuffling='true'\]\s+\.stage\s*\{[\s\S]*?animation:\s*none/,
    )
  })

  it('使用紧凑的竖向舞台，并让三张卡匣同时可见', () => {
    expect(mobileBlock).toBeDefined()
    expect(mobileBlock).toMatch(/\.launcher__poster\s*\{[\s\S]*?min-height:\s*104px/)
    expect(mobileBlock).toMatch(/\.stage\s*\{[\s\S]*?min-height:\s*342px/)
    expect(mobileBlock).toMatch(/\.stage__copy\s*\{[\s\S]*?position:\s*absolute/)
    expect(mobileBlock).toMatch(/\.stage__visual\s*\{[\s\S]*?inset:\s*32px 0 0/)
    expect(mobileBlock).toMatch(/\.cartridge-slot\s*\{[\s\S]*?flex-basis:\s*116px/)
  })

  it('移动端完整展示玩法标题', () => {
    expect(mobileBlock).toMatch(/\.stage__copy h2\s*\{[\s\S]*?max-width:\s*100%/)
  })

  it('360 宽小屏仍能在首屏露出底部操作', () => {
    expect(compactMobileBlock).toBeDefined()
    expect(compactMobileBlock).toMatch(/\.launcher__poster\s*\{[\s\S]*?min-height:\s*96px/)
    expect(compactMobileBlock).toMatch(/\.stage\s*\{[\s\S]*?min-height:\s*318px/)
    expect(compactMobileBlock).toMatch(/\.selector\s*\{[\s\S]*?min-height:\s*304px/)
  })
})
