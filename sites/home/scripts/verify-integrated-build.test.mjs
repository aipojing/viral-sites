import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { verifyIntegratedBuild } from './verify-integrated-build.mjs'
import { buildMpaInputs } from '../vite.config.ts'

const tempRoot = mkdtempSync(path.join(tmpdir(), 'verify-integrated-build-'))

afterAll(() => {
  rmSync(tempRoot, { recursive: true, force: true })
})

function makeDist(slugPages, manifestSlugs = Object.keys(slugPages)) {
  const distDir = path.join(tempRoot, `dist-${Math.random().toString(36).slice(2)}`)
  mkdirSync(distDir, { recursive: true })
  writeFileSync(
    path.join(distDir, 'index.html'),
    '<html><body><script type="module" crossorigin src="/assets/home-abc123.js"></script></body></html>',
  )
  writeFileSync(
    path.join(distDir, 'experience-manifest.json'),
    JSON.stringify(
      manifestSlugs.map((slug) => ({ slug, title: slug, path: `/${slug}/` })),
      null,
      2,
    ),
  )
  for (const [slug, html] of Object.entries(slugPages)) {
    mkdirSync(path.join(distDir, slug), { recursive: true })
    writeFileSync(path.join(distDir, slug, 'index.html'), html)
  }
  return distDir
}

const GOOD_HTML =
  '<html><body><script type="module" crossorigin src="/assets/app-abc123.js"></script></body></html>'

describe('verifyIntegratedBuild', () => {
  it('产物齐全且全部同源时通过', () => {
    const distDir = makeDist({ 'life-grid': GOOD_HTML, 'ai-judge': GOOD_HTML })
    expect(
      verifyIntegratedBuild({ rootDir: distDir, slugs: ['life-grid', 'ai-judge'] }),
    ).toEqual([])
  })

  it('缺少玩法 HTML 页面时报错', () => {
    const distDir = makeDist({ 'life-grid': GOOD_HTML }, ['life-grid', 'ai-judge'])
    const errors = verifyIntegratedBuild({
      rootDir: distDir,
      slugs: ['life-grid', 'ai-judge'],
    })
    expect(errors.some((error) => error.includes('ai-judge') && error.includes('index.html'))).toBe(
      true,
    )
  })

  it('HTML 引用外部玩法域名时报错', () => {
    const distDir = makeDist({
      'life-grid': '<html><body><script src="https://other-site.pages.dev/main.js"></script></body></html>',
    })
    const errors = verifyIntegratedBuild({ rootDir: distDir, slugs: ['life-grid'] })
    expect(errors.some((error) => error.includes('pages.dev'))).toBe(true)
  })

  it('玩法脚本不在 /assets/ 下时报错', () => {
    const distDir = makeDist({
      'life-grid': '<html><body><script src="/other-site/main.js"></script></body></html>',
    })
    const errors = verifyIntegratedBuild({ rootDir: distDir, slugs: ['life-grid'] })
    expect(errors.some((error) => error.includes('/assets/'))).toBe(true)
  })

  it('产物不能继续引用旧 Umami 客户端', () => {
    const distDir = makeDist({
      'life-grid': '<html><body><script src="/u.js"></script></body></html>',
    })
    const errors = verifyIntegratedBuild({ rootDir: distDir, slugs: ['life-grid'] })
    expect(errors.some((error) => error.includes('/u.js'))).toBe(true)
  })

  it('残留 VITE_*_URL 外跳配置时报错', () => {
    const distDir = makeDist({
      'life-grid': '<html><body><a href="%VITE_LIFE_GRID_URL%">外跳</a></body></html>',
    })
    const errors = verifyIntegratedBuild({ rootDir: distDir, slugs: ['life-grid'] })
    expect(errors.some((error) => error.includes('VITE_'))).toBe(true)
  })

  it('manifest 与登记玩法不一致时报错', () => {
    const distDir = makeDist({ 'life-grid': GOOD_HTML })
    const errors = verifyIntegratedBuild({ rootDir: distDir, slugs: [] })
    expect(errors.some((error) => error.includes('manifest'))).toBe(true)
  })

  it('缺少 manifest 时报错', () => {
    const distDir = path.join(tempRoot, 'empty-dist')
    mkdirSync(distDir, { recursive: true })
    expect(verifyIntegratedBuild({ rootDir: distDir, slugs: [] }).length).toBeGreaterThan(0)
  })
})

describe('buildMpaInputs', () => {
  const configDir = path.join(tempRoot, 'mpa-pages')
  for (const slug of ['life-grid', 'ai-judge']) {
    mkdirSync(path.join(configDir, slug), { recursive: true })
    writeFileSync(path.join(configDir, slug, 'index.html'), '<html></html>')
  }
  writeFileSync(path.join(configDir, 'index.html'), '<html></html>')

  it('从项目表推导首页与玩法输入', () => {
    const inputs = buildMpaInputs(
      [
        { slug: 'life-grid', href: '/life-grid/' },
        { slug: 'ai-judge', href: '/ai-judge/' },
      ],
      configDir,
    )
    expect(Object.keys(inputs).sort()).toEqual(['ai-judge', 'home', 'life-grid'])
    expect(inputs['life-grid']).toBe(path.join(configDir, 'life-grid/index.html'))
  })

  it('重复 slug 时拒绝生成配置', () => {
    expect(() =>
      buildMpaInputs(
        [
          { slug: 'life-grid', href: '/life-grid/' },
          { slug: 'life-grid', href: '/life-grid/' },
        ],
        configDir,
      ),
    ).toThrow(/life-grid/)
  })

  it('非 /<slug>/ 同源路径时拒绝生成配置', () => {
    expect(() =>
      buildMpaInputs([{ slug: 'life-grid', href: 'https://x.pages.dev/' }], configDir),
    ).toThrow(/life-grid/)
  })

  it('缺少页面 HTML 时拒绝生成配置', () => {
    expect(() =>
      buildMpaInputs([{ slug: 'missing-page', href: '/missing-page/' }], configDir),
    ).toThrow(/missing-page/)
  })
})
