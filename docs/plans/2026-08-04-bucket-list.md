# 余生清单（07 · bucket-list）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **发布策略备注（设计文档 §9）：** 本站与 01 人生进度条情绪同源。**构建完成不等于发布**——上线时间由人决策，与 01 错峰至少 3 周（01 保存率 > 5% 则作为续作顺势推出；表现平平则文案再往「轻快珍惜」偏一轮再上）。因此 Task 11 中所有部署相关步骤均为【手工·需用户】。

**Goal:** 在既有工厂基建（`@viral/shared` 已上线可用）上完成站点 07「余生清单」（S 级，纯前端）到可部署状态：出生年份 + 预期寿命 → 勾选热爱的事（默认池 20 项 + 自定义 ≤5）→ 算出「这辈子还能来多少次」→ 生成暖色手账清单卡。

**Architecture:** `sites/bucket-list` 是独立 Vite React 应用，只依赖 `@viral/shared`（`renderCard`/`saveCard`/`track`），站与站零依赖——年龄口径与 01 的 life-math 对齐但**独立实现，禁止 import life-grid 任何代码**。计算层全部为显式传 `today` 的纯函数：`lib/bucket-items.ts`（清单池数据）、`lib/list-math.ts`（计算 + 派生统计）、`lib/selection.ts`（勾选状态的不可变变换）；组件层只做渲染与事件；canvas 只出现在分享卡绘制。TDD：每个模块先写失败测试再实现。

**Tech Stack:** 同 life-grid：pnpm workspace · Vite · React 19 · TypeScript(strict) · Tailwind v4 · Vitest 3 + Testing Library(jsdom) · Cloudflare Pages · umami（自托管 `u.js` + `_worker.js` 同源代理）

## Global Constraints

（来自 [00-factory-design.md](../00-factory-design.md)、[00a-style-map.md](../00a-style-map.md)、[07-bucket-list.md](../07-bucket-list.md) 与 life-grid 实施验证，所有任务默认遵守）

**工程**

- 站点目录 `sites/bucket-list`，包名 `@viral/bucket-list`；脚手架与 life-grid 同构（package.json / tsconfig / vite.config / vitest.config 结构一致）
- 依赖版本按 life-grid 实测锁定：`vitest@^3`、`@testing-library/jest-dom@^6`（shared 包用 vitest 4 互不影响，各包各自跑各自的 runner）；vitest 配置 `globals: true` + `setupFiles: ['./test/setup.ts']`，setup 里引 `@testing-library/jest-dom/vitest`
- `public/_worker.js` 与 `public/u.js` 从 `sites/life-grid/public/` 用 `cp` 原样复制，不改内容；`index.html` 用同款 umami 接入（自托管 `u.js` + `data-host-url="/"` 同源代理），website-id 先填 `TO_BE_FILLED`，Task 11 手工替换；favicon 按手账风现写（不复用 life-grid 的方格 favicon）
- 首屏资源 gzip 后 < 100KB；不引入 UI 组件库、日期库、图标库（清单项图标全用 emoji 字符）
- 测试命令统一 `pnpm --filter @viral/bucket-list test`
- 提交信息用 conventional commits（feat/fix/test/chore/docs），不加 Co-Authored-By

**计算口径**

- 预期寿命默认 78，滑块范围 60~100；年龄上限 120
- 只收**出生年份**（设计如此，不收完整生日）：`年龄 = today.getFullYear() − 出生年份`——与 01 同为「显式传 today 的整数周岁」口径，因输入粒度不同独立实现
- `剩余年 = max(0, 预期寿命 − 年龄)`；月频率 ×12 归一化为年频率；`剩余次数 = floor(剩余年 × 年频率)`
- 边界规则（优先级从高到低）：年龄 ≥ 预期寿命 → 全清单奖励模式「从今天起，每一次都是加场」；剩余次数 = 0 且频率 > 0 → 「下一次，可能就是最后一次」（不显示 0，覆盖「0 届」写法）；年频率 < 1 → 「还能看 {n} 届」写法
- 涉及「今天」的函数一律显式传入 `today: Date`；`new Date()` 只允许出现在 App 组装层
- 不可变数据风格：更新数组/对象一律返回新副本（`sort` 前先浅拷贝），不原地修改

**埋点**（事件语义全站统一）

- `visit`：umami pageview 自带；`generate`：点「生成我的余生清单」；`save_image`：保存卡片；`export_error`：canvas 导出失败降级
- 本站自定义事件 `item_selected`，data 为 `{ item: 清单项 id }`；**自定义项一律记 `'custom'`，绝不上报用户输入的内容**

**视觉（00a：暖色手账，签名元素 = 清单打勾 + 纸胶带贴角）**

- 色板（写死，全站唯一取色来源）：
  - 奶油纸底 `#faf3e3`（页面底 / 卡片底）
  - 手账纸面 `#fdf8ea`（结果清单容器，比底色亮一档，像贴上去的一页手账）
  - 焦糖棕 `#a05a2c`（大数字 / 主按钮 / 强强调；对奶油纸底对比度约 5:1）
  - 草木绿 `#55703f`（打勾 / 添加按钮 / 次强调）
  - 墨色 `#3d3327`（正文）
  - 浅墨棕 `#8a7d68`（次要文字 / 页脚）
  - 边线浅棕 `#e6d9bb`（分隔线 / 输入框边框）
  - 手账横线 `rgba(160, 90, 44, 0.12)`（页面与卡片的格线底）
  - 胶带绿 `rgba(85, 112, 63, 0.28)` / 胶带棕 `rgba(160, 90, 44, 0.22)`（纸胶带）
- 与 01 明确区分：01 是纸白 `#f7f4ec` + 青蓝**方格** + 批改朱红 `#c8392b`；本站是奶油纸 + 焦糖棕**横线** + 焦糖棕/草木绿，**禁用朱红与青蓝**
- 打勾动效用 SVG `stroke-dashoffset` 过渡、纸胶带用 CSS 旋转色块（卡片上用 canvas 旋转矩形）实现，不用图片；动效只出现在签名时刻，尊重 `prefers-reduced-motion`
- 两个签名元素都必须出现在分享卡上（卡上打勾为静态 `✓` 字符）
- 结果屏视觉强调规则（写死一种）：**次数越少字号越大**，三档阈值——`< 20` 或「最后一次」为高档、`20~199` 为中档、`≥ 200` 为低档；高/中档数字用焦糖棕，低档用墨色

**卡片**

- 走 shared `renderCard`/`saveCard`，1080×1440（3:4 竖版），列表卡：标题「我的余生清单」+ 最稀缺 8 项（升序，超 8 项截断）+ 收尾文案「数字不是倒计时，是提醒你每一次都算数」+ 品牌条「余生清单 · viral-sites」
- 行 = 绿色 ✓ + emoji + 名称 + 右对齐剩余次数大数字（分档字号）；名称超 8 字防御性截断加省略号

**隐私**

- 所有输入只在本地计算，绝不上传；隐私声明**只放页脚一处**：「所有计算在本地完成，你勾的清单不会被上传」

**文件全景**（Create 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
sites/bucket-list/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  public/_worker.js  public/u.js            # 从 life-grid/public 用 cp 复制，不改内容
  public/favicon.svg                        # 手账风现写
  src/main.tsx  src/app.tsx (+test)  src/index.css
  src/lib/bucket-items.ts (+test)           # 默认清单池 20 项（配置化数据）
  src/lib/list-math.ts (+test)              # 计算纯函数 + computeListStats + 强调分档
  src/lib/selection.ts (+test)              # 勾选/调频率/自定义项的不可变变换
  src/components/input-screen.tsx (+test)   # 出生年份 + 预期寿命滑块
  src/components/checklist-screen.tsx (+test) # 清单勾选屏（打勾动效 + item_selected）
  src/components/result-screen.tsx (+test)  # 升序清单 + 纸胶带容器 + 收尾文案
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-bucket-card.ts (+test)      # 1080×1440 清单卡绘制
  test/setup.ts  test/canvas-stub.ts        # canvas 桩（比 life-grid 版多 save/restore/translate/rotate）
```

---

### Task 1: 站点脚手架（配置 + 手账视觉底 + public 资产）

**Files:**
- Create: `sites/bucket-list/package.json`, `sites/bucket-list/tsconfig.json`, `sites/bucket-list/vite.config.ts`, `sites/bucket-list/vitest.config.ts`, `sites/bucket-list/index.html`, `sites/bucket-list/src/main.tsx`, `sites/bucket-list/src/app.tsx`, `sites/bucket-list/src/index.css`, `sites/bucket-list/test/setup.ts`, `sites/bucket-list/test/canvas-stub.ts`, `sites/bucket-list/public/favicon.svg`
- Copy: `sites/life-grid/public/_worker.js` → `sites/bucket-list/public/_worker.js`，`sites/life-grid/public/u.js` → `sites/bucket-list/public/u.js`

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）
- Produces: 可 build 的 Vite React 站点；`test/canvas-stub.ts` 的 `installCanvasStub(): RecordingCtx`——在 life-grid 版本基础上**增加 `save`/`restore`/`translate`/`rotate` 四个桩**（Task 9 卡片的纸胶带旋转绘制需要）

- [ ] **Step 1: 建包与依赖**

`sites/bucket-list/package.json`：

```json
{
  "name": "@viral/bucket-list",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Run:

```bash
cd /Users/ahs/Documents/vibe-coding/viral-sites
pnpm --filter @viral/bucket-list add react react-dom
pnpm --filter @viral/bucket-list add -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite jsdom @testing-library/react @testing-library/user-event @types/react @types/react-dom
pnpm --filter @viral/bucket-list add -D 'vitest@^3' '@testing-library/jest-dom@^6'
pnpm --filter @viral/bucket-list add '@viral/shared@workspace:*'
```

Expected: 安装成功；`vitest` 落在 3.x、`@testing-library/jest-dom` 落在 6.x（与 life-grid 实测组合一致）

- [ ] **Step 2: 配置文件**

`sites/bucket-list/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client", "@testing-library/jest-dom"] },
  "include": ["src", "test"]
}
```

`sites/bucket-list/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/bucket-list/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
})
```

`sites/bucket-list/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

`sites/bucket-list/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#faf3e3" />
    <title>余生清单 — 你这辈子还能吃多少次火锅</title>
    <meta
      name="description"
      content="勾选你热爱的事，算出这辈子还能吃 812 次火锅、看 45 次樱花、和最好的朋友见 138 面。所有计算在本地完成。"
    />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- umami 自托管脚本 + 同源上报（data-host-url="/" → POST /api/send，由 _worker.js 代理转发）。
         website-id 在 Task 11 手工替换；替换前 u.js 在 dev 下 POST /api/send 404 静默失败，不影响开发 -->
    <script defer src="/u.js" data-website-id="TO_BE_FILLED" data-host-url="/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`sites/bucket-list/src/index.css`：

```css
@import 'tailwindcss';

:root {
  color-scheme: light;
}

body {
  background-color: #faf3e3;
  /* 暖色手账：焦糖棕横线铺底（区别于 01 的青蓝方格），纯 CSS 不用图 */
  background-image: linear-gradient(to bottom, rgba(160, 90, 44, 0.12) 1px, transparent 1px);
  background-size: 100% 32px;
  color: #3d3327;
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

.font-serif-cn {
  font-family: 'Songti SC', 'Noto Serif SC', 'SimSun', serif;
}

/* 签名元素一：清单打勾（SVG 描边动画） */
.check-tick {
  stroke-dasharray: 26;
  stroke-dashoffset: 26;
  transition: stroke-dashoffset 0.25s ease-out;
}

.check-tick-on {
  stroke-dashoffset: 0;
}

/* 签名元素二：纸胶带贴角 */
.washi-tape {
  position: absolute;
  top: -14px;
  left: 20px;
  width: 104px;
  height: 30px;
  background: rgba(85, 112, 63, 0.28);
  transform: rotate(-6deg);
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .check-tick {
    transition: none;
  }

  li {
    animation: none !important;
  }
}
```

（字体策略与 life-grid 一致：v1 用系统字族兜底，不打包 webfont，保住 100KB 预算。）

`sites/bucket-list/src/main.tsx`：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`sites/bucket-list/src/app.tsx`（占位，Task 10 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-6 py-10">余生清单</main>
}
```

`sites/bucket-list/test/canvas-stub.ts`（组件测试共用的 canvas 桩；比 life-grid 版多 4 个方法）：

```ts
import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  translate: ReturnType<typeof vi.fn>
  rotate: ReturnType<typeof vi.fn>
  fillStyle: string
  globalAlpha: number
  font: string
  textAlign: string
}

export function installCanvasStub(): RecordingCtx {
  const ctx: RecordingCtx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}
```

- [ ] **Step 3: public 资产（复制 worker/u.js + 现写 favicon）**

Run:

```bash
mkdir -p sites/bucket-list/public
cp sites/life-grid/public/_worker.js sites/life-grid/public/u.js sites/bucket-list/public/
```

`sites/bucket-list/public/favicon.svg`（手账风：奶油纸横线 + 胶带贴角 + 草木绿大勾）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#faf3e3"/>
  <g stroke="rgba(160,90,44,0.35)" stroke-width="2">
    <path d="M0 22h64M0 38h64M0 54h64"/>
  </g>
  <rect x="4" y="0" width="26" height="11" fill="rgba(85,112,63,0.5)" transform="rotate(-8 17 5)"/>
  <path d="M16 34l10 12 22-26" fill="none" stroke="#55703f" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 4: 验证构建**

Run: `pnpm --filter @viral/bucket-list build`
Expected: 构建成功，产出 `sites/bucket-list/dist/`，其中含 `_worker.js`、`u.js`、`favicon.svg`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): Vite+React+Tailwind 站点脚手架与手账视觉底"
```

---

### Task 2: 默认清单池 bucket-items（20 项全量数据）

**Files:**
- Create: `sites/bucket-list/src/lib/bucket-items.ts`
- Test: `sites/bucket-list/src/lib/bucket-items.test.ts`

**Interfaces:**
- Produces:
  - `type FreqUnit = 'per-year' | 'per-month'`
  - `interface BucketItem { id: string; name: string; icon: string; freq: number; unit: FreqUnit }`
  - `const MAX_CUSTOM_ITEMS = 5`、`const MAX_NAME_LENGTH = 8`
  - `const BUCKET_POOL: readonly BucketItem[]`（恰好 20 项）
- 名称口径：池内名称统一 ≤ 8 字（设计文档表中「看电影（影院）」取「看电影」入池），与自定义项共用 `MAX_NAME_LENGTH`，保证卡片行排版稳定

- [ ] **Step 1: 写失败测试** `sites/bucket-list/src/lib/bucket-items.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { BUCKET_POOL, MAX_CUSTOM_ITEMS, MAX_NAME_LENGTH } from './bucket-items'

describe('BUCKET_POOL', () => {
  it('恰好 20 项', () => expect(BUCKET_POOL).toHaveLength(20))

  it('id 全局唯一', () => {
    const ids = BUCKET_POOL.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('名称非空且不超过 8 个字', () => {
    for (const item of BUCKET_POOL) {
      expect([...item.name].length).toBeGreaterThan(0)
      expect([...item.name].length).toBeLessThanOrEqual(MAX_NAME_LENGTH)
    }
  })

  it('每项都有 emoji 图标、频率大于 0、单位合法', () => {
    for (const item of BUCKET_POOL) {
      expect(item.icon.length).toBeGreaterThan(0)
      expect(item.freq).toBeGreaterThan(0)
      expect(['per-year', 'per-month']).toContain(item.unit)
    }
  })

  it('设计文档定档的代表项存在且口径一致', () => {
    expect(BUCKET_POOL.find((i) => i.id === 'hotpot')).toMatchObject({ freq: 2, unit: 'per-month' })
    expect(BUCKET_POOL.find((i) => i.id === 'best-friend')).toMatchObject({ freq: 6, unit: 'per-year' })
    expect(BUCKET_POOL.find((i) => i.id === 'family-meal')).toMatchObject({ freq: 4, unit: 'per-year' })
    expect(BUCKET_POOL.find((i) => i.id === 'world-cup')).toMatchObject({ freq: 0.25, unit: 'per-year' })
  })

  it('常量：自定义上限 5、名称上限 8', () => {
    expect(MAX_CUSTOM_ITEMS).toBe(5)
    expect(MAX_NAME_LENGTH).toBe(8)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL（bucket-items 未定义）

- [ ] **Step 3: 实现** `sites/bucket-list/src/lib/bucket-items.ts`

20 项全量成文：前 10 项来自设计文档 §4 表格（口径逐字对齐），后 10 项按「具体、可数、有画面感」标准补齐（覆盖设计文档点名的旅行、露营、烟花、春晚、体检）：

```ts
export type FreqUnit = 'per-year' | 'per-month'

export interface BucketItem {
  id: string
  name: string
  icon: string
  freq: number
  unit: FreqUnit
}

export const MAX_CUSTOM_ITEMS = 5
export const MAX_NAME_LENGTH = 8

export const BUCKET_POOL: readonly BucketItem[] = [
  // —— 设计文档 §4 定档的 10 项 ——
  { id: 'hotpot', name: '吃火锅', icon: '🍲', freq: 2, unit: 'per-month' },
  { id: 'movie', name: '看电影', icon: '🎬', freq: 1, unit: 'per-month' },
  { id: 'best-friend', name: '见最好的朋友', icon: '👯', freq: 6, unit: 'per-year' },
  { id: 'family-meal', name: '回家吃爸妈做的饭', icon: '🍚', freq: 4, unit: 'per-year' },
  { id: 'cherry-blossom', name: '看樱花', icon: '🌸', freq: 1, unit: 'per-year' },
  { id: 'sea', name: '看海', icon: '🌊', freq: 2, unit: 'per-year' },
  { id: 'concert', name: '看演唱会', icon: '🎤', freq: 2, unit: 'per-year' },
  { id: 'snow', name: '看雪', icon: '❄️', freq: 3, unit: 'per-year' },
  { id: 'birthday', name: '过生日', icon: '🎂', freq: 1, unit: 'per-year' },
  { id: 'world-cup', name: '看世界杯', icon: '⚽', freq: 0.25, unit: 'per-year' },
  // —— 实现期补齐的 10 项（具体、可数、有画面感）——
  { id: 'trip', name: '出远门旅行', icon: '✈️', freq: 2, unit: 'per-year' },
  { id: 'camping', name: '去露营', icon: '⛺', freq: 2, unit: 'per-year' },
  { id: 'fireworks', name: '看跨年烟花', icon: '🎆', freq: 1, unit: 'per-year' },
  { id: 'gala', name: '看春晚', icon: '📺', freq: 1, unit: 'per-year' },
  { id: 'checkup', name: '做体检', icon: '🩺', freq: 1, unit: 'per-year' },
  { id: 'moon', name: '看中秋的月亮', icon: '🌕', freq: 1, unit: 'per-year' },
  { id: 'hiking', name: '爬一座山', icon: '⛰️', freq: 3, unit: 'per-year' },
  { id: 'bbq', name: '深夜撸串', icon: '🍢', freq: 2, unit: 'per-month' },
  { id: 'ktv', name: '和朋友唱KTV', icon: '🎶', freq: 4, unit: 'per-year' },
  { id: 'reunion', name: '老同学聚会', icon: '🍻', freq: 1, unit: 'per-year' },
]
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/bucket-list test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): 默认清单池 20 项配置"
```

---

### Task 3: list-math 核心计算纯函数

**Files:**
- Create: `sites/bucket-list/src/lib/list-math.ts`
- Test: `sites/bucket-list/src/lib/list-math.test.ts`

**Interfaces:**
- Consumes: `FreqUnit`（Task 2）
- Produces（后续任务大量依赖，签名必须一致）:
  - 常量：`DEFAULT_EXPECTANCY = 78`、`MIN_EXPECTANCY = 60`、`MAX_EXPECTANCY = 100`、`MAX_AGE = 120`、`MONTHS_PER_YEAR = 12`
  - `annualFrequency(freq: number, unit: FreqUnit): number` — 月频率 ×12 归一化
  - `ageFromBirthYear(birthYear: number, today: Date): number` — 年份差口径（只收年份，设计如此）
  - `yearsLeft(birthYear: number, expectancy: number, today: Date): number` — `max(0, 预期寿命 − 年龄)`
  - `remainingCount(years: number, annualFreq: number): number` — `floor(years × annualFreq)`
  - `type BirthYearValidation = { ok: true } | { ok: false; reason: 'invalid' | 'future' | 'too-old' }`
  - `validateBirthYear(birthYear: number, today: Date): BirthYearValidation`

- [ ] **Step 1: 写失败测试** `sites/bucket-list/src/lib/list-math.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPECTANCY,
  MAX_AGE,
  MAX_EXPECTANCY,
  MIN_EXPECTANCY,
  ageFromBirthYear,
  annualFrequency,
  remainingCount,
  validateBirthYear,
  yearsLeft,
} from './list-math'

const TODAY = new Date(2026, 7, 4)

describe('annualFrequency', () => {
  it('次/月 ×12 归一化', () => expect(annualFrequency(2, 'per-month')).toBe(24))
  it('次/年原样返回', () => expect(annualFrequency(6, 'per-year')).toBe(6))
  it('小数频率保留（四年一次 0.25）', () => expect(annualFrequency(0.25, 'per-year')).toBe(0.25))
})

describe('ageFromBirthYear', () => {
  it('只按年份差计算', () => expect(ageFromBirthYear(1996, TODAY)).toBe(30))
  it('今年出生为 0 岁', () => expect(ageFromBirthYear(2026, TODAY)).toBe(0))
})

describe('yearsLeft', () => {
  it('正常：78 − 30 = 48', () => expect(yearsLeft(1996, 78, TODAY)).toBe(48))
  it('年龄超过预期寿命时封 0', () => expect(yearsLeft(1940, 78, TODAY)).toBe(0))
  it('滑块寿命参与计算', () => expect(yearsLeft(1996, 100, TODAY)).toBe(70))
})

describe('remainingCount', () => {
  it('整数：48 年 × 24 次/年 = 1152', () => expect(remainingCount(48, 24)).toBe(1152))
  it('向下取整：3 年 × 0.25 = 0', () => expect(remainingCount(3, 0.25)).toBe(0))
  it('届数示例：52 年 × 0.25 = 13（设计文档「还能看 13 届」）', () =>
    expect(remainingCount(52, 0.25)).toBe(13))
  it('剩余 0 年 → 0 次', () => expect(remainingCount(0, 24)).toBe(0))
})

describe('validateBirthYear', () => {
  it('未来年份拒绝', () =>
    expect(validateBirthYear(2030, TODAY)).toEqual({ ok: false, reason: 'future' }))
  it('超过 120 岁拒绝', () =>
    expect(validateBirthYear(1905, TODAY)).toEqual({ ok: false, reason: 'too-old' }))
  it('恰好 120 岁放行', () => expect(validateBirthYear(1906, TODAY)).toEqual({ ok: true }))
  it('非整数拒绝', () =>
    expect(validateBirthYear(1996.5, TODAY)).toEqual({ ok: false, reason: 'invalid' }))
  it('NaN 拒绝', () =>
    expect(validateBirthYear(Number.NaN, TODAY)).toEqual({ ok: false, reason: 'invalid' }))
  it('正常年份放行', () => expect(validateBirthYear(1996, TODAY)).toEqual({ ok: true }))
})

describe('常量口径', () => {
  it('默认 78、滑块 60~100、年龄上限 120', () => {
    expect(DEFAULT_EXPECTANCY).toBe(78)
    expect(MIN_EXPECTANCY).toBe(60)
    expect(MAX_EXPECTANCY).toBe(100)
    expect(MAX_AGE).toBe(120)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/bucket-list/src/lib/list-math.ts`

```ts
import type { FreqUnit } from './bucket-items'

export const DEFAULT_EXPECTANCY = 78
export const MIN_EXPECTANCY = 60
export const MAX_EXPECTANCY = 100
export const MAX_AGE = 120
export const MONTHS_PER_YEAR = 12

export function annualFrequency(freq: number, unit: FreqUnit): number {
  return unit === 'per-month' ? freq * MONTHS_PER_YEAR : freq
}

// 只收出生年份（设计如此，不收完整生日）：年龄 = 今年 − 出生年。
// 与 01 life-math 同为「显式传 today 的整数周岁」口径，因输入粒度不同独立实现。
export function ageFromBirthYear(birthYear: number, today: Date): number {
  return today.getFullYear() - birthYear
}

export function yearsLeft(birthYear: number, expectancy: number, today: Date): number {
  return Math.max(0, expectancy - ageFromBirthYear(birthYear, today))
}

export function remainingCount(years: number, annualFreq: number): number {
  return Math.floor(years * annualFreq)
}

export type BirthYearValidation =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'future' | 'too-old' }

export function validateBirthYear(birthYear: number, today: Date): BirthYearValidation {
  if (!Number.isInteger(birthYear)) return { ok: false, reason: 'invalid' }
  if (birthYear > today.getFullYear()) return { ok: false, reason: 'future' }
  if (ageFromBirthYear(birthYear, today) > MAX_AGE) return { ok: false, reason: 'too-old' }
  return { ok: true }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/bucket-list test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): list-math 核心计算纯函数"
```

---

### Task 4: computeListStats 派生统计 + 强调分档（含全部边界彩蛋）

**Files:**
- Modify: `sites/bucket-list/src/lib/list-math.ts`
- Test: `sites/bucket-list/src/lib/list-math.test.ts`（追加）

**Interfaces:**
- Consumes: Task 2 的 `BucketItem`、Task 3 全部函数与常量
- Produces:
  - `interface SelectedItem extends BucketItem { custom: boolean }`
  - `type CountKind = 'times' | 'sessions' | 'last-chance' | 'bonus'`（sessions = 届数写法）
  - `interface ItemStat { id: string; name: string; icon: string; count: number; kind: CountKind }`
  - `interface ListStatsInput { birthYear: number; today: Date; expectancy?: number; items: SelectedItem[] }`
  - `interface ListStats { age: number; yearsLeft: number; mode: 'normal' | 'bonus'; items: ItemStat[] }` — normal 模式 `items` 按剩余次数**升序**（最稀缺置顶，平局保持勾选顺序）；bonus 模式保持勾选顺序
  - `computeListStats(input: ListStatsInput): ListStats`
  - `type EmphasisTier = 'high' | 'mid' | 'low'`；`emphasisTier(stat: ItemStat): EmphasisTier` — 视觉强调规则唯一实现
  - `unitLabel(kind: CountKind): string` — `'次'` / `'届'` / `''`
  - 文案常量：`LAST_CHANCE_TEXT`、`BONUS_BANNER_TEXT`、`CLOSING_TEXT`（与设计文档逐字一致）
  - 边界优先级：年龄 ≥ 预期寿命 → 整体 bonus 模式（覆盖一切）；`count === 0 && annualFreq > 0` → last-chance（覆盖「0 届」）；`annualFreq < 1` → sessions

- [ ] **Step 1: 写失败测试**（追加到 `list-math.test.ts`，import 行合并到文件顶部）

```ts
import {
  BONUS_BANNER_TEXT,
  CLOSING_TEXT,
  LAST_CHANCE_TEXT,
  computeListStats,
  emphasisTier,
  unitLabel,
  type ItemStat,
  type SelectedItem,
} from './list-math'

const item = (over: Partial<SelectedItem>): SelectedItem => ({
  id: 'hotpot',
  name: '吃火锅',
  icon: '🍲',
  freq: 2,
  unit: 'per-month',
  custom: false,
  ...over,
})

describe('computeListStats', () => {
  const base = { birthYear: 1996, today: TODAY } // 30 岁，默认 78 → 剩 48 年

  it('月频率归一化 + floor + 升序排列（最稀缺置顶）', () => {
    const stats = computeListStats({
      ...base,
      items: [
        item({}),
        item({ id: 'world-cup', name: '看世界杯', icon: '⚽', freq: 0.25, unit: 'per-year' }),
      ],
    })
    expect(stats.mode).toBe('normal')
    expect(stats.age).toBe(30)
    expect(stats.yearsLeft).toBe(48)
    expect(stats.items.map((s) => s.id)).toEqual(['world-cup', 'hotpot'])
    expect(stats.items[1].count).toBe(1152) // 48 年 × 24 次/年
  })

  it('频率 < 1 次/年 → 届数写法（kind: sessions）', () => {
    const stats = computeListStats({
      ...base,
      items: [item({ id: 'world-cup', freq: 0.25, unit: 'per-year' })],
    })
    expect(stats.items[0]).toMatchObject({ count: 12, kind: 'sessions' })
  })

  it('剩余次数 0 且频率 > 0 → 最后一次（覆盖「0 届」写法）', () => {
    const stats = computeListStats({
      birthYear: 1951, // 75 岁 → 剩 3 年
      today: TODAY,
      items: [item({ id: 'world-cup', freq: 0.25, unit: 'per-year' })],
    })
    expect(stats.items[0]).toMatchObject({ count: 0, kind: 'last-chance' })
  })

  it('年龄 ≥ 预期寿命 → 全清单奖励模式，保持勾选顺序', () => {
    const stats = computeListStats({
      birthYear: 1946,
      today: TODAY,
      items: [item({}), item({ id: 'sea', name: '看海', icon: '🌊', freq: 2, unit: 'per-year' })],
    })
    expect(stats.mode).toBe('bonus')
    expect(stats.items.every((s) => s.kind === 'bonus')).toBe(true)
    expect(stats.items.map((s) => s.id)).toEqual(['hotpot', 'sea'])
  })

  it('年龄恰好等于预期寿命也进奖励模式', () => {
    expect(computeListStats({ birthYear: 1948, today: TODAY, items: [item({})] }).mode).toBe('bonus')
  })

  it('滑块预期寿命参与计算', () => {
    const stats = computeListStats({
      ...base,
      expectancy: 100,
      items: [item({ id: 'birthday', freq: 1, unit: 'per-year' })],
    })
    expect(stats.items[0].count).toBe(70)
  })

  it('次数相同保持勾选顺序（稳定排序）', () => {
    const stats = computeListStats({
      ...base,
      items: [
        item({ id: 'cherry-blossom', freq: 1, unit: 'per-year' }),
        item({ id: 'birthday', freq: 1, unit: 'per-year' }),
      ],
    })
    expect(stats.items.map((s) => s.id)).toEqual(['cherry-blossom', 'birthday'])
  })

  it('不改动传入数组（不可变）', () => {
    const items = [item({}), item({ id: 'world-cup', freq: 0.25, unit: 'per-year' })]
    const stats = computeListStats({ ...base, items })
    expect(items.map((i) => i.id)).toEqual(['hotpot', 'world-cup'])
    expect(stats.items).not.toBe(items)
  })

  it('闰日当天计算口径不变（闰年无关性）', () => {
    const stats = computeListStats({
      birthYear: 2000,
      today: new Date(2028, 1, 29), // 2028-02-29
      items: [item({ id: 'birthday', freq: 1, unit: 'per-year' })],
    })
    expect(stats.items[0].count).toBe(50) // 78 − 28
  })
})

describe('emphasisTier / unitLabel', () => {
  const stat = (over: Partial<ItemStat>): ItemStat => ({
    id: 'x',
    name: 'x',
    icon: 'x',
    count: 1,
    kind: 'times',
    ...over,
  })

  it('三档阈值写死：<20 高、20~199 中、≥200 低', () => {
    expect(emphasisTier(stat({ count: 19 }))).toBe('high')
    expect(emphasisTier(stat({ count: 20 }))).toBe('mid')
    expect(emphasisTier(stat({ count: 199 }))).toBe('mid')
    expect(emphasisTier(stat({ count: 200 }))).toBe('low')
  })

  it('最后一次恒为高档', () =>
    expect(emphasisTier(stat({ count: 0, kind: 'last-chance' }))).toBe('high'))

  it('奖励模式恒为中档', () => expect(emphasisTier(stat({ kind: 'bonus' }))).toBe('mid'))

  it('单位：次 / 届 / 空', () => {
    expect(unitLabel('times')).toBe('次')
    expect(unitLabel('sessions')).toBe('届')
    expect(unitLabel('last-chance')).toBe('')
    expect(unitLabel('bonus')).toBe('')
  })
})

describe('文案常量', () => {
  it('与设计文档逐字一致', () => {
    expect(LAST_CHANCE_TEXT).toBe('下一次，可能就是最后一次')
    expect(BONUS_BANNER_TEXT).toBe('从今天起，每一次都是加场')
    expect(CLOSING_TEXT).toBe('数字不是倒计时，是提醒你每一次都算数')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL

- [ ] **Step 3: 实现**（追加到 `list-math.ts`；首行 import 改为 `import type { BucketItem, FreqUnit } from './bucket-items'`）

```ts
export interface SelectedItem extends BucketItem {
  custom: boolean
}

export type CountKind = 'times' | 'sessions' | 'last-chance' | 'bonus'

export interface ItemStat {
  id: string
  name: string
  icon: string
  count: number
  kind: CountKind
}

export interface ListStatsInput {
  birthYear: number
  today: Date
  expectancy?: number
  items: SelectedItem[]
}

export interface ListStats {
  age: number
  yearsLeft: number
  mode: 'normal' | 'bonus'
  items: ItemStat[]
}

export const LAST_CHANCE_TEXT = '下一次，可能就是最后一次'
export const BONUS_BANNER_TEXT = '从今天起，每一次都是加场'
export const CLOSING_TEXT = '数字不是倒计时，是提醒你每一次都算数'

export function computeListStats(input: ListStatsInput): ListStats {
  const expectancy = input.expectancy ?? DEFAULT_EXPECTANCY
  const age = ageFromBirthYear(input.birthYear, input.today)
  if (age >= expectancy) {
    // 奖励模式：不排序不算次数，保持勾选顺序
    return {
      age,
      yearsLeft: 0,
      mode: 'bonus',
      items: input.items.map((i) => ({
        id: i.id,
        name: i.name,
        icon: i.icon,
        count: 0,
        kind: 'bonus' as const,
      })),
    }
  }
  const years = yearsLeft(input.birthYear, expectancy, input.today)
  const items = input.items.map((i) => {
    const annual = annualFrequency(i.freq, i.unit)
    const count = remainingCount(years, annual)
    const kind: CountKind =
      count === 0 && annual > 0 ? 'last-chance' : annual < 1 ? 'sessions' : 'times'
    return { id: i.id, name: i.name, icon: i.icon, count, kind }
  })
  return {
    age,
    yearsLeft: years,
    mode: 'normal',
    // 升序 = 最稀缺置顶（第一眼最扎心）；sort 稳定，平局保持勾选顺序；浅拷贝保证不可变
    items: [...items].sort((a, b) => a.count - b.count),
  }
}

export type EmphasisTier = 'high' | 'mid' | 'low'

// 视觉强调规则（写死一种）：次数越少字号越大，三档阈值
export function emphasisTier(stat: ItemStat): EmphasisTier {
  if (stat.kind === 'last-chance') return 'high'
  if (stat.kind === 'bonus') return 'mid'
  if (stat.count < 20) return 'high'
  if (stat.count < 200) return 'mid'
  return 'low'
}

export function unitLabel(kind: CountKind): string {
  if (kind === 'times') return '次'
  if (kind === 'sessions') return '届'
  return ''
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/bucket-list test && pnpm --filter @viral/bucket-list typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): computeListStats 派生统计与强调分档"
```

---

### Task 5: 输入屏 InputScreen（出生年份 + 预期寿命滑块）

**Files:**
- Create: `sites/bucket-list/src/components/input-screen.tsx`
- Test: `sites/bucket-list/src/components/input-screen.test.tsx`

**Interfaces:**
- Consumes: `validateBirthYear`、`DEFAULT_EXPECTANCY`/`MIN_EXPECTANCY`/`MAX_EXPECTANCY`（Task 3）
- Produces: `<InputScreen onSubmit={(birthYear: number, expectancy: number) => void} today={Date} />` — 唯一必填出生年份（number 输入，**不收完整生日**）；预期寿命滑块 60~100 默认 78 常驻可见；校验失败展示文案且不触发 onSubmit

- [ ] **Step 1: 写失败测试** `sites/bucket-list/src/components/input-screen.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InputScreen } from './input-screen'

const TODAY = new Date(2026, 7, 4)

describe('InputScreen', () => {
  it('提交合法年份：onSubmit 拿到年份与默认预期寿命 78', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生年份'), '1996')
    await userEvent.click(screen.getByRole('button', { name: '去勾选我的清单' }))
    expect(onSubmit).toHaveBeenCalledWith(1996, 78)
  })

  it('滑块调整预期寿命后随提交带出', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生年份'), '1996')
    fireEvent.change(screen.getByLabelText('预期寿命'), { target: { value: '90' } })
    await userEvent.click(screen.getByRole('button', { name: '去勾选我的清单' }))
    expect(onSubmit).toHaveBeenCalledWith(1996, 90)
  })

  it('未来年份：展示文案且不提交', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生年份'), '2030')
    await userEvent.click(screen.getByRole('button', { name: '去勾选我的清单' }))
    expect(screen.getByText('你还没出生，不用焦虑')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('超过 120 岁：展示文案且不提交', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生年份'), '1900')
    await userEvent.click(screen.getByRole('button', { name: '去勾选我的清单' }))
    expect(screen.getByText('恭喜您打破吉尼斯纪录')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('空年份提交无反应', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.click(screen.getByRole('button', { name: '去勾选我的清单' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/bucket-list/src/components/input-screen.tsx`

```tsx
import { useState } from 'react'
import {
  DEFAULT_EXPECTANCY,
  MAX_EXPECTANCY,
  MIN_EXPECTANCY,
  validateBirthYear,
} from '../lib/list-math'

const ERROR_COPY: Record<'invalid' | 'future' | 'too-old', string> = {
  invalid: '先填一个四位数的出生年份',
  future: '你还没出生，不用焦虑',
  'too-old': '恭喜您打破吉尼斯纪录',
}

interface Props {
  onSubmit: (birthYear: number, expectancy: number) => void
  today: Date
}

export function InputScreen({ onSubmit, today }: Props) {
  const [yearStr, setYearStr] = useState('')
  const [expectancy, setExpectancy] = useState(DEFAULT_EXPECTANCY)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (yearStr === '') return
    const year = Number(yearStr)
    const check = validateBirthYear(year, today)
    if (!check.ok) {
      setError(ERROR_COPY[check.reason])
      return
    }
    setError(null)
    onSubmit(year, expectancy)
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-serif-cn text-3xl">余生清单</h1>
      <p className="text-sm text-[#8a7d68]">
        勾选你热爱的事，算算这辈子还能再来多少次。只填出生年份就够了，不用完整生日。
      </p>
      <label className="flex flex-col gap-2 text-sm">
        出生年份
        <input
          type="number"
          inputMode="numeric"
          placeholder="1996"
          value={yearStr}
          onChange={(e) => setYearStr(e.target.value)}
          className="rounded-md border border-[#e6d9bb] bg-transparent px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-[#a05a2c]">{error}</p>}
      <label className="flex flex-col gap-2 text-sm">
        预期寿命：{expectancy} 岁（默认 78，可拖动调整）
        <input
          type="range"
          min={MIN_EXPECTANCY}
          max={MAX_EXPECTANCY}
          value={expectancy}
          aria-label="预期寿命"
          onChange={(e) => setExpectancy(Number(e.target.value))}
          className="accent-[#a05a2c]"
        />
      </label>
      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-lg bg-[#a05a2c] py-3 font-medium text-[#faf3e3]"
      >
        去勾选我的清单
      </button>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/bucket-list test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): 输入屏（出生年份 + 预期寿命滑块）"
```

---

### Task 6: 勾选状态纯函数 selection（toggle / 调频率 / 自定义项 ≤5）

**Files:**
- Create: `sites/bucket-list/src/lib/selection.ts`
- Test: `sites/bucket-list/src/lib/selection.test.ts`

**Interfaces:**
- Consumes: `BucketItem`/`FreqUnit`/`MAX_CUSTOM_ITEMS`/`MAX_NAME_LENGTH`（Task 2）、`SelectedItem`（Task 4）
- Produces（全部纯函数、全部返回新副本）:
  - `toggleItem(selected: SelectedItem[], item: BucketItem): SelectedItem[]` — 未勾选则追加（`custom: false`，携带池默认频率），已勾选则移除
  - `updateFreq(selected: SelectedItem[], id: string, freq: number, unit: FreqUnit): SelectedItem[]` — 非法频率（NaN / ≤0）原样返回原数组（受控输入回弹）
  - `removeItem(selected: SelectedItem[], id: string): SelectedItem[]`
  - `type AddCustomResult = { ok: true; items: SelectedItem[] } | { ok: false; reason: 'limit-reached' | 'empty-name' | 'name-too-long' | 'bad-freq' }`
  - `addCustomItem(selected: SelectedItem[], draft: { name: string; freq: number; unit: FreqUnit }): AddCustomResult` — 上限 5 个（只数 `custom: true`，池内项不占名额）、名称 trim 后 1~8 字、频率 > 0；id 取未占用的最小 `custom-{n}`，图标固定 `✏️`

- [ ] **Step 1: 写失败测试** `sites/bucket-list/src/lib/selection.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { BUCKET_POOL } from './bucket-items'
import type { SelectedItem } from './list-math'
import { addCustomItem, removeItem, toggleItem, updateFreq } from './selection'

const hotpot = BUCKET_POOL[0] // 吃火锅 2 次/月

describe('toggleItem', () => {
  it('未勾选 → 追加（custom: false，带池默认频率），不改原数组', () => {
    const before: SelectedItem[] = []
    const after = toggleItem(before, hotpot)
    expect(after).toHaveLength(1)
    expect(after[0]).toMatchObject({ id: 'hotpot', custom: false, freq: 2, unit: 'per-month' })
    expect(before).toHaveLength(0)
  })

  it('已勾选 → 移除', () => {
    const selected = toggleItem([], hotpot)
    expect(toggleItem(selected, hotpot)).toHaveLength(0)
  })
})

describe('updateFreq', () => {
  const selected = toggleItem([], hotpot)

  it('返回新数组新对象，不改原对象', () => {
    const after = updateFreq(selected, 'hotpot', 4, 'per-year')
    expect(after[0]).toMatchObject({ freq: 4, unit: 'per-year' })
    expect(selected[0].freq).toBe(2)
    expect(after).not.toBe(selected)
  })

  it('非法频率（0/负数/NaN）原样返回', () => {
    expect(updateFreq(selected, 'hotpot', 0, 'per-year')).toBe(selected)
    expect(updateFreq(selected, 'hotpot', -1, 'per-year')).toBe(selected)
    expect(updateFreq(selected, 'hotpot', Number.NaN, 'per-year')).toBe(selected)
  })
})

describe('addCustomItem', () => {
  it('成功：追加 custom 项并去掉首尾空格', () => {
    const result = addCustomItem([], { name: ' 撸猫 ', freq: 1, unit: 'per-month' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items[0]).toMatchObject({ id: 'custom-1', name: '撸猫', custom: true })
    }
  })

  it('空名 / 超 8 字 / 非法频率被拒', () => {
    expect(addCustomItem([], { name: '  ', freq: 1, unit: 'per-year' })).toEqual({
      ok: false,
      reason: 'empty-name',
    })
    expect(addCustomItem([], { name: '一二三四五六七八九', freq: 1, unit: 'per-year' })).toEqual({
      ok: false,
      reason: 'name-too-long',
    })
    expect(addCustomItem([], { name: '撸猫', freq: 0, unit: 'per-year' })).toEqual({
      ok: false,
      reason: 'bad-freq',
    })
  })

  it('第 6 个被拒（上限 5）', () => {
    let items: SelectedItem[] = []
    for (let i = 1; i <= 5; i += 1) {
      const r = addCustomItem(items, { name: `事${i}`, freq: 1, unit: 'per-year' })
      expect(r.ok).toBe(true)
      if (r.ok) items = r.items
    }
    expect(addCustomItem(items, { name: '事6', freq: 1, unit: 'per-year' })).toEqual({
      ok: false,
      reason: 'limit-reached',
    })
  })

  it('删掉中间项后新增 id 不与现存冲突', () => {
    let items: SelectedItem[] = []
    const r1 = addCustomItem(items, { name: '事一', freq: 1, unit: 'per-year' })
    if (r1.ok) items = r1.items // custom-1
    const r2 = addCustomItem(items, { name: '事二', freq: 1, unit: 'per-year' })
    if (r2.ok) items = r2.items // custom-2
    items = removeItem(items, 'custom-1')
    const r3 = addCustomItem(items, { name: '事三', freq: 1, unit: 'per-year' })
    expect(r3.ok).toBe(true)
    if (r3.ok) {
      const ids = r3.items.filter((i) => i.custom).map((i) => i.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('池内项不占自定义名额', () => {
    let items = toggleItem([], hotpot)
    for (let i = 1; i <= 5; i += 1) {
      const r = addCustomItem(items, { name: `事${i}`, freq: 1, unit: 'per-year' })
      expect(r.ok).toBe(true)
      if (r.ok) items = r.items
    }
  })
})

describe('removeItem', () => {
  it('按 id 移除且不改原数组', () => {
    const selected = toggleItem([], hotpot)
    const after = removeItem(selected, 'hotpot')
    expect(after).toHaveLength(0)
    expect(selected).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/bucket-list/src/lib/selection.ts`

```ts
import {
  MAX_CUSTOM_ITEMS,
  MAX_NAME_LENGTH,
  type BucketItem,
  type FreqUnit,
} from './bucket-items'
import type { SelectedItem } from './list-math'

export function toggleItem(selected: SelectedItem[], item: BucketItem): SelectedItem[] {
  if (selected.some((i) => i.id === item.id)) return selected.filter((i) => i.id !== item.id)
  return [
    ...selected,
    { id: item.id, name: item.name, icon: item.icon, freq: item.freq, unit: item.unit, custom: false },
  ]
}

export function updateFreq(
  selected: SelectedItem[],
  id: string,
  freq: number,
  unit: FreqUnit,
): SelectedItem[] {
  if (!Number.isFinite(freq) || freq <= 0) return selected
  return selected.map((i) => (i.id === id ? { ...i, freq, unit } : i))
}

export function removeItem(selected: SelectedItem[], id: string): SelectedItem[] {
  return selected.filter((i) => i.id !== id)
}

export type AddCustomResult =
  | { ok: true; items: SelectedItem[] }
  | { ok: false; reason: 'limit-reached' | 'empty-name' | 'name-too-long' | 'bad-freq' }

function nextCustomId(selected: SelectedItem[]): string {
  const used = new Set(selected.filter((i) => i.custom).map((i) => i.id))
  let n = 1
  while (used.has(`custom-${n}`)) n += 1
  return `custom-${n}`
}

export function addCustomItem(
  selected: SelectedItem[],
  draft: { name: string; freq: number; unit: FreqUnit },
): AddCustomResult {
  if (selected.filter((i) => i.custom).length >= MAX_CUSTOM_ITEMS) {
    return { ok: false, reason: 'limit-reached' }
  }
  const name = draft.name.trim()
  if (name === '') return { ok: false, reason: 'empty-name' }
  if ([...name].length > MAX_NAME_LENGTH) return { ok: false, reason: 'name-too-long' }
  if (!Number.isFinite(draft.freq) || draft.freq <= 0) return { ok: false, reason: 'bad-freq' }
  return {
    ok: true,
    items: [
      ...selected,
      { id: nextCustomId(selected), name, icon: '✏️', freq: draft.freq, unit: draft.unit, custom: true },
    ],
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/bucket-list test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): 勾选状态纯函数（频率调整与自定义项）"
```

---

### Task 7: 清单屏 ChecklistScreen（打勾动效 + item_selected 埋点）

**Files:**
- Create: `sites/bucket-list/src/components/checklist-screen.tsx`
- Test: `sites/bucket-list/src/components/checklist-screen.test.tsx`

**Interfaces:**
- Consumes: `BUCKET_POOL`/`MAX_NAME_LENGTH`/`FreqUnit`（Task 2）、`SelectedItem`（Task 4）、`toggleItem`/`updateFreq`/`addCustomItem`/`removeItem`（Task 6）、`track`（shared）
- Produces: `<ChecklistScreen onGenerate={(items: SelectedItem[]) => void} />` —
  - 池 20 项渲染为 `role="checkbox"` 按钮（`aria-label` = 名称），勾选瞬间 `track('item_selected', { item: id })`，取消不上报
  - 勾选后展开频率编辑器（number 输入 + 次/月|次/年 select）
  - 自定义项 ≤5 个：名称输入（`maxLength=8`）+ 频率 + 单位 + 添加按钮；添加成功 `track('item_selected', { item: 'custom' })`——**绝不上报名称内容**；错误 reason 映射文案：limit-reached「最多加 5 个自定义项」/ empty-name「先给这件事起个名字」/ name-too-long「名字最多 8 个字」/ bad-freq「频率得大于 0」
  - 「生成我的余生清单」按钮，`selected.length === 0` 时禁用
  - 打勾动效：SVG polyline 用 `.check-tick` / `.check-tick-on`（Task 1 的 CSS）

- [ ] **Step 1: 写失败测试** `sites/bucket-list/src/components/checklist-screen.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChecklistScreen } from './checklist-screen'

describe('ChecklistScreen', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('渲染默认池全部 20 项', () => {
    render(<ChecklistScreen onGenerate={vi.fn()} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(20)
    expect(screen.getByRole('checkbox', { name: '吃火锅' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '看世界杯' })).toBeInTheDocument()
  })

  it('勾选上报 item_selected 带清单项 id，取消勾选不再上报', async () => {
    render(<ChecklistScreen onGenerate={vi.fn()} />)
    const box = screen.getByRole('checkbox', { name: '吃火锅' })
    await userEvent.click(box)
    expect(umamiSpy).toHaveBeenCalledWith('item_selected', { item: 'hotpot' })
    await userEvent.click(box)
    expect(umamiSpy).toHaveBeenCalledTimes(1)
  })

  it('勾选后出现频率编辑器，改频率与单位随 onGenerate 带出', async () => {
    const onGenerate = vi.fn()
    render(<ChecklistScreen onGenerate={onGenerate} />)
    await userEvent.click(screen.getByRole('checkbox', { name: '吃火锅' }))
    const freq = screen.getByLabelText('吃火锅的频率')
    expect(freq).toHaveValue(2)
    // 受控 number 输入清空中间态会被 updateFreq 守卫回弹，用单次 change 模拟完整输入
    fireEvent.change(freq, { target: { value: '4' } })
    await userEvent.selectOptions(screen.getByLabelText('吃火锅的频率单位'), 'per-year')
    await userEvent.click(screen.getByRole('button', { name: '生成我的余生清单' }))
    expect(onGenerate).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'hotpot', freq: 4, unit: 'per-year', custom: false }),
    ])
  })

  it('未勾选任何项时生成按钮禁用', () => {
    render(<ChecklistScreen onGenerate={vi.fn()} />)
    expect(screen.getByRole('button', { name: '生成我的余生清单' })).toBeDisabled()
  })

  it('自定义项：添加成功，埋点只记 custom 不记内容', async () => {
    render(<ChecklistScreen onGenerate={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('自定义事项名称'), '撸猫')
    await userEvent.click(screen.getByRole('button', { name: '添加' }))
    expect(screen.getByText(/撸猫/)).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('item_selected', { item: 'custom' })
    expect(JSON.stringify(umamiSpy.mock.calls)).not.toContain('撸猫')
  })

  it('第 6 个自定义项被拒并显示文案', async () => {
    render(<ChecklistScreen onGenerate={vi.fn()} />)
    const name = screen.getByLabelText('自定义事项名称')
    for (let i = 1; i <= 5; i += 1) {
      await userEvent.type(name, `第${i}件事`)
      await userEvent.click(screen.getByRole('button', { name: '添加' }))
    }
    await userEvent.type(name, '第六件事')
    await userEvent.click(screen.getByRole('button', { name: '添加' }))
    expect(screen.getByText('最多加 5 个自定义项')).toBeInTheDocument()
  })

  it('空名字被拒并显示文案', async () => {
    render(<ChecklistScreen onGenerate={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '添加' }))
    expect(screen.getByText('先给这件事起个名字')).toBeInTheDocument()
  })

  it('自定义项可删除', async () => {
    render(<ChecklistScreen onGenerate={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('自定义事项名称'), '撸猫')
    await userEvent.click(screen.getByRole('button', { name: '添加' }))
    await userEvent.click(screen.getByRole('button', { name: '删除撸猫' }))
    expect(screen.queryByText(/✏️ 撸猫/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/bucket-list/src/components/checklist-screen.tsx`

```tsx
import { useState } from 'react'
import { track } from '@viral/shared'
import { BUCKET_POOL, MAX_NAME_LENGTH, type BucketItem, type FreqUnit } from '../lib/bucket-items'
import type { SelectedItem } from '../lib/list-math'
import { addCustomItem, removeItem, toggleItem, updateFreq } from '../lib/selection'

const ADD_ERROR_COPY = {
  'limit-reached': '最多加 5 个自定义项',
  'empty-name': '先给这件事起个名字',
  'name-too-long': '名字最多 8 个字',
  'bad-freq': '频率得大于 0',
} as const

const UNIT_TEXT: Record<FreqUnit, string> = { 'per-month': '次/月', 'per-year': '次/年' }

interface Props {
  onGenerate: (items: SelectedItem[]) => void
}

function TickBox({ checked }: { checked: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="#a05a2c" strokeWidth="2" />
      <polyline
        points="6,12 10.5,17 18,7"
        fill="none"
        stroke="#55703f"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={checked ? 'check-tick check-tick-on' : 'check-tick'}
      />
    </svg>
  )
}

export function ChecklistScreen({ onGenerate }: Props) {
  const [selected, setSelected] = useState<SelectedItem[]>([])
  const [draftName, setDraftName] = useState('')
  const [draftFreq, setDraftFreq] = useState('1')
  const [draftUnit, setDraftUnit] = useState<FreqUnit>('per-month')
  const [addError, setAddError] = useState<string | null>(null)

  const handleToggle = (item: BucketItem) => {
    if (!selected.some((i) => i.id === item.id)) track('item_selected', { item: item.id })
    setSelected(toggleItem(selected, item))
  }

  const handleAdd = () => {
    const result = addCustomItem(selected, {
      name: draftName,
      freq: Number(draftFreq),
      unit: draftUnit,
    })
    if (!result.ok) {
      setAddError(ADD_ERROR_COPY[result.reason])
      return
    }
    track('item_selected', { item: 'custom' })
    setAddError(null)
    setDraftName('')
    setSelected(result.items)
  }

  const customItems = selected.filter((i) => i.custom)

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-serif-cn text-3xl">勾选你热爱的事</h1>
      <p className="text-sm text-[#8a7d68]">
        勾上的每一项都会算出「这辈子还能来多少次」，频率不准就自己调。
      </p>
      <ul className="flex flex-col">
        {BUCKET_POOL.map((item) => {
          const current = selected.find((i) => i.id === item.id)
          return (
            <li key={item.id} className="border-b border-[#e6d9bb] py-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={current != null}
                aria-label={item.name}
                onClick={() => handleToggle(item)}
                className="flex w-full items-center gap-3 text-left"
              >
                <TickBox checked={current != null} />
                <span className="text-base">
                  {item.icon} {item.name}
                </span>
              </button>
              {current && (
                <div className="mt-2 flex items-center gap-2 pl-9 text-sm">
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={current.freq}
                    aria-label={`${item.name}的频率`}
                    onChange={(e) =>
                      setSelected(updateFreq(selected, item.id, Number(e.target.value), current.unit))
                    }
                    className="w-20 rounded-md border border-[#e6d9bb] bg-transparent px-2 py-1"
                  />
                  <select
                    value={current.unit}
                    aria-label={`${item.name}的频率单位`}
                    onChange={(e) =>
                      setSelected(updateFreq(selected, item.id, current.freq, e.target.value as FreqUnit))
                    }
                    className="rounded-md border border-[#e6d9bb] bg-transparent px-2 py-1"
                  >
                    <option value="per-month">次/月</option>
                    <option value="per-year">次/年</option>
                  </select>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[#a05a2c] p-4">
        <p className="text-sm">没有你热爱的事？自己加（最多 5 个）</p>
        {customItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span>
              {item.icon} {item.name}（{item.freq} {UNIT_TEXT[item.unit]}）
            </span>
            <button
              type="button"
              aria-label={`删除${item.name}`}
              onClick={() => setSelected(removeItem(selected, item.id))}
              className="text-[#8a7d68]"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <input
            value={draftName}
            maxLength={MAX_NAME_LENGTH}
            placeholder="比如：撸猫"
            aria-label="自定义事项名称"
            onChange={(e) => setDraftName(e.target.value)}
            className="w-24 flex-1 rounded-md border border-[#e6d9bb] bg-transparent px-2 py-1"
          />
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={draftFreq}
            aria-label="自定义事项频率"
            onChange={(e) => setDraftFreq(e.target.value)}
            className="w-16 rounded-md border border-[#e6d9bb] bg-transparent px-2 py-1"
          />
          <select
            value={draftUnit}
            aria-label="自定义事项频率单位"
            onChange={(e) => setDraftUnit(e.target.value as FreqUnit)}
            className="rounded-md border border-[#e6d9bb] bg-transparent px-2 py-1"
          >
            <option value="per-month">次/月</option>
            <option value="per-year">次/年</option>
          </select>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-md bg-[#55703f] px-3 py-1 text-[#faf3e3]"
          >
            添加
          </button>
        </div>
        {addError && <p className="text-sm text-[#a05a2c]">{addError}</p>}
      </div>
      <button
        type="button"
        disabled={selected.length === 0}
        onClick={() => onGenerate(selected)}
        className="rounded-lg bg-[#a05a2c] py-3 font-medium text-[#faf3e3] disabled:opacity-40"
      >
        生成我的余生清单
      </button>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/bucket-list test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): 清单勾选屏与 item_selected 埋点"
```

---

### Task 8: 结果屏 ResultScreen（升序清单 + 纸胶带 + 收尾文案）

**Files:**
- Create: `sites/bucket-list/src/components/result-screen.tsx`
- Test: `sites/bucket-list/src/components/result-screen.test.tsx`

**Interfaces:**
- Consumes: `ListStats`/`ItemStat`/`emphasisTier`/`unitLabel`/文案常量（Task 4）
- Produces: `<ResultScreen stats={ListStats} onRestart={() => void}>{children}</ResultScreen>` —
  - 手账纸容器（`#fdf8ea` + `.washi-tape` 贴角）内按 `stats.items` 传入顺序渲染（computeListStats 已升序，最稀缺在最上——**排列顺序本身就是情绪设计**）
  - 行 = emoji + 名称（左）+ 次数展示（右）；次数展示按 kind：last-chance → 完整句「下一次，可能就是最后一次」（焦糖棕加粗）；bonus → 「加场」（草木绿）；times/sessions → 分档大数字 + 单位小字
  - 强调三档（写死）：high → `text-4xl font-bold text-[#a05a2c]`；mid → `text-2xl font-semibold text-[#a05a2c]`；low → `text-xl text-[#3d3327]`；数字千分位格式化
  - bonus 模式在标题下渲染 banner「从今天起，每一次都是加场」
  - 清单下方固定收尾文案 + `children` 插槽（保存按钮由 App 注入）+ 「重新来一次」按钮
  - 行逐条 fade-in（沿用 Task 1 的 `@keyframes fade-in`，reduced-motion 下由 CSS 关闭）

- [ ] **Step 1: 写失败测试** `sites/bucket-list/src/components/result-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ListStats } from '../lib/list-math'
import { ResultScreen } from './result-screen'

const normal: ListStats = {
  age: 30,
  yearsLeft: 48,
  mode: 'normal',
  items: [
    { id: 'world-cup', name: '看世界杯', icon: '⚽', count: 0, kind: 'last-chance' },
    { id: 'cherry-blossom', name: '看樱花', icon: '🌸', count: 2, kind: 'times' },
    { id: 'concert', name: '看演唱会', icon: '🎤', count: 58, kind: 'times' },
    { id: 'hotpot', name: '吃火锅', icon: '🍲', count: 1152, kind: 'times' },
  ],
}

describe('ResultScreen', () => {
  it('按传入顺序渲染（最稀缺在最上）', () => {
    render(<ResultScreen stats={normal} onRestart={() => {}} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('看世界杯')
    expect(rows[3]).toHaveTextContent('吃火锅')
  })

  it('最后一次行显示完整扎心句', () => {
    render(<ResultScreen stats={normal} onRestart={() => {}} />)
    expect(screen.getByText('下一次，可能就是最后一次')).toBeInTheDocument()
  })

  it('强调三档：次数越少字号越大，数字千分位', () => {
    render(<ResultScreen stats={normal} onRestart={() => {}} />)
    expect(screen.getByText('2').className).toContain('text-4xl')
    expect(screen.getByText('58').className).toContain('text-2xl')
    expect(screen.getByText('1,152').className).toContain('text-xl')
  })

  it('届数行带「届」单位', () => {
    render(
      <ResultScreen
        stats={{
          age: 30,
          yearsLeft: 48,
          mode: 'normal',
          items: [{ id: 'world-cup', name: '看世界杯', icon: '⚽', count: 12, kind: 'sessions' }],
        }}
        onRestart={() => {}}
      />,
    )
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('届')).toBeInTheDocument()
  })

  it('奖励模式：banner + 每行显示加场', () => {
    render(
      <ResultScreen
        stats={{
          age: 80,
          yearsLeft: 0,
          mode: 'bonus',
          items: [
            { id: 'hotpot', name: '吃火锅', icon: '🍲', count: 0, kind: 'bonus' },
            { id: 'sea', name: '看海', icon: '🌊', count: 0, kind: 'bonus' },
          ],
        }}
        onRestart={() => {}}
      />,
    )
    expect(screen.getByText('从今天起，每一次都是加场')).toBeInTheDocument()
    expect(screen.getAllByText('加场')).toHaveLength(2)
  })

  it('收尾文案与纸胶带贴角', () => {
    const { container } = render(<ResultScreen stats={normal} onRestart={() => {}} />)
    expect(screen.getByText('数字不是倒计时，是提醒你每一次都算数')).toBeInTheDocument()
    expect(container.querySelector('.washi-tape')).not.toBeNull()
  })

  it('重新来一次触发 onRestart，children 插槽渲染', () => {
    const onRestart = vi.fn()
    render(
      <ResultScreen stats={normal} onRestart={onRestart}>
        <button>保存我的余生清单</button>
      </ResultScreen>,
    )
    expect(screen.getByText('保存我的余生清单')).toBeInTheDocument()
    screen.getByRole('button', { name: '重新来一次' }).click()
    expect(onRestart).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/bucket-list/src/components/result-screen.tsx`

```tsx
import type { ReactNode } from 'react'
import {
  BONUS_BANNER_TEXT,
  CLOSING_TEXT,
  LAST_CHANCE_TEXT,
  emphasisTier,
  unitLabel,
  type ItemStat,
  type ListStats,
} from '../lib/list-math'

// 视觉强调规则（写死）：次数越少字号越大
const TIER_NUMBER_CLASS = {
  high: 'text-4xl font-bold text-[#a05a2c]',
  mid: 'text-2xl font-semibold text-[#a05a2c]',
  low: 'text-xl text-[#3d3327]',
} as const

function CountCell({ stat }: { stat: ItemStat }) {
  if (stat.kind === 'last-chance') {
    return <span className="text-sm font-bold text-[#a05a2c]">{LAST_CHANCE_TEXT}</span>
  }
  if (stat.kind === 'bonus') {
    return <span className="text-2xl font-semibold text-[#55703f]">加场</span>
  }
  return (
    <span className="flex items-baseline gap-1">
      <span className={TIER_NUMBER_CLASS[emphasisTier(stat)]}>
        {stat.count.toLocaleString('en-US')}
      </span>
      <span className="text-sm text-[#8a7d68]">{unitLabel(stat.kind)}</span>
    </span>
  )
}

interface Props {
  stats: ListStats
  onRestart: () => void
  children?: ReactNode
}

export function ResultScreen({ stats, onRestart, children }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="relative rounded-lg border border-[#e6d9bb] bg-[#fdf8ea] px-5 pb-6 pt-8">
        <span className="washi-tape" aria-hidden="true" />
        <h1 className="font-serif-cn text-2xl">我的余生清单</h1>
        {stats.mode === 'bonus' && (
          <p className="mt-2 text-base font-semibold text-[#a05a2c]">{BONUS_BANNER_TEXT}</p>
        )}
        <ul className="mt-4 flex flex-col">
          {stats.items.map((stat, i) => (
            <li
              key={stat.id}
              className="flex animate-[fade-in_0.5s_ease-out_both] items-center justify-between gap-3 border-b border-dashed border-[#e6d9bb] py-3"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <span className="text-base">
                {stat.icon} {stat.name}
              </span>
              <CountCell stat={stat} />
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-[#8a7d68]">{CLOSING_TEXT}</p>
      </div>
      <div className="flex flex-col gap-3">
        {children}
        <button type="button" onClick={onRestart} className="py-2 text-sm text-[#8a7d68]">
          重新来一次
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/bucket-list test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): 结果屏（升序清单 + 纸胶带 + 收尾文案）"
```

---

### Task 9: 清单卡绘制 + 保存流程（8 项截断 / 双路径保存）

**Files:**
- Create: `sites/bucket-list/src/card/draw-bucket-card.ts`, `sites/bucket-list/src/components/save-card-button.tsx`, `sites/bucket-list/src/components/long-press-overlay.tsx`
- Test: `sites/bucket-list/src/card/draw-bucket-card.test.ts`, `sites/bucket-list/src/components/save-card-button.test.tsx`

**Interfaces:**
- Consumes: `renderCard`/`saveCard`/`track`/`DrawFn`（shared）、`ListStats`/`ItemStat`/`emphasisTier`/`unitLabel`/文案常量（Task 4）、`MAX_NAME_LENGTH`（Task 2）、`installCanvasStub`（Task 1）
- Produces:
  - `const CARD_MAX_ROWS = 8`
  - `truncateName(name: string): string` — 超 8 字截断加 `…`（防御性，自定义项校验已限 8 字）
  - `makeBucketCardDraw(stats: ListStats): DrawFn` — 1080×1440 竖版列表卡：奶油纸底 + 手账横线 + 双纸胶带贴角（canvas 旋转矩形）+ 标题「我的余生清单」+ 最稀缺 8 行（假定 `stats.items` 已升序，自身只 `slice(0, 8)`；行 = 绿 ✓ + emoji + 名称 + 右对齐次数）+ 收尾文案 + 品牌条「余生清单 · viral-sites」；bonus 模式加 banner、行显示「加场」
  - `<SaveCardButton stats={ListStats} />` — 点击：renderCard → saveCard；成功 `track('save_image')`；long-press 策略弹 `<LongPressOverlay dataUrl onClose />`；异常 `track('export_error')` 并提示「保存失败了，直接截图也一样」

- [ ] **Step 1: 写失败测试**

`sites/bucket-list/src/card/draw-bucket-card.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { LAST_CHANCE_TEXT, type ListStats } from '../lib/list-math'
import { CARD_MAX_ROWS, makeBucketCardDraw, truncateName } from './draw-bucket-card'

function fakeCtx() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

const textsOf = (ctx: CanvasRenderingContext2D) =>
  (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))

function statsWith(items: ListStats['items'], mode: ListStats['mode'] = 'normal'): ListStats {
  return { age: 30, yearsLeft: 48, mode, items }
}

const tenItems = Array.from({ length: 10 }, (_, i) => ({
  id: `item-${i}`,
  name: `第${i}件事`,
  icon: '🍀',
  count: (i + 1) * 3,
  kind: 'times' as const,
}))

const SIZE = { width: 1080, height: 1440 }

describe('makeBucketCardDraw', () => {
  it('超过 8 项只画最稀缺的前 8 行', () => {
    const ctx = fakeCtx()
    makeBucketCardDraw(statsWith(tenItems))(ctx, SIZE)
    const texts = textsOf(ctx)
    expect(texts.some((t) => t.includes('第7件事'))).toBe(true)
    expect(texts.some((t) => t.includes('第8件事'))).toBe(false)
    expect(texts.some((t) => t.includes('第9件事'))).toBe(false)
  })

  it('标题、收尾文案、品牌条都在', () => {
    const ctx = fakeCtx()
    makeBucketCardDraw(statsWith(tenItems))(ctx, SIZE)
    const texts = textsOf(ctx)
    expect(texts).toContain('我的余生清单')
    expect(texts).toContain('数字不是倒计时，是提醒你每一次都算数')
    expect(texts).toContain('余生清单 · viral-sites')
  })

  it('最后一次行画完整扎心句', () => {
    const ctx = fakeCtx()
    makeBucketCardDraw(
      statsWith([{ id: 'world-cup', name: '看世界杯', icon: '⚽', count: 0, kind: 'last-chance' }]),
    )(ctx, SIZE)
    expect(textsOf(ctx)).toContain(LAST_CHANCE_TEXT)
  })

  it('届数行带「届」单位', () => {
    const ctx = fakeCtx()
    makeBucketCardDraw(
      statsWith([{ id: 'world-cup', name: '看世界杯', icon: '⚽', count: 12, kind: 'sessions' }]),
    )(ctx, SIZE)
    expect(textsOf(ctx)).toContain('12 届')
  })

  it('奖励模式画 banner 且行显示加场', () => {
    const ctx = fakeCtx()
    makeBucketCardDraw(
      statsWith([{ id: 'hotpot', name: '吃火锅', icon: '🍲', count: 0, kind: 'bonus' }], 'bonus'),
    )(ctx, SIZE)
    const texts = textsOf(ctx)
    expect(texts).toContain('从今天起，每一次都是加场')
    expect(texts).toContain('加场')
  })

  it('纸胶带用旋转矩形绘制（save/rotate/restore 成对出现）', () => {
    const ctx = fakeCtx()
    makeBucketCardDraw(statsWith(tenItems))(ctx, SIZE)
    const save = ctx.save as unknown as ReturnType<typeof vi.fn>
    const restore = ctx.restore as unknown as ReturnType<typeof vi.fn>
    const rotate = ctx.rotate as unknown as ReturnType<typeof vi.fn>
    expect(save.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(rotate.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(save.mock.calls.length).toBe(restore.mock.calls.length)
  })
})

describe('truncateName / CARD_MAX_ROWS', () => {
  it('8 字以内原样返回', () => expect(truncateName('回家吃爸妈做的饭')).toBe('回家吃爸妈做的饭'))
  it('超长截到 8 字加省略号', () =>
    expect(truncateName('一二三四五六七八九十')).toBe('一二三四五六七八…'))
  it('CARD_MAX_ROWS 定为 8', () => expect(CARD_MAX_ROWS).toBe(8))
})
```

`sites/bucket-list/src/components/save-card-button.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { ListStats } from '../lib/list-math'
import { SaveCardButton } from './save-card-button'

const stats: ListStats = {
  age: 30,
  yearsLeft: 48,
  mode: 'normal',
  items: [{ id: 'hotpot', name: '吃火锅', icon: '🍲', count: 1152, kind: 'times' }],
}

describe('SaveCardButton', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('桌面：点击触发下载并埋点 save_image', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton stats={stats} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的余生清单' }))
    expect(umamiSpy).toHaveBeenCalledWith('save_image', undefined)
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton stats={stats} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的余生清单' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton stats={stats} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的余生清单' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/bucket-list/src/card/draw-bucket-card.ts`：

```ts
import type { DrawFn } from '@viral/shared'
import { MAX_NAME_LENGTH } from '../lib/bucket-items'
import {
  BONUS_BANNER_TEXT,
  CLOSING_TEXT,
  LAST_CHANCE_TEXT,
  emphasisTier,
  unitLabel,
  type ItemStat,
  type ListStats,
} from '../lib/list-math'

export const CARD_MAX_ROWS = 8

const COLORS = {
  bg: '#faf3e3',
  line: 'rgba(160, 90, 44, 0.12)',
  ink: '#3d3327',
  caramel: '#a05a2c',
  green: '#55703f',
  sub: '#8a7d68',
  tapeGreen: 'rgba(85, 112, 63, 0.28)',
  tapeCaramel: 'rgba(160, 90, 44, 0.22)',
} as const

// 强调三档在卡片上的字号（与结果屏同一 emphasisTier 规则）
const NUMBER_FONT = {
  high: '700 88px -apple-system, sans-serif',
  mid: '600 64px -apple-system, sans-serif',
  low: '500 48px -apple-system, sans-serif',
} as const

const ROW_START_Y = 380
const ROW_HEIGHT = 110

export function truncateName(name: string): string {
  const chars = [...name]
  return chars.length > MAX_NAME_LENGTH ? `${chars.slice(0, MAX_NAME_LENGTH).join('')}…` : name
}

function drawTape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.fillRect(-110, -30, 220, 60)
  ctx.restore()
}

function drawCount(ctx: CanvasRenderingContext2D, stat: ItemStat, rightX: number, baseY: number) {
  ctx.textAlign = 'right'
  if (stat.kind === 'last-chance') {
    ctx.fillStyle = COLORS.caramel
    ctx.font = '700 34px -apple-system, sans-serif'
    ctx.fillText(LAST_CHANCE_TEXT, rightX, baseY)
    return
  }
  if (stat.kind === 'bonus') {
    ctx.fillStyle = COLORS.green
    ctx.font = '600 48px -apple-system, sans-serif'
    ctx.fillText('加场', rightX, baseY)
    return
  }
  const tier = emphasisTier(stat)
  ctx.fillStyle = tier === 'low' ? COLORS.ink : COLORS.caramel
  ctx.font = NUMBER_FONT[tier]
  ctx.fillText(`${stat.count.toLocaleString('en-US')} ${unitLabel(stat.kind)}`, rightX, baseY)
}

export function makeBucketCardDraw(stats: ListStats): DrawFn {
  return (ctx, size) => {
    // 奶油纸底 + 手账横线
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.fillStyle = COLORS.line
    for (let y = 320; y <= 1200; y += ROW_HEIGHT) {
      ctx.fillRect(80, y, size.width - 160, 2)
    }

    // 签名元素：双纸胶带贴角
    drawTape(ctx, 140, 70, -0.12, COLORS.tapeGreen)
    drawTape(ctx, size.width - 140, 90, 0.1, COLORS.tapeCaramel)

    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.ink
    ctx.font = '600 64px "Songti SC", "Noto Serif SC", serif'
    ctx.fillText('我的余生清单', size.width / 2, 200)

    if (stats.mode === 'bonus') {
      ctx.fillStyle = COLORS.caramel
      ctx.font = '500 40px -apple-system, sans-serif'
      ctx.fillText(BONUS_BANNER_TEXT, size.width / 2, 272)
    }

    // 清单行：stats.items 已升序（computeListStats 保证），取最稀缺 8 项
    const rows = stats.items.slice(0, CARD_MAX_ROWS)
    rows.forEach((stat, i) => {
      const baseY = ROW_START_Y + i * ROW_HEIGHT
      ctx.textAlign = 'left'
      ctx.fillStyle = COLORS.green
      ctx.font = '700 44px -apple-system, sans-serif'
      ctx.fillText('✓', 90, baseY) // 签名元素：卡上静态打勾
      ctx.fillStyle = COLORS.ink
      ctx.font = '400 44px -apple-system, sans-serif'
      ctx.fillText(`${stat.icon} ${truncateName(stat.name)}`, 150, baseY)
      drawCount(ctx, stat, size.width - 90, baseY)
    })

    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.sub
    ctx.font = '400 34px -apple-system, sans-serif'
    ctx.fillText(CLOSING_TEXT, size.width / 2, size.height - 160)

    ctx.font = '400 30px -apple-system, sans-serif'
    ctx.fillText('余生清单 · viral-sites', size.width / 2, size.height - 70)
  }
}
```

`sites/bucket-list/src/components/long-press-overlay.tsx`：

```tsx
interface Props {
  dataUrl: string
  onClose: () => void
}

export function LongPressOverlay({ dataUrl, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 px-8"
      onClick={onClose}
    >
      <img src={dataUrl} alt="余生清单卡" className="max-h-[70vh] w-auto rounded-lg" />
      <p className="text-sm text-white">长按图片保存</p>
      <p className="text-xs text-[#8a7d68]">点击空白处关闭</p>
    </div>
  )
}
```

`sites/bucket-list/src/components/save-card-button.tsx`：

```tsx
import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import type { ListStats } from '../lib/list-math'
import { makeBucketCardDraw } from '../card/draw-bucket-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  stats: ListStats
}

export function SaveCardButton({ stats }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeBucketCardDraw(stats))
      saveCard(canvas, {
        filename: 'my-bucket-list.png',
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image')
    } catch {
      setFailed(true)
      track('export_error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSave}
        className="rounded-lg bg-[#a05a2c] py-3 font-medium text-[#faf3e3]"
      >
        保存我的余生清单
      </button>
      {failed && <p className="text-sm text-[#8a7d68]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/bucket-list test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): 清单卡绘制与双路径保存"
```

---

### Task 10: App 组装（三屏状态机 + generate 埋点 + 隐私页脚）

**Files:**
- Modify: `sites/bucket-list/src/app.tsx`
- Test: `sites/bucket-list/src/app.test.tsx`

**Interfaces:**
- Consumes: `InputScreen`（5）、`ChecklistScreen`（7）、`ResultScreen`（8）、`SaveCardButton`（9）、`computeListStats`/`SelectedItem`（4）、`track`（shared）
- Produces: `<App />` — 状态机 `{ screen: 'input' } | { screen: 'checklist'; birthYear; expectancy } | { screen: 'result'; birthYear; expectancy; items }`；生成时 `track('generate')`；`new Date()` 只出现在本组装层；页脚隐私声明常驻

- [ ] **Step 1: 写失败测试** `sites/bucket-list/src/app.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './app'

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('完整流程：输入 → 勾选 → 结果 → 重新来一次', async () => {
    render(<App />)
    await userEvent.type(screen.getByLabelText('出生年份'), '1996')
    await userEvent.click(screen.getByRole('button', { name: '去勾选我的清单' }))
    await userEvent.click(screen.getByRole('checkbox', { name: '吃火锅' }))
    await userEvent.click(screen.getByRole('button', { name: '生成我的余生清单' }))
    expect(umamiSpy).toHaveBeenCalledWith('generate', undefined)
    expect(screen.getByText('我的余生清单')).toBeInTheDocument()
    expect(screen.getByText(/吃火锅/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重新来一次' }))
    expect(screen.getByLabelText('出生年份')).toBeInTheDocument()
  })

  it('隐私声明常驻页脚', () => {
    render(<App />)
    expect(screen.getByText(/所有计算在本地完成/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/bucket-list test`
Expected: FAIL（App 还是 Task 1 的占位）

- [ ] **Step 3: 实现** `sites/bucket-list/src/app.tsx`（整体替换占位）

```tsx
import { useState } from 'react'
import { track } from '@viral/shared'
import { computeListStats, type SelectedItem } from './lib/list-math'
import { ChecklistScreen } from './components/checklist-screen'
import { InputScreen } from './components/input-screen'
import { ResultScreen } from './components/result-screen'
import { SaveCardButton } from './components/save-card-button'

type Screen =
  | { screen: 'input' }
  | { screen: 'checklist'; birthYear: number; expectancy: number }
  | { screen: 'result'; birthYear: number; expectancy: number; items: SelectedItem[] }

function ResultStage(props: {
  birthYear: number
  expectancy: number
  items: SelectedItem[]
  onRestart: () => void
}) {
  // new Date() 只允许出现在组装层，lib 纯函数一律显式传 today
  const stats = computeListStats({
    birthYear: props.birthYear,
    expectancy: props.expectancy,
    items: props.items,
    today: new Date(),
  })
  return (
    <ResultScreen stats={stats} onRestart={props.onRestart}>
      <SaveCardButton stats={stats} />
    </ResultScreen>
  )
}

export function App() {
  const [state, setState] = useState<Screen>({ screen: 'input' })

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex-1">
        {state.screen === 'input' && (
          <InputScreen
            today={new Date()}
            onSubmit={(birthYear, expectancy) =>
              setState({ screen: 'checklist', birthYear, expectancy })
            }
          />
        )}
        {state.screen === 'checklist' && (
          <ChecklistScreen
            onGenerate={(items) => {
              track('generate')
              setState({
                screen: 'result',
                birthYear: state.birthYear,
                expectancy: state.expectancy,
                items,
              })
            }}
          />
        )}
        {state.screen === 'result' && (
          <ResultStage
            birthYear={state.birthYear}
            expectancy={state.expectancy}
            items={state.items}
            onRestart={() => setState({ screen: 'input' })}
          />
        )}
      </div>
      <footer className="pt-10 text-center text-xs text-[#8a7d68]">
        所有计算在本地完成，你勾的清单不会被上传
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + 全仓核验**

Run: `pnpm -r test && pnpm -r typecheck && pnpm --filter @viral/bucket-list build`
Expected: 全 PASS，构建成功（life-grid 与 shared 不受影响）

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(bucket-list): App 三屏状态机与 generate 埋点"
```

---

### Task 11: 上线准备（build + gzip 核验；umami / 部署【手工·需用户】）

**Files:**
- Modify: `sites/bucket-list/index.html`（umami website-id，手工步骤）、`README.md`（状态标注，发布后）

**Interfaces:**
- Consumes: 全部前置任务
- 提醒：本任务只有 Step 1、2、6 是执行者可独立完成的；Step 3~5 需要用户账号与**发布时间决策**（与 01 错峰 ≥3 周），执行者到达时停下向用户确认

- [ ] **Step 1: 体积预算核验**

Run: `pnpm --filter @viral/bucket-list build`
查看 vite 输出的 gzip 列：JS + CSS gzip 合计须 < 100KB（emoji 图标是系统字符不占包体）。超了先查是否混入多余依赖：`pnpm --filter @viral/bucket-list list --depth 0`。

- [ ] **Step 2: 本地手机真机冒烟**

Run: `pnpm --filter @viral/bucket-list dev --host`
手机连同一 Wi-Fi 打开 `http://<局域网IP>:5173`，走一遍 输入 → 勾选（含加一个自定义项）→ 结果 → 保存；确认打勾动效、纸胶带、升序排列肉眼可见。

- [ ] **Step 3: 【手工·需用户】创建 umami 站点**

在 umami 后台（复用 life-grid 的账号）Add website → 拿到 website-id → 替换 `sites/bucket-list/index.html` 里的 `TO_BE_FILLED`。`u.js` / `_worker.js` 已随 Task 1 复制，同源代理无需改动。此步骤需要用户账号，执行者停下来向用户要。

- [ ] **Step 4: 【手工·需用户】发布决策 + 部署 Cloudflare Pages**

前置条件（设计文档 §9，由用户拍板）：与 01 错峰 ≥3 周；01 保存率 > 5% 则顺势推出，表现平平则先把文案往「轻快珍惜」再偏一轮。用户确认发布后执行：

```bash
pnpm dlx wrangler login        # 需要用户浏览器授权
pnpm dlx wrangler pages project create bucket-list --production-branch main
pnpm --filter @viral/bucket-list build
pnpm dlx wrangler pages deploy sites/bucket-list/dist --project-name bucket-list
```

产出 `https://bucket-list.pages.dev`（实际子域以 wrangler 输出为准）。

- [ ] **Step 5: 【手工·需用户】四环境手工验收（工厂标准清单）**

- [ ] iPhone 微信内打开 → 保存走长按路径，图能存到相册
- [ ] 安卓微信内打开 → 同上
- [ ] iOS Safari → 长按路径
- [ ] 桌面 Chrome → 直接下载
- [ ] umami 后台能看到 pageview / generate / save_image / item_selected 四类事件，且 item_selected 的自定义项只出现 `custom`

- [ ] **Step 6: 状态提交**

构建完成即提交（不等发布）：

```bash
git add -A && git commit -m "chore(bucket-list): 构建核验完成，待人工排期发布"
```

README 处理：07 当前在「候选池」表中无状态列；**实际发布时**（Step 4 完成后）将 07 行移入「站点路线图」主表并标注 `🚀 已上线（<部署域名>）`，与 01 行格式一致，随部署一并提交推送。构建完成但未发布期间不改 README，避免误导「已上线」。

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §3 三屏流程（Task 5/7/8/10）、§4 清单池 20 项全部成文 + 自定义 ≤5 个 ≤8 字（Task 2/6/7）、§5 计算规则与全部边界（月归一化/floor/最后一次/届数/奖励模式/显式 today——Task 3/4）、§6 清单卡列表形态 + 8 项截断 + 升序 + 固定收尾文案（Task 9）、§7 埋点三标准事件 + item_selected 脱敏（Task 7/9/10 + Global Constraints）、§8 测试清单（频率归一化/0 次边界/届数切换/奖励模式/闰年无关性/8 项截断/长名截断均有对应单测；四环境手工验收在 Task 11）、§9 错峰发布（header 备注 + Task 11 手工门）、00a 暖色手账 + 双签名元素 + reduced-motion（Task 1 CSS + Task 7/8/9）。未纳入：webfont 子集化（与 01 同策略，v1 系统字族兜底）、卡片二维码（工厂规则：买域名后增强）。
- **设计文档矛盾点与决策记录**：
  1. **年龄口径粒度冲突**：§5 写「复用/对齐 01 的 life-math 口径」（01 是完整生日的周岁），但 §3 输入只收出生年份——按 §3 落地为 `today.getFullYear() − 出生年份`，与 01 同为「显式传 today 的整数口径」，独立实现不 import（工厂规则站与站零依赖，「复用」按「对齐口径」理解）。
  2. **边界规则重叠**：「剩余次数 = 0 且频率 > 0 → 最后一次」与「频率 < 1 → 届数写法」在 n = 0 时同时命中——定优先级「最后一次」覆盖「0 届」，已写进实现与单测。
  3. **§1 示例数字互相推不出同一剩余年**（812 次火锅 ≈ 34 年、45 次樱花 = 45 年、138 面 = 23 年）——视为宣传文案而非算例，实现以 §5 公式为准。
  4. **池内名称长度**：§4 表中「看电影（影院）」9 字会破坏卡片行排版——池内名称统一 ≤8 字（取「看电影」），与自定义项共用 MAX_NAME_LENGTH=8，并加了池数据单测约束。
- **占位符扫描**：无 TBD/TODO；唯一 `TO_BE_FILLED` 是 umami website-id，属 Task 11【手工·需用户】的显式待办（与 life-grid 计划同款处理），非占位符。
- **类型一致性**：`BucketItem`/`FreqUnit`（Task 2 定义 → 3/4/6/7 消费）、`SelectedItem`/`ItemStat`/`ListStats`/`emphasisTier`/`unitLabel`/文案常量（Task 4 定义 → 6/7/8/9/10 消费）、`AddCustomResult`（Task 6 定义 → 7 消费）、`DrawFn`（shared → Task 9）签名逐一核对一致。
- **测试可行性自查**：受控 number 输入的清空中间态会被 `updateFreq` 守卫回弹，组件测试统一用单次 `fireEvent.change` 模拟频率修改并在测试内注明原因；canvas 桩相对 life-grid 版补齐 `save`/`restore`/`translate`/`rotate`（纸胶带旋转绘制），SaveCardButton 测试可通过；`getByText('2')`/`'58'`/`'1,152'` 等断言在各自 fixture 中唯一。
