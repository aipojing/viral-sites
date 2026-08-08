import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { fileURLToPath } from 'node:url'

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// HTML 中的 %VITE_UMAMI_WEBSITE_ID% 替换为统一统计 website id；
// 生产构建时该值为空直接失败，避免上线后统计静默丢失。
function umamiHtmlEnv(): Plugin {
  let websiteId = ''
  let isBuild = false
  return {
    name: 'umami-html-env',
    config(_, env) {
      isBuild = env.command === 'build'
      const envDir = fileURLToPath(new URL('.', import.meta.url))
      websiteId = loadEnv(env.mode, envDir, 'VITE_').VITE_UMAMI_WEBSITE_ID ?? ''
    },
    buildStart() {
      if (isBuild && websiteId === '') {
        throw new Error('VITE_UMAMI_WEBSITE_ID 为空：生产构建必须配置统一统计 website id')
      }
    },
    transformIndexHtml(html) {
      return html.replaceAll('%VITE_UMAMI_WEBSITE_ID%', websiteId)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), umamiHtmlEnv()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
  build: {
    rollupOptions: {
      input: {
        home: page('./index.html'),
        'life-grid': page('./life-grid/index.html'),
        'mental-state': page('./mental-state/index.html'),
        'tacit-test': page('./tacit-test/index.html'),
        'cyber-fortune': page('./cyber-fortune/index.html'),
        'refusal-generator': page('./refusal-generator/index.html'),
        'internet-age': page('./internet-age/index.html'),
      },
    },
  },
})
