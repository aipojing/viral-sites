import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { projects } from './src/projects.ts'

const configDir = fileURLToPath(new URL('.', import.meta.url))

export interface MpaProjectEntry {
  slug: string
  href: string
}

// 从项目表推导 MPA inputs：首页 + 每个玩法一个 HTML 入口。
// 重复 slug、非 /<slug>/ 同源路径或缺少页面 HTML 时直接拒绝生成配置。
export function buildMpaInputs(
  projectList: readonly MpaProjectEntry[],
  rootDir: string,
): Record<string, string> {
  const inputs: Record<string, string> = { home: requirePage(rootDir, 'index.html') }
  const seen = new Set<string>()
  for (const { slug, href } of projectList) {
    if (seen.has(slug)) throw new Error(`重复的玩法 slug：${slug}`)
    seen.add(slug)
    if (href !== `/${slug}/`) {
      throw new Error(`玩法 ${slug} 必须使用同源路径 /${slug}/，实际是 ${href}`)
    }
    inputs[slug] = requirePage(rootDir, `${slug}/index.html`)
  }
  return inputs
}

function requirePage(rootDir: string, relativePath: string): string {
  const file = path.join(rootDir, relativePath)
  if (!existsSync(file)) throw new Error(`缺少玩法页面 HTML：${relativePath}`)
  return file
}

// 构建期输出玩法清单，供产物校验门禁与后续工具消费
const experienceManifest: Plugin = {
  name: 'experience-manifest',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'experience-manifest.json',
      source: JSON.stringify(
        projects.map(({ slug, title, href }) => ({ slug, title, path: href })),
        null,
        2,
      ),
    })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), experienceManifest],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
  build: {
    rollupOptions: {
      input: buildMpaInputs(projects, configDir),
    },
  },
})
