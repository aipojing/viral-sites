import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * 校验主站构建产物：所有登记玩法都有同源页面产物，且不引用外部站点。
 * @param {{ rootDir: string, slugs: readonly string[] }} input rootDir 指向 dist
 * @returns {string[]} 错误列表，空数组表示通过
 */
export function verifyIntegratedBuild({ rootDir, slugs }) {
  const errors = []
  const manifestPath = path.join(rootDir, 'experience-manifest.json')

  let manifest = []
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    errors.push(`缺少或无法解析 ${manifestPath}（需要先由主站构建生成）`)
    return errors
  }

  const manifestSlugs = manifest.map((entry) => entry.slug)
  for (const slug of slugs) {
    if (!manifestSlugs.includes(slug)) errors.push(`manifest 缺少已登记玩法 ${slug}`)
  }
  for (const slug of manifestSlugs) {
    if (!slugs.includes(slug)) errors.push(`manifest 含未登记玩法 ${slug}`)
  }

  checkEntryHtml(errors, path.join(rootDir, 'index.html'), '首页')
  for (const entry of manifest) {
    if (entry.path !== `/${entry.slug}/`) {
      errors.push(`manifest 中 ${entry.slug} 的路径必须是 /${entry.slug}/，实际是 ${entry.path}`)
    }
    checkEntryHtml(errors, path.join(rootDir, entry.slug, 'index.html'), entry.slug)
  }
  return errors
}

function checkEntryHtml(errors, htmlPath, label) {
  let html
  try {
    html = readFileSync(htmlPath, 'utf8')
  } catch {
    errors.push(`缺少 ${label} 的页面产物：${htmlPath}`)
    return
  }
  if (/pages\.dev/.test(html)) {
    errors.push(`${label} 的产物引用了外部 Pages 域名（pages.dev）`)
  }
  if (/VITE_[A-Z0-9_]+_URL/.test(html)) {
    errors.push(`${label} 的产物残留 VITE_*_URL 外跳配置`)
  }
  for (const match of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
    const src = match[1]
    if (!src.startsWith('/assets/') && src !== '/u.js') {
      errors.push(`${label} 的脚本必须来自主站 /assets/（或 /u.js）：${src}`)
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const rootDir = path.resolve(process.cwd(), 'dist')
  let slugs = []
  try {
    const manifest = JSON.parse(
      readFileSync(path.join(rootDir, 'experience-manifest.json'), 'utf8'),
    )
    slugs = manifest.map((entry) => entry.slug)
  } catch {
    // manifest 缺失会由 verifyIntegratedBuild 报错
  }
  const errors = verifyIntegratedBuild({ rootDir, slugs })
  if (errors.length > 0) {
    for (const error of errors) console.error(error)
    process.exitCode = 1
  } else {
    console.log(`verify-integrated-build: 首页 + ${slugs.length} 个玩法入口全部通过`)
  }
}
