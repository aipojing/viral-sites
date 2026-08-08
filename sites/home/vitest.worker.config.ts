import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// 统一 Worker 测试入口：主站 Worker 与所有玩法 handler 的测试都在这里运行。
// cloudflare:workers 由本地垫片提供（node 环境没有 workerd）。
export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./worker/cloudflare-workers-shim.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: [
      'worker/**/*.test.ts',
      'scripts/**/*.test.mjs',
      '../ai-judge/worker/**/*.test.ts',
      '../hold-button/worker/**/*.test.ts',
      '../next-question/worker/**/*.test.ts',
    ],
  },
})
