# 工厂基建 + 人生进度条 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭起 pnpm monorepo 工厂基建（`@viral/shared`：埋点 / 分享卡片），并完成首发站「人生进度条」到可部署状态。

**Architecture:** monorepo 内 `packages/shared` 提供纯前端公共能力（无构建步骤，站点直接消费 TS 源码）；`sites/life-grid` 是独立 Vite React 应用，核心计算全部为显式传入时间的纯函数，canvas 只做渲染层。TDD：每个纯函数与组件先写失败测试。

**Tech Stack:** pnpm workspace · Vite · React 18+ · TypeScript(strict) · Tailwind v4 · Vitest + Testing Library(jsdom) · Cloudflare Pages · umami

## Global Constraints

（来自 [00-factory-design.md](../00-factory-design.md) 与 [01-life-grid.md](../01-life-grid.md)，所有任务默认遵守）

- 首屏资源 gzip 后 < 100KB；不引入 UI 组件库、不引入日期库（原生 Date 够用）
- 视觉遵循 [00a 风格分配表](../00a-style-map.md)：01 为「方格作业本」——纸白 `#f7f4ec` + 青蓝格线底、铅笔灰 `#8c8678`、墨色正文 `#3a3833`、批改朱红 `#c8392b` 只用于本周格/关键数字/主按钮
- 埋点事件语义全站统一：`generate`（生成结果）、`save_image`（保存卡片）；visit 由 umami pageview 自带
- 分享卡片固定 1080×1440（3:4）
- 所有用户输入只在本地计算，绝不上传；埋点不带个人数据
- 常量口径：预期寿命默认 78、父母预期寿命 78、退休 60、年工作日 250、每年 52 周、默认见父母 2 次/年、父母年龄默认 = 我的年龄 + 28、年龄上限 120
- 涉及「今天」的函数一律显式传入 `today: Date` 参数，禁止在纯函数内部取当前时间
- 不可变数据风格：更新对象一律返回新副本，不原地修改
- 提交信息用 conventional commits（feat/fix/test/chore/docs），不加 Co-Authored-By
- 包管理只用 pnpm；测试命令统一 `pnpm --filter <pkg> test`

**文件全景**（Create 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
pnpm-workspace.yaml / package.json / tsconfig.base.json / .npmrc
packages/shared/
  package.json  tsconfig.json  vitest.config.ts
  src/index.ts
  src/analytics/track.ts (+test)
  src/share-card/env.ts (+test)          # UA → 保存策略
  src/share-card/render-card.ts (+test)  # canvas 卡片渲染框架
  src/share-card/save-image.ts (+test)   # 下载 / 长按两条保存路径
sites/life-grid/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  src/main.tsx  src/app.tsx (+test)  src/index.css
  src/lib/life-math.ts (+test)           # 全部人生计算纯函数
  src/lib/copy-lines.ts (+test)          # 扎心文案生成
  src/lib/grid-layout.ts (+test)         # 格子布局纯函数
  src/components/life-grid-canvas.tsx (+test)
  src/components/input-screen.tsx (+test)
  src/components/result-screen.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-life-card.ts (+test)
  test/canvas-stub.ts                    # jsdom canvas 测试桩（复用）
```

---

### Task 1: Monorepo 骨架

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.npmrc`

**Interfaces:**
- Produces: workspace 布局 `packages/*` + `sites/*`；根命令 `pnpm -r test` / `pnpm -r typecheck` / `pnpm -r build`；`tsconfig.base.json` 供各包 extends

- [ ] **Step 1: 写配置文件**

`pnpm-workspace.yaml`：

```yaml
packages:
  - packages/*
  - sites/*
```

`package.json`：

```json
{
  "name": "viral-sites",
  "private": true,
  "scripts": {
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "build": "pnpm -r build"
  }
}
```

`tsconfig.base.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`.npmrc`：

```
shamefully-hoist=false
```

- [ ] **Step 2: 验证**

Run: `cd /Users/ahs/Documents/vibe-coding/viral-sites && pnpm install`
Expected: 成功（暂无子包，装出空 lockfile 即可）

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: pnpm monorepo 骨架"
```

---

### Task 2: shared 包脚手架 + 埋点 track()

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`, `packages/shared/src/index.ts`, `packages/shared/src/analytics/track.ts`
- Test: `packages/shared/src/analytics/track.test.ts`

**Interfaces:**
- Produces: `track(event: string, data?: Record<string, string | number>): void` — umami 存在则上报，不存在 console.debug，任何异常静默吞掉

- [ ] **Step 1: 脚手架**

`packages/shared/package.json`：

```json
{
  "name": "@viral/shared",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

`packages/shared/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

`packages/shared/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'jsdom' },
})
```

Run: `pnpm --filter @viral/shared add -D typescript vitest jsdom`

- [ ] **Step 2: 写失败测试** `packages/shared/src/analytics/track.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { track } from './track'

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, unknown>) => void }
  }
}

describe('track', () => {
  afterEach(() => {
    delete window.umami
    vi.restoreAllMocks()
  })

  it('umami 存在时转发事件', () => {
    const spy = vi.fn()
    window.umami = { track: spy }
    track('generate', { from: 'test' })
    expect(spy).toHaveBeenCalledWith('generate', { from: 'test' })
  })

  it('umami 不存在时不抛错', () => {
    expect(() => track('generate')).not.toThrow()
  })

  it('umami.track 抛错时静默吞掉', () => {
    window.umami = {
      track: () => {
        throw new Error('boom')
      },
    }
    expect(() => track('save_image')).not.toThrow()
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL（track 未定义）

- [ ] **Step 4: 实现** `packages/shared/src/analytics/track.ts`

```ts
type UmamiGlobal = { track: (event: string, data?: Record<string, unknown>) => void }

declare global {
  interface Window {
    umami?: UmamiGlobal
  }
}

export function track(event: string, data?: Record<string, string | number>): void {
  try {
    if (typeof window === 'undefined') return
    if (window.umami?.track) {
      window.umami.track(event, data)
    } else {
      console.debug('[track]', event, data ?? {})
    }
  } catch {
    // 埋点失败绝不影响业务
  }
}
```

`packages/shared/src/index.ts`：

```ts
export { track } from './analytics/track'
```

- [ ] **Step 5: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`
Expected: 全 PASS

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(shared): 埋点 track 封装（失败静默）"
```

---

### Task 3: 保存策略检测（UA → download / long-press）

**Files:**
- Create: `packages/shared/src/share-card/env.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/share-card/env.test.ts`

**Interfaces:**
- Produces: `type SaveStrategy = 'download' | 'long-press'`；`detectSaveStrategy(userAgent: string): SaveStrategy` — 微信内置浏览器与 iOS 一律 long-press，其余 download

- [ ] **Step 1: 写失败测试** `packages/shared/src/share-card/env.test.ts`

```ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL

- [ ] **Step 3: 实现** `packages/shared/src/share-card/env.ts`

```ts
export type SaveStrategy = 'download' | 'long-press'

export function detectSaveStrategy(userAgent: string): SaveStrategy {
  const ua = userAgent.toLowerCase()
  const isWeChat = ua.includes('micromessenger')
  const isIOS = /iphone|ipad|ipod/.test(ua)
  return isWeChat || isIOS ? 'long-press' : 'download'
}
```

`src/index.ts` 追加：

```ts
export { detectSaveStrategy, type SaveStrategy } from './share-card/env'
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/shared test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): UA 保存策略检测"
```

---

### Task 4: 卡片渲染框架 renderCard

**Files:**
- Create: `packages/shared/src/share-card/render-card.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/share-card/render-card.test.ts`

**Interfaces:**
- Produces:
  - `interface CardSize { width: number; height: number }`
  - `const CARD_SIZE: CardSize`（1080×1440）
  - `type DrawFn = (ctx: CanvasRenderingContext2D, size: CardSize) => void`
  - `renderCard(draw: DrawFn, size?: CardSize): HTMLCanvasElement` — 建 canvas、取 2d ctx、调用 draw；ctx 拿不到时抛 `Error('canvas 2d context unavailable')`

- [ ] **Step 1: 写失败测试** `packages/shared/src/share-card/render-card.test.ts`

jsdom 的 `getContext` 返回 null，测试里桩掉它：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CARD_SIZE, renderCard } from './render-card'

function stubCtx() {
  const fake = { fillRect: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake as never)
  return fake
}

afterEach(() => vi.restoreAllMocks())

describe('renderCard', () => {
  it('默认尺寸 1080×1440 且把 ctx 与尺寸传给 draw', () => {
    const fake = stubCtx()
    const draw = vi.fn()
    const canvas = renderCard(draw)
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1440)
    expect(draw).toHaveBeenCalledWith(fake, CARD_SIZE)
  })

  it('ctx 不可用时抛错', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(() => renderCard(() => {})).toThrow('canvas 2d context unavailable')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL

- [ ] **Step 3: 实现** `packages/shared/src/share-card/render-card.ts`

```ts
export interface CardSize {
  width: number
  height: number
}

export const CARD_SIZE: CardSize = { width: 1080, height: 1440 }

export type DrawFn = (ctx: CanvasRenderingContext2D, size: CardSize) => void

export function renderCard(draw: DrawFn, size: CardSize = CARD_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  draw(ctx, size)
  return canvas
}
```

`src/index.ts` 追加：

```ts
export { renderCard, CARD_SIZE, type CardSize, type DrawFn } from './share-card/render-card'
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/shared test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): renderCard 卡片渲染框架"
```

---

### Task 5: 保存路径 saveCard（下载 / 长按）

**Files:**
- Create: `packages/shared/src/share-card/save-image.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/share-card/save-image.test.ts`

**Interfaces:**
- Consumes: `detectSaveStrategy`（Task 3）
- Produces: `saveCard(canvas: HTMLCanvasElement, opts: { filename: string; onLongPress: (dataUrl: string) => void; userAgent?: string }): SaveStrategy` — download 策略走 a[download] 点击；long-press 策略把 dataUrl 交给回调（由站点弹出长按提示层）；`canvas.toDataURL` 抛错时**向上抛**（站点层负责降级提示与 `export_error` 埋点）

- [ ] **Step 1: 写失败测试** `packages/shared/src/share-card/save-image.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveCard } from './save-image'

const DESKTOP = 'Mozilla/5.0 (Macintosh) Chrome/126.0.0.0 Safari/537.36'
const WECHAT = 'Mozilla/5.0 (iPhone) MicroMessenger/8.0.47'

function makeCanvas(dataUrl = 'data:image/png;base64,AAA') {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'toDataURL').mockReturnValue(dataUrl)
  return canvas
}

afterEach(() => vi.restoreAllMocks())

describe('saveCard', () => {
  it('桌面 UA 走下载：创建 a[download] 并点击', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const strategy = saveCard(makeCanvas(), {
      filename: 'life.png',
      userAgent: DESKTOP,
      onLongPress: vi.fn(),
    })
    expect(strategy).toBe('download')
    expect(click).toHaveBeenCalledOnce()
  })

  it('微信 UA 走长按：回调拿到 dataUrl，不触发下载', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const onLongPress = vi.fn()
    const strategy = saveCard(makeCanvas('data:image/png;base64,BBB'), {
      filename: 'life.png',
      userAgent: WECHAT,
      onLongPress,
    })
    expect(strategy).toBe('long-press')
    expect(onLongPress).toHaveBeenCalledWith('data:image/png;base64,BBB')
    expect(click).not.toHaveBeenCalled()
  })

  it('toDataURL 抛错时向上抛（站点层降级）', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'toDataURL').mockImplementation(() => {
      throw new Error('export failed')
    })
    expect(() =>
      saveCard(canvas, { filename: 'x.png', userAgent: DESKTOP, onLongPress: vi.fn() }),
    ).toThrow('export failed')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL

- [ ] **Step 3: 实现** `packages/shared/src/share-card/save-image.ts`

```ts
import { detectSaveStrategy, type SaveStrategy } from './env'

export interface SaveCardOptions {
  filename: string
  onLongPress: (dataUrl: string) => void
  userAgent?: string
}

export function saveCard(canvas: HTMLCanvasElement, opts: SaveCardOptions): SaveStrategy {
  const strategy = detectSaveStrategy(opts.userAgent ?? navigator.userAgent)
  const dataUrl = canvas.toDataURL('image/png')
  if (strategy === 'long-press') {
    opts.onLongPress(dataUrl)
  } else {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = opts.filename
    a.click()
  }
  return strategy
}
```

`src/index.ts` 追加：

```ts
export { saveCard, type SaveCardOptions } from './share-card/save-image'
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): saveCard 双路径保存（下载/长按）"
```

---

### Task 6: life-grid 站点脚手架

**Files:**
- Create: `sites/life-grid/package.json`, `sites/life-grid/tsconfig.json`, `sites/life-grid/vite.config.ts`, `sites/life-grid/vitest.config.ts`, `sites/life-grid/index.html`, `sites/life-grid/src/main.tsx`, `sites/life-grid/src/app.tsx`, `sites/life-grid/src/index.css`, `sites/life-grid/test/canvas-stub.ts`

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）
- Produces: 可 build 的 Vite React 站点；`test/canvas-stub.ts` 的 `installCanvasStub(): RecordingCtx`（后续组件测试复用）

- [ ] **Step 1: 建包与依赖**

`sites/life-grid/package.json`：

```json
{
  "name": "@viral/life-grid",
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
pnpm --filter @viral/life-grid add react react-dom
pnpm --filter @viral/life-grid add -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/react @types/react-dom
pnpm --filter @viral/life-grid add '@viral/shared@workspace:*'
```

- [ ] **Step 2: 配置文件**

`sites/life-grid/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client", "@testing-library/jest-dom"] },
  "include": ["src", "test"]
}
```

`sites/life-grid/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/life-grid/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./test/setup.ts'] },
})
```

`sites/life-grid/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

`sites/life-grid/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f7f4ec" />
    <title>人生进度条 — 你的人生还剩多少个星期</title>
    <meta
      name="description"
      content="输入出生日期，把人生画成 4000 个格子：已经走过多少，还能见父母多少次，还剩多少个春节。所有计算在本地完成。"
    />
    <!-- umami：部署后替换为真实 website-id 再上线
    <script defer src="https://cloud.umami.is/script.js" data-website-id="TO_BE_FILLED"></script>
    -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`sites/life-grid/src/index.css`：

```css
@import 'tailwindcss';

:root {
  color-scheme: light;
}

body {
  background-color: #f7f4ec;
  /* 方格作业本：浅青蓝格线铺底，纯 CSS 不用图 */
  background-image:
    linear-gradient(to right, rgba(185, 205, 212, 0.35) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(185, 205, 212, 0.35) 1px, transparent 1px);
  background-size: 24px 24px;
  color: #3a3833;
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

.font-serif-cn {
  font-family: 'Songti SC', 'Noto Serif SC', 'SimSun', serif;
}
```

（字体策略：v1 用系统字族兜底，不打包 webfont，保住 100KB 预算；思源宋体子集化列入上线后优化。）

`sites/life-grid/src/main.tsx`：

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

`sites/life-grid/src/app.tsx`（占位，Task 13 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-6 py-10">人生进度条</main>
}
```

`sites/life-grid/test/canvas-stub.ts`（组件测试共用的 canvas 桩）：

```ts
import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
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
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}
```

- [ ] **Step 3: 验证构建**

Run: `pnpm --filter @viral/life-grid build`
Expected: 构建成功，产出 `sites/life-grid/dist/`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(life-grid): Vite+React+Tailwind 站点脚手架"
```

---

### Task 7: life-math 核心计算

**Files:**
- Create: `sites/life-grid/src/lib/life-math.ts`
- Test: `sites/life-grid/src/lib/life-math.test.ts`

**Interfaces:**
- Produces（后续任务大量依赖，签名必须一致）:
  - 常量：`WEEKS_PER_YEAR=52` `DEFAULT_EXPECTANCY=78` `PARENT_EXPECTANCY=78` `RETIREMENT_AGE=60` `WORKDAYS_PER_YEAR=250` `DEFAULT_MEETINGS_PER_YEAR=2` `MAX_AGE=120`
  - `weeksLived(birth: Date, today: Date): number`
  - `totalWeeks(expectancy: number): number`
  - `ageInYears(birth: Date, today: Date): number`（周岁）
  - `percentLived(birth: Date, today: Date, expectancy: number): number`（0~100，1 位小数，封顶 100）
  - `type BirthValidation = { ok: true } | { ok: false; reason: 'future' | 'too-old' }`
  - `validateBirth(birth: Date, today: Date): BirthValidation`

- [ ] **Step 1: 写失败测试** `sites/life-grid/src/lib/life-math.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  ageInYears,
  percentLived,
  totalWeeks,
  validateBirth,
  weeksLived,
} from './life-math'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('weeksLived', () => {
  it('同一天为 0', () => expect(weeksLived(d(2000, 1, 1), d(2000, 1, 1))).toBe(0)
  )
  it('14 天为 2 周', () => expect(weeksLived(d(2000, 1, 1), d(2000, 1, 15))).toBe(2))
  it('不足一周向下取整', () => expect(weeksLived(d(2000, 1, 1), d(2000, 1, 13))).toBe(1))
  it('闰年整年 366 天 = 52 周', () =>
    expect(weeksLived(d(2000, 1, 1), d(2001, 1, 1))).toBe(52))
})

describe('totalWeeks', () => {
  it('78 岁 = 4056 周', () => expect(totalWeeks(78)).toBe(4056))
})

describe('ageInYears', () => {
  it('生日当天算整岁', () => expect(ageInYears(d(2000, 8, 4), d(2026, 8, 4))).toBe(26))
  it('生日前一天差一岁', () => expect(ageInYears(d(2000, 8, 5), d(2026, 8, 4))).toBe(25))
})

describe('percentLived', () => {
  it('保留一位小数', () =>
    expect(percentLived(d(2000, 1, 1), d(2001, 1, 1), 78)).toBe(1.3)) // 52/4056
  it('超过预期寿命封顶 100', () =>
    expect(percentLived(d(1900, 1, 1), d(2020, 1, 1), 78)).toBe(100))
})

describe('validateBirth', () => {
  it('未来日期拒绝', () =>
    expect(validateBirth(d(2030, 1, 1), d(2026, 8, 4))).toEqual({ ok: false, reason: 'future' }))
  it('超过 120 岁拒绝', () =>
    expect(validateBirth(d(1900, 1, 1), d(2026, 8, 4))).toEqual({ ok: false, reason: 'too-old' }))
  it('恰好 120 岁放行', () =>
    expect(validateBirth(d(1906, 8, 4), d(2026, 8, 4))).toEqual({ ok: true }))
  it('正常日期放行', () => expect(validateBirth(d(1990, 5, 1), d(2026, 8, 4))).toEqual({ ok: true }))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/life-grid/src/lib/life-math.ts`

```ts
export const WEEKS_PER_YEAR = 52
export const DEFAULT_EXPECTANCY = 78
export const PARENT_EXPECTANCY = 78
export const RETIREMENT_AGE = 60
export const WORKDAYS_PER_YEAR = 250
export const DEFAULT_MEETINGS_PER_YEAR = 2
export const MAX_AGE = 120

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function weeksLived(birth: Date, today: Date): number {
  return Math.floor((today.getTime() - birth.getTime()) / MS_PER_WEEK)
}

export function totalWeeks(expectancy: number): number {
  return expectancy * WEEKS_PER_YEAR
}

export function ageInYears(birth: Date, today: Date): number {
  const age = today.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  return beforeBirthday ? age - 1 : age
}

export function percentLived(birth: Date, today: Date, expectancy: number): number {
  const raw = (weeksLived(birth, today) / totalWeeks(expectancy)) * 100
  return Math.min(100, Math.round(raw * 10) / 10)
}

export type BirthValidation = { ok: true } | { ok: false; reason: 'future' | 'too-old' }

export function validateBirth(birth: Date, today: Date): BirthValidation {
  if (birth.getTime() > today.getTime()) return { ok: false, reason: 'future' }
  if (ageInYears(birth, today) > MAX_AGE) return { ok: false, reason: 'too-old' }
  return { ok: true }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/life-grid test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): life-math 核心计算纯函数"
```

---

### Task 8: computeStats 派生统计（含全部边界彩蛋）

**Files:**
- Modify: `sites/life-grid/src/lib/life-math.ts`
- Test: `sites/life-grid/src/lib/life-math.test.ts`（追加）

**Interfaces:**
- Consumes: Task 7 全部函数与常量
- Produces:
  - `interface LifeInput { birth: Date; today: Date; expectancy?: number; parentAge?: number; meetingsPerYear?: number }`
  - `interface LifeStats { age: number; weeksLived: number; totalWeeks: number; percent: number; blankWeeks: number; bonusWeeks: number; meetingsPerYear: number; parentMeetings: number | 'every-one-counts'; springFestivals: number; workdays: number | 'done' }`
  - `computeStats(input: LifeInput): LifeStats`
  - 规则：父母年龄默认 `age + 28`；父母年龄 ≥ 78 → `parentMeetings = 'every-one-counts'`；年龄 ≥ 60 → `workdays = 'done'`；年龄 ≥ 预期寿命 → `bonusWeeks > 0`（彩蛋模式）

- [ ] **Step 1: 写失败测试**（追加到 `life-math.test.ts`）

```ts
import { computeStats } from './life-math'

describe('computeStats', () => {
  const base = { birth: d(1996, 8, 4), today: d(2026, 8, 4) } // 恰好 30 岁

  it('默认参数：父母年龄 = age+28，各字段口径正确', () => {
    const s = computeStats(base)
    expect(s.age).toBe(30)
    expect(s.totalWeeks).toBe(4056)
    expect(s.parentMeetings).toBe((78 - 58) * 2) // 40
    expect(s.springFestivals).toBe(48) // 78-30
    expect(s.workdays).toBe(7500) // (60-30)*250
    expect(s.blankWeeks).toBe(s.totalWeeks - s.weeksLived)
    expect(s.bonusWeeks).toBe(0)
    expect(s.meetingsPerYear).toBe(2)
  })

  it('自定义见面频率参与计算', () => {
    const s = computeStats({ ...base, parentAge: 60, meetingsPerYear: 4 })
    expect(s.parentMeetings).toBe(72) // (78-60)*4
  })

  it('父母年龄 ≥ 78 → every-one-counts', () => {
    expect(computeStats({ ...base, parentAge: 80 }).parentMeetings).toBe('every-one-counts')
    expect(computeStats({ ...base, parentAge: 78 }).parentMeetings).toBe('every-one-counts')
  })

  it('年龄 ≥ 60 → workdays done', () => {
    const s = computeStats({ birth: d(1960, 1, 1), today: d(2026, 8, 4) })
    expect(s.workdays).toBe('done')
  })

  it('年龄 ≥ 预期寿命 → 彩蛋模式 bonusWeeks > 0 且 blankWeeks = 0', () => {
    const s = computeStats({ birth: d(1940, 1, 1), today: d(2026, 8, 4), expectancy: 78 })
    expect(s.bonusWeeks).toBeGreaterThan(0)
    expect(s.blankWeeks).toBe(0)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现**（追加到 `life-math.ts`）

```ts
export interface LifeInput {
  birth: Date
  today: Date
  expectancy?: number
  parentAge?: number
  meetingsPerYear?: number
}

export interface LifeStats {
  age: number
  weeksLived: number
  totalWeeks: number
  percent: number
  blankWeeks: number
  bonusWeeks: number
  meetingsPerYear: number
  parentMeetings: number | 'every-one-counts'
  springFestivals: number
  workdays: number | 'done'
}

export function computeStats(input: LifeInput): LifeStats {
  const expectancy = input.expectancy ?? DEFAULT_EXPECTANCY
  const meetingsPerYear = input.meetingsPerYear ?? DEFAULT_MEETINGS_PER_YEAR
  const age = ageInYears(input.birth, input.today)
  const lived = weeksLived(input.birth, input.today)
  const total = totalWeeks(expectancy)
  const parentAge = input.parentAge ?? age + 28
  const parentYearsLeft = PARENT_EXPECTANCY - parentAge
  return {
    age,
    weeksLived: lived,
    totalWeeks: total,
    percent: percentLived(input.birth, input.today, expectancy),
    blankWeeks: Math.max(0, total - lived),
    bonusWeeks: Math.max(0, lived - total),
    meetingsPerYear,
    parentMeetings: parentYearsLeft <= 0 ? 'every-one-counts' : parentYearsLeft * meetingsPerYear,
    springFestivals: Math.max(0, expectancy - age),
    workdays: age >= RETIREMENT_AGE ? 'done' : (RETIREMENT_AGE - age) * WORKDAYS_PER_YEAR,
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/life-grid test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): computeStats 派生统计与边界彩蛋"
```

---

### Task 9: 扎心文案生成 copy-lines

**Files:**
- Create: `sites/life-grid/src/lib/copy-lines.ts`
- Test: `sites/life-grid/src/lib/copy-lines.test.ts`

**Interfaces:**
- Consumes: `LifeStats`（Task 8）
- Produces:
  - `interface CopyLine { id: string; text: string }`
  - `buildCopyLines(stats: LifeStats): CopyLine[]` — 正常 6 条按设计顺序（percent/weeks/parents/festivals/workdays/blank）；彩蛋模式只返回 1 条 bonus
  - `pickCardLine(stats: LifeStats): string` — 卡片主文案：彩蛋模式用 bonus 条；`parentMeetings` 为数字用父母条；否则用百分比条

- [ ] **Step 1: 写失败测试** `sites/life-grid/src/lib/copy-lines.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { LifeStats } from './life-math'
import { buildCopyLines, pickCardLine } from './copy-lines'

const normal: LifeStats = {
  age: 30,
  weeksLived: 1565,
  totalWeeks: 4056,
  percent: 38.6,
  blankWeeks: 2491,
  bonusWeeks: 0,
  meetingsPerYear: 2,
  parentMeetings: 40,
  springFestivals: 48,
  workdays: 7500,
}

describe('buildCopyLines', () => {
  it('正常模式 6 条且顺序符合设计', () => {
    const ids = buildCopyLines(normal).map((l) => l.id)
    expect(ids).toEqual(['percent', 'weeks', 'parents', 'festivals', 'workdays', 'blank'])
  })

  it('数字千分位格式化', () => {
    const weeks = buildCopyLines(normal).find((l) => l.id === 'weeks')!
    expect(weeks.text).toContain('1,565')
  })

  it('父母 ≥78 时换成暖文案，不出现数字 0', () => {
    const line = buildCopyLines({ ...normal, parentMeetings: 'every-one-counts' }).find(
      (l) => l.id === 'parents',
    )!
    expect(line.text).toBe('和父母的每一次见面，都是赚到')
  })

  it('退休后 workdays 换文案', () => {
    const line = buildCopyLines({ ...normal, workdays: 'done' }).find((l) => l.id === 'workdays')!
    expect(line.text).toBe('你已经熬过了所有工作日')
  })

  it('彩蛋模式只有 bonus 一条', () => {
    const lines = buildCopyLines({ ...normal, bonusWeeks: 100, blankWeeks: 0 })
    expect(lines).toHaveLength(1)
    expect(lines[0].id).toBe('bonus')
    expect(lines[0].text).toContain('100')
  })
})

describe('pickCardLine', () => {
  it('有父母数字时选父母条', () => {
    expect(pickCardLine(normal)).toContain('还能见父母')
  })
  it('父母条不可用时退回百分比条', () => {
    expect(pickCardLine({ ...normal, parentMeetings: 'every-one-counts' })).toContain('38.6%')
  })
  it('彩蛋模式选 bonus 条', () => {
    expect(pickCardLine({ ...normal, bonusWeeks: 100 })).toContain('奖励')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/life-grid/src/lib/copy-lines.ts`

```ts
import type { LifeStats } from './life-math'

export interface CopyLine {
  id: string
  text: string
}

const fmt = (n: number) => n.toLocaleString('en-US')

export function buildCopyLines(stats: LifeStats): CopyLine[] {
  if (stats.bonusWeeks > 0) {
    return [
      {
        id: 'bonus',
        text: `你已经多赚了 ${fmt(stats.bonusWeeks)} 个星期，接下来每一格都是奖励`,
      },
    ]
  }
  return [
    { id: 'percent', text: `你的人生已经走过 ${stats.percent}%` },
    { id: 'weeks', text: `从出生到今天，你已经用掉 ${fmt(stats.weeksLived)} 个星期` },
    stats.parentMeetings === 'every-one-counts'
      ? { id: 'parents', text: '和父母的每一次见面，都是赚到' }
      : {
          id: 'parents',
          text: `按一年见 ${stats.meetingsPerYear} 次算，你还能见父母大约 ${fmt(stats.parentMeetings)} 次`,
        },
    { id: 'festivals', text: `这辈子还剩 ${fmt(stats.springFestivals)} 个春节` },
    stats.workdays === 'done'
      ? { id: 'workdays', text: '你已经熬过了所有工作日' }
      : { id: 'workdays', text: `距离 60 岁退休，还有 ${fmt(stats.workdays)} 个工作日` },
    { id: 'blank', text: `剩下的 ${fmt(stats.blankWeeks)} 个格子还是空白，怎么填由你` },
  ]
}

export function pickCardLine(stats: LifeStats): string {
  const lines = buildCopyLines(stats)
  if (stats.bonusWeeks > 0) return lines[0].text
  if (typeof stats.parentMeetings === 'number') {
    return lines.find((l) => l.id === 'parents')!.text
  }
  return lines.find((l) => l.id === 'percent')!.text
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/life-grid test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): 扎心文案生成与卡片主文案选择"
```

---

### Task 10: 格子布局纯函数 grid-layout

**Files:**
- Create: `sites/life-grid/src/lib/grid-layout.ts`
- Test: `sites/life-grid/src/lib/grid-layout.test.ts`

**Interfaces:**
- Produces:
  - `type CellState = 'past' | 'current' | 'future'`
  - `interface GridCell { row: number; col: number; state: CellState }`
  - `interface GridLayout { rows: number; cols: number; cells: GridCell[] }`
  - `const GRID_COLS = 52`
  - `layoutLifeGrid(weeksLived: number, totalWeeks: number): GridLayout` — 一行 52 格；索引 < weeksLived 为 past，== weeksLived 为 current，其余 future；weeksLived ≥ totalWeeks 时全部 past（彩蛋模式无 current）

- [ ] **Step 1: 写失败测试** `sites/life-grid/src/lib/grid-layout.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { GRID_COLS, layoutLifeGrid } from './grid-layout'

describe('layoutLifeGrid', () => {
  it('104 周 = 2 行 52 列', () => {
    const g = layoutLifeGrid(0, 104)
    expect(g.rows).toBe(2)
    expect(g.cols).toBe(GRID_COLS)
    expect(g.cells).toHaveLength(104)
  })

  it('状态切分：过去/本周/未来', () => {
    const g = layoutLifeGrid(52, 104)
    expect(g.cells[51].state).toBe('past')
    expect(g.cells[52].state).toBe('current')
    expect(g.cells[53].state).toBe('future')
  })

  it('行列坐标正确', () => {
    const g = layoutLifeGrid(0, 104)
    expect(g.cells[0]).toMatchObject({ row: 0, col: 0 })
    expect(g.cells[52]).toMatchObject({ row: 1, col: 0 })
    expect(g.cells[103]).toMatchObject({ row: 1, col: 51 })
  })

  it('第 0 周：第一格是 current', () => {
    expect(layoutLifeGrid(0, 104).cells[0].state).toBe('current')
  })

  it('活过预期寿命：全部 past，无 current', () => {
    const g = layoutLifeGrid(120, 104)
    expect(g.cells.every((c) => c.state === 'past')).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/life-grid/src/lib/grid-layout.ts`

```ts
export type CellState = 'past' | 'current' | 'future'

export interface GridCell {
  row: number
  col: number
  state: CellState
}

export interface GridLayout {
  rows: number
  cols: number
  cells: GridCell[]
}

export const GRID_COLS = 52

export function layoutLifeGrid(weeksLived: number, totalWeeks: number): GridLayout {
  const rows = Math.ceil(totalWeeks / GRID_COLS)
  const cells: GridCell[] = []
  for (let i = 0; i < totalWeeks; i += 1) {
    const state: CellState =
      i < weeksLived ? 'past' : i === weeksLived && weeksLived < totalWeeks ? 'current' : 'future'
    cells.push({ row: Math.floor(i / GRID_COLS), col: i % GRID_COLS, state })
  }
  return { rows, cols: GRID_COLS, cells }
}
```

注意 `weeksLived ≥ totalWeeks` 时没有任何格子命中 current 分支，`i < weeksLived` 覆盖全部 → 全 past，满足彩蛋模式。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/life-grid test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): 人生格子布局纯函数"
```

---

### Task 11: LifeGridCanvas 组件（含本周呼吸动画）

**Files:**
- Create: `sites/life-grid/src/components/life-grid-canvas.tsx`
- Test: `sites/life-grid/src/components/life-grid-canvas.test.tsx`

**Interfaces:**
- Consumes: `layoutLifeGrid`（Task 10）、`installCanvasStub`（Task 6）
- Produces: `<LifeGridCanvas weeksLived={number} totalWeeks={number} />` — 按容器宽度自适应绘制，DPR 高清，current 格用 rAF 呼吸动画；导出 `GRID_COLORS` 常量供卡片绘制（Task 14）复用

- [ ] **Step 1: 写失败测试** `sites/life-grid/src/components/life-grid-canvas.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub, type RecordingCtx } from '../../test/canvas-stub'
import { LifeGridCanvas } from './life-grid-canvas'

describe('LifeGridCanvas', () => {
  let ctx: RecordingCtx

  beforeEach(() => {
    ctx = installCanvasStub()
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('渲染 canvas 且带无障碍标签', () => {
    render(<LifeGridCanvas weeksLived={52} totalWeeks={104} />)
    expect(screen.getByLabelText('人生格子图')).toBeInTheDocument()
  })

  it('为每个格子执行一次 fillRect（104 格）', () => {
    render(<LifeGridCanvas weeksLived={52} totalWeeks={104} />)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(104)
  })

  it('存在 current 格时启动呼吸动画', () => {
    render(<LifeGridCanvas weeksLived={52} totalWeeks={104} />)
    expect(window.requestAnimationFrame).toHaveBeenCalled()
  })

  it('彩蛋模式（无 current 格）不启动动画', () => {
    render(<LifeGridCanvas weeksLived={200} totalWeeks={104} />)
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/life-grid/src/components/life-grid-canvas.tsx`

```tsx
import { useEffect, useRef } from 'react'
import { GRID_COLS, layoutLifeGrid, type GridLayout } from '../lib/grid-layout'

export const GRID_COLORS = {
  bg: '#f7f4ec',
  past: '#8c8678',
  current: '#c8392b',
  future: '#d9d2c0',
} as const

const GAP = 2

interface Props {
  weeksLived: number
  totalWeeks: number
}

interface Geometry {
  cellSize: number
  width: number
  height: number
}

function geometryFor(layout: GridLayout, containerWidth: number): Geometry {
  const cellSize = Math.max(2, Math.floor((containerWidth - (layout.cols - 1) * GAP) / layout.cols))
  return {
    cellSize,
    width: layout.cols * (cellSize + GAP) - GAP,
    height: layout.rows * (cellSize + GAP) - GAP,
  }
}

function drawCells(
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  geo: Geometry,
  currentAlpha: number,
) {
  ctx.clearRect(0, 0, geo.width, geo.height)
  for (const cell of layout.cells) {
    const x = cell.col * (geo.cellSize + GAP)
    const y = cell.row * (geo.cellSize + GAP)
    if (cell.state === 'current') {
      ctx.globalAlpha = currentAlpha
      ctx.fillStyle = GRID_COLORS.current
    } else {
      ctx.globalAlpha = 1
      ctx.fillStyle = cell.state === 'past' ? GRID_COLORS.past : GRID_COLORS.future
    }
    ctx.fillRect(x, y, geo.cellSize, geo.cellSize)
  }
  ctx.globalAlpha = 1
}

export function LifeGridCanvas({ weeksLived, totalWeeks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const layout = layoutLifeGrid(weeksLived, totalWeeks)
    const containerWidth = canvas.parentElement?.clientWidth || 340
    const geo = geometryFor(layout, containerWidth)
    const dpr = window.devicePixelRatio || 1
    canvas.width = geo.width * dpr
    canvas.height = geo.height * dpr
    canvas.style.width = `${geo.width}px`
    canvas.style.height = `${geo.height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    drawCells(ctx, layout, geo, 1)

    const hasCurrent = layout.cells.some((c) => c.state === 'current')
    if (!hasCurrent) return

    let raf = 0
    let start: number | null = null
    const breathe = (t: number) => {
      if (start === null) start = t
      const alpha = 0.45 + 0.55 * Math.abs(Math.sin(((t - start) / 1800) * Math.PI))
      drawCells(ctx, layout, geo, alpha)
      raf = window.requestAnimationFrame(breathe)
    }
    raf = window.requestAnimationFrame(breathe)
    return () => window.cancelAnimationFrame(raf)
  }, [weeksLived, totalWeeks])

  return (
    <div className="w-full">
      <p className="mb-2 text-xs text-[#8c8678]">一格是一个星期，这就是你的一生</p>
      <canvas ref={canvasRef} aria-label="人生格子图" />
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/life-grid test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): 人生格子 canvas 组件与呼吸动画"
```

---

### Task 12: 输入屏 InputScreen

**Files:**
- Create: `sites/life-grid/src/components/input-screen.tsx`
- Test: `sites/life-grid/src/components/input-screen.test.tsx`

**Interfaces:**
- Consumes: `validateBirth`、常量（Task 7）、`LifeInput`（Task 8）
- Produces: `<InputScreen onSubmit={(input: LifeInput) => void} today={Date} />` — 唯一必填出生日期；高级选项折叠内含预期寿命(60~100 默认 78)、父母年龄、每年见面次数；校验失败展示设计文案且不触发 onSubmit

- [ ] **Step 1: 写失败测试** `sites/life-grid/src/components/input-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InputScreen } from './input-screen'

const TODAY = new Date(2026, 7, 4)

describe('InputScreen', () => {
  it('提交合法日期：onSubmit 拿到解析后的 LifeInput', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生日期'), '1996-08-04')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    const input = onSubmit.mock.calls[0][0]
    expect(input.birth.getFullYear()).toBe(1996)
    expect(input.expectancy).toBe(78)
  })

  it('未来日期：展示文案且不提交', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生日期'), '2030-01-01')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(screen.getByText('你还没出生，不用焦虑')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('超过 120 岁：展示文案且不提交', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生日期'), '1900-01-01')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(screen.getByText('恭喜您打破吉尼斯纪录')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('高级选项修改后随 onSubmit 带出', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.type(screen.getByLabelText('出生日期'), '1996-08-04')
    await userEvent.click(screen.getByText('高级选项'))
    const meetings = screen.getByLabelText('每年见父母次数')
    await userEvent.clear(meetings)
    await userEvent.type(meetings, '6')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(onSubmit.mock.calls[0][0].meetingsPerYear).toBe(6)
  })

  it('空日期提交无反应', async () => {
    const onSubmit = vi.fn()
    render(<InputScreen onSubmit={onSubmit} today={TODAY} />)
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/life-grid/src/components/input-screen.tsx`

```tsx
import { useState } from 'react'
import {
  DEFAULT_EXPECTANCY,
  DEFAULT_MEETINGS_PER_YEAR,
  validateBirth,
  type LifeInput,
} from '../lib/life-math'

const ERROR_COPY: Record<'future' | 'too-old', string> = {
  future: '你还没出生，不用焦虑',
  'too-old': '恭喜您打破吉尼斯纪录',
}

interface Props {
  onSubmit: (input: LifeInput) => void
  today: Date
}

export function InputScreen({ onSubmit, today }: Props) {
  const [birthStr, setBirthStr] = useState('')
  const [expectancy, setExpectancy] = useState(DEFAULT_EXPECTANCY)
  const [parentAgeStr, setParentAgeStr] = useState('')
  const [meetingsStr, setMeetingsStr] = useState(String(DEFAULT_MEETINGS_PER_YEAR))
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!birthStr) return
    const [y, m, d] = birthStr.split('-').map(Number)
    const birth = new Date(y, m - 1, d)
    const check = validateBirth(birth, today)
    if (!check.ok) {
      setError(ERROR_COPY[check.reason])
      return
    }
    setError(null)
    const parentAge = parentAgeStr === '' ? undefined : Number(parentAgeStr)
    const meetingsPerYear = meetingsStr === '' ? undefined : Number(meetingsStr)
    onSubmit({ birth, today, expectancy, parentAge, meetingsPerYear })
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-serif-cn text-3xl">人生进度条</h1>
      <p className="text-sm text-[#8c8678]">
        输入出生日期，看看你的人生还剩多少个格子。所有计算在本地完成，你的生日不会被上传。
      </p>
      <label className="flex flex-col gap-2 text-sm">
        出生日期
        <input
          type="date"
          value={birthStr}
          onChange={(e) => setBirthStr(e.target.value)}
          className="rounded-md border border-[#d9d2c0] bg-transparent px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-[#c8392b]">{error}</p>}
      <details>
        <summary className="cursor-pointer text-sm text-[#8c8678]">高级选项</summary>
        <div className="mt-4 flex flex-col gap-4 text-sm">
          <label className="flex flex-col gap-2">
            预期寿命：{expectancy} 岁
            <input
              type="range"
              min={60}
              max={100}
              value={expectancy}
              onChange={(e) => setExpectancy(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-2">
            父母年龄（不填按你的年龄 +28 算）
            <input
              type="number"
              value={parentAgeStr}
              onChange={(e) => setParentAgeStr(e.target.value)}
              className="rounded-md border border-[#d9d2c0] bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-2">
            每年见父母次数
            <input
              type="number"
              value={meetingsStr}
              onChange={(e) => setMeetingsStr(e.target.value)}
              className="rounded-md border border-[#d9d2c0] bg-transparent px-3 py-2"
            />
          </label>
        </div>
      </details>
      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-lg bg-[#c8392b] py-3 font-medium text-[#f7f4ec]"
      >
        看看我的人生
      </button>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/life-grid test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): 输入屏与校验文案"
```

---

### Task 13: 结果屏 ResultScreen

**Files:**
- Create: `sites/life-grid/src/components/result-screen.tsx`
- Test: `sites/life-grid/src/components/result-screen.test.tsx`

**Interfaces:**
- Consumes: `computeStats`/`LifeInput`/`LifeStats`（Task 8）、`buildCopyLines`（Task 9）、`LifeGridCanvas`（Task 11）
- Produces: `<ResultScreen input={LifeInput} onRestart={() => void} />` — 内部 computeStats；渲染格子图 + 逐条淡入的文案 + 保存按钮占位插槽 `children`（Task 14 的 SaveCardButton 从 App 注入，本组件不依赖它）

- [ ] **Step 1: 写失败测试** `sites/life-grid/src/components/result-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { ResultScreen } from './result-screen'

const INPUT = { birth: new Date(1996, 7, 4), today: new Date(2026, 7, 4) }

describe('ResultScreen', () => {
  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  it('渲染 6 条扎心文案', () => {
    render(<ResultScreen input={INPUT} onRestart={() => {}} />)
    expect(screen.getByText(/你的人生已经走过/)).toBeInTheDocument()
    expect(screen.getByText(/还能见父母大约/)).toBeInTheDocument()
    expect(screen.getByText(/怎么填由你/)).toBeInTheDocument()
  })

  it('渲染格子图', () => {
    render(<ResultScreen input={INPUT} onRestart={() => {}} />)
    expect(screen.getByLabelText('人生格子图')).toBeInTheDocument()
  })

  it('彩蛋模式渲染 bonus 文案', () => {
    render(
      <ResultScreen input={{ birth: new Date(1940, 0, 1), today: new Date(2026, 7, 4) }} onRestart={() => {}} />,
    )
    expect(screen.getByText(/每一格都是奖励/)).toBeInTheDocument()
  })

  it('重新计算按钮触发 onRestart，children 插槽渲染', async () => {
    const onRestart = vi.fn()
    render(
      <ResultScreen input={INPUT} onRestart={onRestart}>
        <button>保存我的人生卡片</button>
      </ResultScreen>,
    )
    expect(screen.getByText('保存我的人生卡片')).toBeInTheDocument()
    screen.getByRole('button', { name: '重新计算' }).click()
    expect(onRestart).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/life-grid/src/components/result-screen.tsx`

```tsx
import type { ReactNode } from 'react'
import { computeStats, type LifeInput } from '../lib/life-math'
import { buildCopyLines } from '../lib/copy-lines'
import { LifeGridCanvas } from './life-grid-canvas'

interface Props {
  input: LifeInput
  onRestart: () => void
  children?: ReactNode
}

export function ResultScreen({ input, onRestart, children }: Props) {
  const stats = computeStats(input)
  const lines = buildCopyLines(stats)
  return (
    <section className="flex flex-col gap-8">
      <LifeGridCanvas weeksLived={stats.weeksLived} totalWeeks={stats.totalWeeks} />
      <ul className="flex flex-col gap-4">
        {lines.map((line, i) => (
          <li
            key={line.id}
            className="animate-[fade-in_0.6s_ease-out_both] text-lg leading-relaxed"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            {line.text}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        {children}
        <button type="button" onClick={onRestart} className="py-2 text-sm text-[#8c8678]">
          重新计算
        </button>
      </div>
    </section>
  )
}
```

`src/index.css` 追加淡入动画：

```css
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/life-grid test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): 结果屏与文案逐条淡入"
```

---

### Task 14: 分享卡片绘制 + 保存流程

**Files:**
- Create: `sites/life-grid/src/card/draw-life-card.ts`, `sites/life-grid/src/components/save-card-button.tsx`, `sites/life-grid/src/components/long-press-overlay.tsx`
- Test: `sites/life-grid/src/card/draw-life-card.test.ts`, `sites/life-grid/src/components/save-card-button.test.tsx`

**Interfaces:**
- Consumes: `renderCard`/`saveCard`/`track`（shared）、`pickCardLine`（Task 9）、`layoutLifeGrid`（Task 10）、`GRID_COLORS`（Task 11）、`LifeStats`（Task 8）
- Produces:
  - `makeLifeCardDraw(stats: LifeStats): DrawFn` — 1080×1440 卡片：深底 + 标题 + 缩略格子 + 主文案 + 大百分比 + 品牌条「人生进度条 · viral-sites」
  - `<SaveCardButton stats={LifeStats} />` — 点击：renderCard → saveCard；成功 `track('save_image')`；long-press 策略弹 `<LongPressOverlay dataUrl onClose />`；异常 `track('export_error')` 并提示「保存失败了，直接截图也一样」

- [ ] **Step 1: 写失败测试**

`sites/life-grid/src/card/draw-life-card.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import type { LifeStats } from '../lib/life-math'
import { makeLifeCardDraw } from './draw-life-card'

const stats: LifeStats = {
  age: 30,
  weeksLived: 1565,
  totalWeeks: 4056,
  percent: 38.6,
  blankWeeks: 2491,
  bonusWeeks: 0,
  meetingsPerYear: 2,
  parentMeetings: 40,
  springFestivals: 48,
  workdays: 7500,
}

function fakeCtx() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

describe('makeLifeCardDraw', () => {
  it('绘制背景 + 全部格子（fillRect ≥ totalWeeks + 1）', () => {
    const ctx = fakeCtx()
    makeLifeCardDraw(stats)(ctx, { width: 1080, height: 1440 })
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(4056)
  })

  it('文字包含主文案与品牌条', () => {
    const ctx = fakeCtx()
    makeLifeCardDraw(stats)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])
    expect(texts.some((t: string) => t.includes('还能见父母'))).toBe(true)
    expect(texts.some((t: string) => t.includes('人生进度条'))).toBe(true)
    expect(texts.some((t: string) => t.includes('38.6%'))).toBe(true)
  })
})
```

`sites/life-grid/src/components/save-card-button.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { LifeStats } from '../lib/life-math'
import { SaveCardButton } from './save-card-button'

const stats: LifeStats = {
  age: 30,
  weeksLived: 1565,
  totalWeeks: 4056,
  percent: 38.6,
  blankWeeks: 2491,
  bonusWeeks: 0,
  meetingsPerYear: 2,
  parentMeetings: 40,
  springFestivals: 48,
  workdays: 7500,
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
    await userEvent.click(screen.getByRole('button', { name: '保存我的人生卡片' }))
    expect(umamiSpy).toHaveBeenCalledWith('save_image', undefined)
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton stats={stats} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的人生卡片' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton stats={stats} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的人生卡片' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/life-grid/src/card/draw-life-card.ts`：

```ts
import type { DrawFn } from '@viral/shared'
import { pickCardLine } from '../lib/copy-lines'
import { layoutLifeGrid } from '../lib/grid-layout'
import type { LifeStats } from '../lib/life-math'
import { GRID_COLORS } from '../components/life-grid-canvas'

const BRAND_TEXT = '人生进度条 · viral-sites'

export function makeLifeCardDraw(stats: LifeStats): DrawFn {
  return (ctx, size) => {
    ctx.fillStyle = GRID_COLORS.bg
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#3a3833'
    ctx.font = '600 56px "Songti SC", "Noto Serif SC", serif'
    ctx.fillText('我的人生进度条', size.width / 2, 120)

    // 缩略格子：52 列，铺满中部区域
    const layout = layoutLifeGrid(stats.weeksLived, stats.totalWeeks)
    const gap = 2
    const gridWidth = 900
    const cell = Math.floor((gridWidth - (layout.cols - 1) * gap) / layout.cols)
    const originX = (size.width - (layout.cols * (cell + gap) - gap)) / 2
    const originY = 200
    for (const c of layout.cells) {
      ctx.fillStyle =
        c.state === 'current'
          ? GRID_COLORS.current
          : c.state === 'past'
            ? GRID_COLORS.past
            : GRID_COLORS.future
      ctx.fillRect(originX + c.col * (cell + gap), originY + c.row * (cell + gap), cell, cell)
    }

    const gridBottom = originY + layout.rows * (cell + gap)
    ctx.fillStyle = GRID_COLORS.current
    ctx.font = '700 120px -apple-system, sans-serif'
    ctx.fillText(`${stats.percent}%`, size.width / 2, gridBottom + 160)

    ctx.fillStyle = '#3a3833'
    ctx.font = '400 40px -apple-system, sans-serif'
    ctx.fillText(pickCardLine(stats), size.width / 2, gridBottom + 240)

    ctx.fillStyle = '#8c8678'
    ctx.font = '400 30px -apple-system, sans-serif'
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 60)
  }
}
```

`sites/life-grid/src/components/long-press-overlay.tsx`：

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
      <img src={dataUrl} alt="人生卡片" className="max-h-[70vh] w-auto rounded-lg" />
      <p className="text-sm text-white">长按图片保存</p>
      <p className="text-xs text-[#8c8678]">点击空白处关闭</p>
    </div>
  )
}
```

`sites/life-grid/src/components/save-card-button.tsx`：

```tsx
import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import type { LifeStats } from '../lib/life-math'
import { makeLifeCardDraw } from '../card/draw-life-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  stats: LifeStats
}

export function SaveCardButton({ stats }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeLifeCardDraw(stats))
      saveCard(canvas, {
        filename: 'my-life-grid.png',
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
        className="rounded-lg bg-[#c8392b] py-3 font-medium text-[#f7f4ec]"
      >
        保存我的人生卡片
      </button>
      {failed && <p className="text-sm text-[#8c8678]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/life-grid test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): 分享卡片绘制与双路径保存流程"
```

---

### Task 15: App 组装（状态机 + generate 埋点）

**Files:**
- Modify: `sites/life-grid/src/app.tsx`
- Test: `sites/life-grid/src/app.test.tsx`

**Interfaces:**
- Consumes: `InputScreen`（12）、`ResultScreen`（13）、`SaveCardButton`（14）、`computeStats`（8）、`track`（shared）
- Produces: `<App />` — `{ screen: 'input' } | { screen: 'result'; input: LifeInput }` 状态机；提交时 `track('generate')`；页脚隐私声明常驻

- [ ] **Step 1: 写失败测试** `sites/life-grid/src/app.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { App } from './app'

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('完整流程：输入 → 结果 → 重新计算回输入', async () => {
    render(<App />)
    await userEvent.type(screen.getByLabelText('出生日期'), '1996-08-04')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(screen.getByLabelText('人生格子图')).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('generate', undefined)
    await userEvent.click(screen.getByRole('button', { name: '重新计算' }))
    expect(screen.getByLabelText('出生日期')).toBeInTheDocument()
  })

  it('隐私声明常驻页脚', () => {
    render(<App />)
    expect(screen.getByText(/所有计算在本地完成/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/life-grid test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/life-grid/src/app.tsx`

```tsx
import { useState } from 'react'
import { track } from '@viral/shared'
import { computeStats, type LifeInput } from './lib/life-math'
import { InputScreen } from './components/input-screen'
import { ResultScreen } from './components/result-screen'
import { SaveCardButton } from './components/save-card-button'

type Screen = { screen: 'input' } | { screen: 'result'; input: LifeInput }

export function App() {
  const [state, setState] = useState<Screen>({ screen: 'input' })

  const handleSubmit = (input: LifeInput) => {
    track('generate')
    setState({ screen: 'result', input })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex-1">
        {state.screen === 'input' ? (
          <InputScreen onSubmit={handleSubmit} today={new Date()} />
        ) : (
          <ResultScreen input={state.input} onRestart={() => setState({ screen: 'input' })}>
            <SaveCardButton stats={computeStats(state.input)} />
          </ResultScreen>
        )}
      </div>
      <footer className="pt-10 text-center text-xs text-[#a29b8a]">
        所有计算在本地完成，你的生日不会被上传
      </footer>
    </main>
  )
}
```

（`today: new Date()` 只允许出现在这一处组装层，纯函数层禁止。）

- [ ] **Step 4: 跑测试确认通过 + 全仓核验**

Run: `pnpm -r test && pnpm -r typecheck && pnpm --filter @viral/life-grid build`
Expected: 全 PASS，构建成功

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(life-grid): App 状态机组装与 generate 埋点"
```

---

### Task 16: 上线准备（预算核验 + 部署 + 手工验收）

**Files:**
- Modify: `README.md`（状态表 01 → 已上线）、`sites/life-grid/index.html`（umami website-id）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: 体积预算核验**

Run: `pnpm --filter @viral/life-grid build`
查看 vite 输出的 gzip 列：JS + CSS gzip 合计须 < 100KB。超了先查 react-dom 之外是否混入多余依赖（`pnpm --filter @viral/life-grid list --depth 0`）。

- [ ] **Step 2: 本地手机真机冒烟**

Run: `pnpm --filter @viral/life-grid dev --host`
手机连同一 Wi-Fi 打开 `http://<局域网IP>:5173`，走一遍输入→结果→保存。

- [ ] **Step 3: 【手工·需用户】创建 umami 站点**

在 cloud.umami.is 注册/登录 → Add website → 拿到 website-id → 替换 `index.html` 里的 `TO_BE_FILLED` 并解除注释。此步骤需要用户账号，执行者停下来向用户要。

- [ ] **Step 4: 【手工·需用户】部署 Cloudflare Pages**

```bash
pnpm dlx wrangler login        # 需要用户浏览器授权
pnpm dlx wrangler pages project create life-grid --production-branch main
pnpm --filter @viral/life-grid build
pnpm dlx wrangler pages deploy sites/life-grid/dist --project-name life-grid
```

产出 `https://life-grid.pages.dev`。

- [ ] **Step 5: 四环境手工验收（设计文档 §8 清单）**

- [ ] iPhone 微信内打开 → 保存走长按路径，图能存到相册
- [ ] 安卓微信内打开 → 同上
- [ ] iOS Safari → 长按路径
- [ ] 桌面 Chrome → 直接下载
- [ ] umami 后台能看到 pageview / generate / save_image 三事件

- [ ] **Step 6: 更新 README 状态并提交推送**

README 路线图表中 01 行状态改为 `🚀 已上线（life-grid.pages.dev）`。

```bash
git add -A && git commit -m "chore: life-grid 上线，更新状态与 umami 配置" && git push
```

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §3 输入/结果屏（Task 12/13）、§3.2 格子图与呼吸动画（Task 10/11）、文案表 6 条与全部边界彩蛋（Task 8/9）、§4 卡片与主文案规则（Task 14）、§6 埋点三事件 + export_error（Task 2/14/15）、§7 测试（各任务 TDD + Task 16 手工清单）、§8 上线清单（Task 16）。未纳入：思源宋体子集化（Task 6 已注明 v1 用系统字族，列入上线后优化）、卡片二维码（设计文档明确为买域名后增强）。
- **占位符扫描**：无 TBD/TODO；Task 16 两个手工步骤明确标注需用户参与，非占位。
- **类型一致性**：`LifeStats`/`LifeInput`（Task 8 定义，9/13/14/15 消费）、`DrawFn`/`CardSize`（Task 4 定义，14 消费）、`SaveStrategy`（Task 3 定义，5 消费）、`GRID_COLORS`（Task 11 定义，14 消费）签名逐一核对一致。
