import { defineConfig } from 'vitest/config'

// 统一 Worker 测试入口：主站 Worker 与所有玩法 handler 的测试都在这里运行。
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'worker/**/*.test.ts',
      'scripts/**/*.test.mjs',
      '../ai-judge/worker/**/*.test.ts',
      '../hold-button/worker/**/*.test.ts',
    ],
  },
})
