# 09 · 花光首富的钱 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成站点 09「花光首富的钱」（A 级，纯前端）到可部署状态：给玩家 ¥3,000 亿虚拟余额，60 项五数量级商品买卖，余额低于全场最低价触发结算，产出称号 + 购物清单分享卡。

**Architecture:** `sites/spend-fortune` 是独立 Vite React 应用，只依赖 `@viral/shared`（renderCard/saveCard/track 均已存在，本计划零改动 shared）。核心逻辑全部纯函数：金额格式化（`lib/money`）、买卖 reducer（`lib/game-state`，不可变）、结算与成就判定（`lib/settlement`，显式传时间戳）；React 组件只做渲染与派发；签名元素「金光闪闪的余额跳字」用单 rAF 循环实现。TDD：每个纯函数与组件先写失败测试。

**Tech Stack:** pnpm workspace · Vite · React 19 · TypeScript(strict) · Tailwind v4 · Vitest 3 + Testing Library(jsdom) · Cloudflare Pages（\_worker.js 同源代理 umami）

## Global Constraints

（来自 [00-factory-design.md](../00-factory-design.md)、[00a-style-map.md](../00a-style-map.md)、[09-spend-fortune.md](../09-spend-fortune.md)，所有任务默认遵守）

**金额铁律**
- 金额一律用「分」为单位的整数运算。总额常量 `TOTAL_BALANCE_CENTS = 30_000_000_000_000`（¥3,000 亿 = 3×10¹¹ 元 = 3×10¹³ 分，远小于 `Number.MAX_SAFE_INTEGER ≈ 9×10¹⁵`），Task 2 用断言测试确认安全范围
- 商品价格为正整数分且 `% 100 === 0`（整元），保证余额始终整元、跳字动画无小数抖动；目录 lint（Task 3 测试）构建期强制
- 格式化展示函数独立成 `lib/money.ts` 并单测：`formatPrice` 亿/万自动单位（`¥5` / `¥7,999` / `¥1.5万` / `¥4.5亿` / `¥3,000亿`），`formatBalanceYuan` 整元千分位

**纯函数与不可变**
- `Date.now()` 只允许出现在 App 组装层一处；结算/成就/用时函数一律显式收 `startedAt` / `settledAt` 时间戳参数
- 买卖 reducer 返回新对象，绝不原地修改；非法操作（余额不足买入、持有 0 卖出）返回原引用（便于上层用 `===` 判断无变化）
- 计时起点 = 玩家第一次买入/卖出操作的时刻（设计文档未定义，本计划裁决，Self-Review 有记录）

**埋点**（事件语义全厂统一）
- `visit`：umami pageview 自带；`generate`：触发结算时上报，带 `duration_seconds`（支撑设计 §6 的平均游玩时长指标）；`save_image`：保存卡片；`achievement`：结算时随 generate 一起上报，带 `{ id: 成就id }`；`export_error`：canvas 导出失败降级
- 埋点不带任何个人数据；所有数据只在浏览器本地计算

**成就判定**（设计 §3，优先级 = 设计文档列举顺序，叠加时取最先命中，Task 5 测试写死）
1. `monomaniac` 偏执狂企业家：结算时只持有同一种商品
2. `speedrun` 散财童子：`settledAt - startedAt < 5 分钟`（恰好 5 分钟不算）
3. `wholesale` 批发富豪：持有的每件商品单价 ≥ ¥1 亿
4. `quant` 量化之神：买+卖总操作次数 ≥ 100
5. `rational` 理性消费大师：以上都不满足（默认）

**视觉（Y2K 金钱极繁，00a §3 分配）**——完整色板：

| 用途 | 色值 |
|------|------|
| 底黑 | `#0b0d0b` |
| 美元绿（买入按钮/光带） | `#1e8f52` |
| 浅美元绿（辅助文字） | `#9fd8b4` |
| 烫金亮（余额数字/称号） | `#f7c948` |
| 烫金深（金色渐变收尾/分隔线） | `#c9971c` |
| 电光玫红（卖出按钮点缀） | `#ff3d8b` |
| 电光蓝（分类标题点缀） | `#3dd6ff` |
| 纸白（正文） | `#f5f2e6` |

- **防模板脸条款**（00a §1.3）：不得退化为「近黑底 + 单一荧光绿」——烫金渐变跳字（签名元素）、玫红/电光蓝多色点缀、💵🤑💰✨ 贴纸 emoji 极繁语汇必须同时在场
- **与 12 号站（Y2K 非主流）区分**：本站走「金钱贴纸爆炸标语汇」，禁用彩虹渐变与火星文（留给 12）
- 签名动效：余额跳字用单 rAF 循环 600ms 缓动（帧级节流，每帧至多一次 setState）；`prefers-reduced-motion` 时 JS 直接跳终值、CSS shimmer 关闭（两处都处理）；数字用 `font-variant-numeric: tabular-nums` 防宽度抖动
- 移动端优先；所有可见文字最小 14px（Tailwind 不用 `text-xs`）；正文对比度 ≥ 4.5:1；首屏 gzip < 100KB；不引入组件库/日期库/动画库/状态库

**内容与合规**
- 免责声明**只放页脚**：「首富为虚构人物，价格为公开资料估算，仅供娱乐」；「首富」不出现任何真实人名与企业名；灵感来源页脚写「机制致敬海外经典网页游戏」（不点名，规避设计 §3 与 §8 的措辞冲突，Self-Review 有记录）
- 商品库 60 项全部在 Task 3 成文，`priceNote`（价格来源备注）必填一句话口径；**全库价格上线前人工核对**是 Task 11 的【手工·需用户】gate——被扒错价是本站最大口碑风险

**工程约定**
- 目录 `sites/spend-fortune`，包名 `@viral/spend-fortune`；`public/_worker.js` 与 `public/u.js` 从 `sites/life-grid/public/` 原样 `cp`；`index.html` 同款 umami 自托管接法（website-id 先写 `TO_BE_FILLED`，Task 11 替换）；favicon 按 Y2K 金钱风现写
- vitest `globals: true` + `setupFiles`；依赖 `vitest@^3`、`@testing-library/jest-dom@^6`；测试命令统一 `pnpm --filter @viral/spend-fortune test`
- 提交信息用 conventional commits（feat/fix/test/chore/docs），不加 Co-Authored-By；包管理只用 pnpm

**文件全景**（Create 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
sites/spend-fortune/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  public/_worker.js  public/u.js              # cp 自 sites/life-grid/public/（Task 1）
  public/favicon.svg                          # Y2K 金钱风新写（Task 1）
  test/setup.ts  test/canvas-stub.ts          # canvas-stub cp 自 sites/life-grid/test/
  src/main.tsx  src/index.css
  src/app.tsx (+test)                         # 状态机组装 + generate/achievement 埋点
  src/lib/money.ts (+test)                    # 金额常量 + 亿/万格式化
  src/data/products.ts (+test)                # 60 项商品库 + 目录 lint 测试
  src/lib/game-state.ts (+test)               # 买卖 reducer（不可变）+ 结算触发
  src/lib/settlement.ts (+test)               # 结算汇总/成就判定/用时格式化纯函数
  src/components/balance-ticker.tsx (+test)   # 签名元素：金色余额跳字
  src/components/product-card.tsx (+test)
  src/components/shop-screen.tsx (+test)
  src/components/result-screen.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-list-card.ts (+test)          # 1080×1440 购物清单卡
```

---

### Task 1: 站点脚手架（含 Y2K 视觉底座）

**Files:**
- Create: `sites/spend-fortune/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `public/favicon.svg`, `test/setup.ts`, `src/main.tsx`, `src/app.tsx`（占位，Task 10 替换）, `src/index.css`
- Copy: `sites/life-grid/public/_worker.js` → `sites/spend-fortune/public/_worker.js`；`sites/life-grid/public/u.js` → `sites/spend-fortune/public/u.js`；`sites/life-grid/test/canvas-stub.ts` → `sites/spend-fortune/test/canvas-stub.ts`

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）
- Produces: 可 build 的 Vite React 站点；色板 CSS 变量与 `.gold-number` / `.gold-shimmer` 签名样式类；`test/canvas-stub.ts` 的 `installCanvasStub(): RecordingCtx`（Task 9 复用）

- [ ] **Step 1: 建目录并复制工厂既有资产**

```bash
mkdir -p sites/spend-fortune/public sites/spend-fortune/src sites/spend-fortune/test
cp sites/life-grid/public/_worker.js sites/spend-fortune/public/_worker.js
cp sites/life-grid/public/u.js sites/spend-fortune/public/u.js
cp sites/life-grid/test/canvas-stub.ts sites/spend-fortune/test/canvas-stub.ts
```

- [ ] **Step 2: 写包与配置文件**

`sites/spend-fortune/package.json`：

```json
{
  "name": "@viral/spend-fortune",
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
pnpm --filter @viral/spend-fortune add react react-dom '@viral/shared@workspace:*'
pnpm --filter @viral/spend-fortune add -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite 'vitest@^3' jsdom @testing-library/react @testing-library/user-event '@testing-library/jest-dom@^6' @types/react @types/react-dom
```

`sites/spend-fortune/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client", "@testing-library/jest-dom"] },
  "include": ["src", "test"]
}
```

`sites/spend-fortune/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/spend-fortune/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
})
```

`sites/spend-fortune/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: 写 index.html 与 favicon**

`sites/spend-fortune/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0b0d0b" />
    <title>花光首富的钱 — 给你 ¥3,000 亿，看你几分钟花完</title>
    <meta
      name="description"
      content="给你 3,000 亿零花钱，从 5 块的煎饼果子买到 1,000 亿的晶圆厂，看你几分钟能花完。结算生成你的专属购物清单卡。"
    />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- umami 自托管脚本 + 同源上报（data-host-url="/" → POST /api/send，由 _worker.js 代理转发）。
         上线前把 TO_BE_FILLED 替换为真实 website-id（Task 11 手工步骤） -->
    <script defer src="/u.js" data-website-id="TO_BE_FILLED" data-host-url="/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`sites/spend-fortune/public/favicon.svg`（Y2K 金钱风：黑底金 ¥ + 美元绿环 + 高饱和光点）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0b0d0b"/>
  <circle cx="32" cy="32" r="21" fill="none" stroke="#1e8f52" stroke-width="5"/>
  <text x="32" y="43" text-anchor="middle" font-size="30" font-weight="700" fill="#f7c948" font-family="system-ui, sans-serif">¥</text>
  <circle cx="51" cy="13" r="4" fill="#f7c948"/>
  <circle cx="12" cy="51" r="3" fill="#3dd6ff"/>
  <circle cx="54" cy="50" r="2.5" fill="#ff3d8b"/>
</svg>
```

- [ ] **Step 4: 写样式底座与入口**

`sites/spend-fortune/src/index.css`：

```css
@import 'tailwindcss';

:root {
  color-scheme: dark;
  --sf-black: #0b0d0b;
  --sf-green: #1e8f52;
  --sf-green-light: #9fd8b4;
  --sf-gold: #f7c948;
  --sf-gold-deep: #c9971c;
  --sf-pink: #ff3d8b;
  --sf-blue: #3dd6ff;
  --sf-paper: #f5f2e6;
}

body {
  background-color: var(--sf-black);
  /* Y2K 金钱极繁：美元绿 + 烫金弥散光斑铺底，纯 CSS 不用图 */
  background-image:
    radial-gradient(600px 300px at 85% -5%, rgba(30, 143, 82, 0.28), transparent 70%),
    radial-gradient(500px 260px at 0% 100%, rgba(247, 201, 72, 0.12), transparent 70%);
  background-attachment: fixed;
  color: var(--sf-paper);
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

/* 烫金数字：金色渐变裁剪进文字，等宽数字防跳动 */
.gold-number {
  background: linear-gradient(180deg, #ffe9a3 0%, var(--sf-gold) 45%, var(--sf-gold-deep) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-variant-numeric: tabular-nums;
}

/* 金光闪闪扫光（签名元素专用，克制使用） */
.gold-shimmer {
  position: relative;
}
.gold-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
  background-size: 200% 100%;
  animation: shimmer 2.4s linear infinite;
  pointer-events: none;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gold-shimmer::after {
    animation: none;
  }
}
```

`sites/spend-fortune/src/main.tsx`：

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

`sites/spend-fortune/src/app.tsx`（占位，Task 10 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-4 py-6">花光首富的钱</main>
}
```

- [ ] **Step 5: 验证构建**

Run: `pnpm --filter @viral/spend-fortune build`
Expected: 构建成功，产出 `sites/spend-fortune/dist/`（含 `_worker.js`、`u.js`、`favicon.svg`）

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 站点脚手架与 Y2K 金钱视觉底座"
```

---

### Task 2: 金额常量与格式化 money

**Files:**
- Create: `sites/spend-fortune/src/lib/money.ts`
- Test: `sites/spend-fortune/src/lib/money.test.ts`

**Interfaces:**
- Produces（后续任务大量依赖，签名必须一致）:
  - `const TOTAL_BALANCE_CENTS = 30_000_000_000_000`（¥3,000 亿，分）
  - `const CENTS_PER_YUAN = 100`、`const CENTS_PER_WAN = 1_000_000`、`const CENTS_PER_YI = 10_000_000_000`
  - `formatPrice(cents: number): string` — 亿/万自动单位：≥1 亿元显示 `¥N亿`，≥1 万元显示 `¥N万`，其余整元千分位；小数至多 2 位且去尾零
  - `formatBalanceYuan(cents: number): string` — 余额大数字专用：整元 + 千分位，不带 ¥ 前缀（前缀由组件排版）

- [ ] **Step 1: 写失败测试** `sites/spend-fortune/src/lib/money.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  CENTS_PER_WAN,
  CENTS_PER_YI,
  CENTS_PER_YUAN,
  formatBalanceYuan,
  formatPrice,
  TOTAL_BALANCE_CENTS,
} from './money'

describe('金额常量', () => {
  it('总额 = 3,000 亿元的分值，且在 Number 安全整数范围内', () => {
    expect(TOTAL_BALANCE_CENTS).toBe(300_000_000_000 * CENTS_PER_YUAN)
    expect(Number.isSafeInteger(TOTAL_BALANCE_CENTS)).toBe(true)
    expect(TOTAL_BALANCE_CENTS).toBeLessThan(Number.MAX_SAFE_INTEGER)
  })

  it('单位换算常量自洽', () => {
    expect(CENTS_PER_WAN).toBe(10_000 * CENTS_PER_YUAN)
    expect(CENTS_PER_YI).toBe(100_000_000 * CENTS_PER_YUAN)
  })
})

describe('formatPrice（亿/万自动单位）', () => {
  it('百元以下整元直显', () => expect(formatPrice(500)).toBe('¥5'))
  it('千元级千分位', () => expect(formatPrice(799_900)).toBe('¥7,999'))
  it('不足一万不进万', () => expect(formatPrice(960_000)).toBe('¥9,600'))
  it('万元级保留小数', () => expect(formatPrice(1_500_000)).toBe('¥1.5万'))
  it('万元级整数去尾零', () => expect(formatPrice(800_000_000)).toBe('¥800万'))
  it('亿元级保留小数', () => expect(formatPrice(45_000_000_000)).toBe('¥4.5亿'))
  it('亿元级整数去尾零', () => expect(formatPrice(320_000_000_000)).toBe('¥32亿'))
  it('总额显示 ¥3,000亿', () => expect(formatPrice(TOTAL_BALANCE_CENTS)).toBe('¥3,000亿'))
})

describe('formatBalanceYuan（余额整元千分位）', () => {
  it('满额', () => expect(formatBalanceYuan(TOTAL_BALANCE_CENTS)).toBe('300,000,000,000'))
  it('零', () => expect(formatBalanceYuan(0)).toBe('0'))
  it('结算残值 4 元', () => expect(formatBalanceYuan(400)).toBe('4'))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL（money 未实现）

- [ ] **Step 3: 实现** `sites/spend-fortune/src/lib/money.ts`

```ts
export const CENTS_PER_YUAN = 100
export const CENTS_PER_WAN = 10_000 * CENTS_PER_YUAN
export const CENTS_PER_YI = 100_000_000 * CENTS_PER_YUAN

/** ¥3,000 亿，以分计。3×10¹³ << 2⁵³，整数运算全程安全 */
export const TOTAL_BALANCE_CENTS = 300_000_000_000 * CENTS_PER_YUAN

/** 数值 → 千分位字符串，小数至多 2 位、去尾零 */
function fmtUnit(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatPrice(cents: number): string {
  if (cents >= CENTS_PER_YI) return `¥${fmtUnit(cents / CENTS_PER_YI)}亿`
  if (cents >= CENTS_PER_WAN) return `¥${fmtUnit(cents / CENTS_PER_WAN)}万`
  return `¥${fmtUnit(cents / CENTS_PER_YUAN)}`
}

export function formatBalanceYuan(cents: number): string {
  return Math.round(cents / CENTS_PER_YUAN).toLocaleString('en-US')
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/spend-fortune test && pnpm --filter @viral/spend-fortune typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 金额常量与亿/万格式化"
```

---

### Task 3: 商品库 60 项 + 目录 lint（构建期测试）

**Files:**
- Create: `sites/spend-fortune/src/data/products.ts`
- Test: `sites/spend-fortune/src/data/products.test.ts`

**Interfaces:**
- Consumes: `TOTAL_BALANCE_CENTS`（Task 2）
- Produces:
  - `type ProductCategory = '小吃日常' | '数码大件' | '豪车豪宅' | '亿级资产' | '超级工程'`
  - `interface Product { id: string; name: string; priceCents: number; emoji: string; category: ProductCategory; priceNote: string }`
  - `const PRODUCTS: readonly Product[]`（恰好 60 项）
  - `cheapestPriceCents(products: readonly Product[]): number`（结算触发阈值 = 全场最低价）
- 备注：设计 §4 要求 100+ 项，本计划按任务指令先落 60 项验证传播，扩库列入上线后迭代（Self-Review 有记录）。**全库价格上线前人工核对**在 Task 11 执行。

- [ ] **Step 1: 写失败测试（即构建期目录 lint）** `sites/spend-fortune/src/data/products.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { TOTAL_BALANCE_CENTS } from '../lib/money'
import { cheapestPriceCents, PRODUCTS } from './products'

/** 设计 §4 的五个数量级（单位：分） */
const BANDS: Array<[string, (c: number) => boolean]> = [
  ['¥5~100', (c) => c >= 500 && c <= 10_000],
  ['¥1k~1万', (c) => c >= 100_000 && c <= 1_000_000],
  ['¥10万~1000万', (c) => c >= 10_000_000 && c <= 1_000_000_000],
  ['¥1亿~100亿', (c) => c >= 10_000_000_000 && c <= 1_000_000_000_000],
  ['¥100亿+', (c) => c > 1_000_000_000_000],
]

describe('商品库目录 lint', () => {
  it('恰好 60 项', () => expect(PRODUCTS).toHaveLength(60))

  it('id 全库唯一', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length)
  })

  it('字段完整：名称/emoji/分类非空，价格来源备注为一句话（≥6 字符）', () => {
    for (const p of PRODUCTS) {
      expect(p.name.length, p.id).toBeGreaterThan(0)
      expect(p.emoji.length, p.id).toBeGreaterThan(0)
      expect(p.category.length, p.id).toBeGreaterThan(0)
      expect(p.priceNote.length, p.id).toBeGreaterThanOrEqual(6)
    }
  })

  it('价格为正整数分、整元，且单件都买得起', () => {
    for (const p of PRODUCTS) {
      expect(Number.isSafeInteger(p.priceCents), p.id).toBe(true)
      expect(p.priceCents, p.id).toBeGreaterThan(0)
      expect(p.priceCents % 100, p.id).toBe(0)
      expect(p.priceCents, p.id).toBeLessThanOrEqual(TOTAL_BALANCE_CENTS)
    }
  })

  it('五个数量级每级至少 8 项', () => {
    for (const [label, match] of BANDS) {
      expect(PRODUCTS.filter((p) => match(p.priceCents)).length, label).toBeGreaterThanOrEqual(8)
    }
  })

  it('全场最低价是 ¥5（煎饼果子，结算触发阈值）', () => {
    expect(cheapestPriceCents(PRODUCTS)).toBe(500)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/spend-fortune/src/data/products.ts`（60 项全量成文；价格为常识量级估值，priceNote 注明口径，上线前 Task 11 逐条人工核对）

```ts
export type ProductCategory = '小吃日常' | '数码大件' | '豪车豪宅' | '亿级资产' | '超级工程'

export interface Product {
  id: string
  name: string
  priceCents: number
  emoji: string
  category: ProductCategory
  priceNote: string
}

/** 价格以「元」书写（可读），入库即转「分」 */
const p = (
  id: string,
  name: string,
  priceYuan: number,
  emoji: string,
  category: ProductCategory,
  priceNote: string,
): Product => ({ id, name, priceCents: priceYuan * 100, emoji, category, priceNote })

export const PRODUCTS: readonly Product[] = [
  // ── 小吃日常（¥5~100）──
  p('jianbing', '煎饼果子', 5, '🥞', '小吃日常', '北方城市街头摊 2024 年常见单价'),
  p('latiao', '大包辣条', 6, '🌶️', '小吃日常', '商超大包装零售价'),
  p('milk-tea', '大杯奶茶', 18, '🧋', '小吃日常', '头部连锁品牌招牌款定价'),
  p('lunch-box', '打工人外卖套餐', 25, '🍱', '小吃日常', '一线城市工作日外卖客单价'),
  p('coffee', '现磨拿铁', 30, '☕', '小吃日常', '连锁咖啡门店中杯挂牌价'),
  p('video-month', '视频网站月卡', 30, '📺', '小吃日常', '主流平台非连续包月单月价'),
  p('cinema', '一张电影票', 45, '🎬', '小吃日常', '2024 年全国平均票价约 43 元取整'),
  p('book', '精装畅销书', 59, '📚', '小吃日常', '出版社定价常见区间'),
  p('taxi', '打车跨半个城', 60, '🚕', '小吃日常', '一线城市 15 公里快车估价'),
  p('game-skin', '手游传说皮肤', 68, '🎮', '小吃日常', '主流手游传说级皮肤定价'),
  p('blind-box', '潮玩盲盒', 69, '🎁', '小吃日常', '头部潮玩品牌常规系列单盒价'),
  p('script-game', '剧本杀一场', 88, '🕵️', '小吃日常', '一二线城市门店人均价'),

  // ── 数码大件（¥1k~1万）──
  p('concert', '演唱会内场票', 1880, '🎤', '数码大件', '头部歌手巡演内场票面价'),
  p('earphones', '旗舰降噪耳机', 1899, '🎧', '数码大件', '头部品牌 2024 款官网价'),
  p('maotai', '一瓶飞天茅台', 2600, '🍶', '数码大件', '2024 年市场零售行情价'),
  p('ebike', '电动自行车', 3500, '🛵', '数码大件', '新国标主流车型门店价'),
  p('console', '次世代游戏主机', 3899, '🕹️', '数码大件', '国行光驱版首发价'),
  p('drone', '航拍无人机', 4999, '🚁', '数码大件', '头部品牌中端机型官网价'),
  p('gold-10g', '10 克投资金条', 6000, '🪙', '数码大件', '按 2024 年金价约 600 元每克估算'),
  p('massage-chair', '家用按摩椅', 6999, '💺', '数码大件', '商场同款型号促销价'),
  p('laptop', '高配轻薄本', 6999, '💻', '数码大件', '主流品牌高配款官网价'),
  p('iphone', '顶配旗舰手机', 7999, '📱', '数码大件', 'Pro 系列 256GB 国行首发价'),
  p('camera', '全画幅微单', 8999, '📷', '数码大件', '入门全画幅套机行情价'),
  p('rent-year', '三线城市一年房租', 9600, '🔑', '数码大件', '按月租 800 元一居室估算'),

  // ── 豪车豪宅（¥10万~1000万）──
  p('rolex', '热门钢款名表', 150_000, '⌚', '豪车豪宅', '专柜公价与二级市场行情量级'),
  p('model-y', '电动 SUV 顶配', 260_000, '🚙', '豪车豪宅', '2024 年长续航版指导价'),
  p('hermes', '铂金包', 300_000, '👜', '豪车豪宅', '专柜配货后到手价公开讨论量级'),
  p('wedding', '一场豪华婚礼', 300_000, '💒', '豪车豪宅', '一线城市高配婚礼全案报价'),
  p('olympic-gold', '一块奥运金牌的国家奖金', 500_000, '🥇', '豪车豪宅', '近届奥运会国家奖励公开报道约 50 万'),
  p('emba', '顶级商学院 EMBA', 800_000, '🎓', '豪车豪宅', '头部商学院全程学费公开定价'),
  p('panamera', '保时捷帕拉梅拉', 1_000_000, '🏎️', '豪车豪宅', '入门配置官方指导价约 100 万'),
  p('racehorse', '一匹纯血赛马', 1_000_000, '🐎', '豪车豪宅', '马术俱乐部进口赛马行情量级'),
  p('yacht-60ft', '60 尺游艇', 2_000_000, '🛥️', '豪车豪宅', '国产品牌市场报价量级'),
  p('cctv-ad', '央视黄金档 30 秒广告', 5_000_000, '📢', '豪车豪宅', '黄金时段单条刊例价量级'),
  p('rolls-royce', '劳斯莱斯幻影', 6_000_000, '🚘', '豪车豪宅', '官方指导价约 600 万起'),
  p('school-house', '北京学区房', 8_000_000, '🏠', '豪车豪宅', '海淀 60 平学区老房挂牌价量级'),

  // ── 亿级资产（¥1亿~100亿）──
  p('island', '一座海外私人小岛', 200_000_000, '🏝️', '亿级资产', '国际岛屿中介挂牌价折算量级'),
  p('csl-team', '一支中超球队', 300_000_000, '⚽', '亿级资产', '近年俱乐部股权转让公开报道量级'),
  p('hotel-year', '包下五星酒店一整年', 400_000_000, '🏨', '亿级资产', '按 500 间房均价 2000 元包年估算'),
  p('gulfstream', '湾流公务机', 450_000_000, '✈️', '亿级资产', 'G650 公开报价约 6500 万美元折算'),
  p('rocket', '发射一枚商业火箭', 500_000_000, '🚀', '亿级资产', '国际商业发射公开报价约 7000 万美元折算'),
  p('pink-diamond', '拍卖会巨型粉钻', 500_000_000, '💎', '亿级资产', '历史成交价约 7100 万美元折算'),
  p('hospital-bldg', '捐建一栋三甲医院大楼', 500_000_000, '🏥', '亿级资产', '公开慈善捐建项目报道量级'),
  p('blockbuster', '投拍一部春节档大片', 600_000_000, '🎥', '亿级资产', '头部国产大片制作加宣发公开报道量级'),
  p('transfer-fee', '顶级球星转会费', 800_000_000, '🌟', '亿级资产', '亿元欧元级转会公开报道折算'),
  p('satellite', '一颗大型通信卫星', 1_000_000_000, '🛰️', '亿级资产', '制造加发射打包成本公开报道量级'),
  p('masterpiece', '一幅天价名画', 1_200_000_000, '🖼️', '亿级资产', '国际拍卖会成交纪录量级折算'),
  p('esports-club', '头部电竞俱乐部', 1_500_000_000, '🏆', '亿级资产', '俱乐部整体估值公开报道量级'),
  p('super-yacht', '百米超级游艇', 2_000_000_000, '🛳️', '亿级资产', '国际船厂报价折算量级'),
  p('a380', '一架空客 A380', 3_200_000_000, '🛩️', '亿级资产', '官方目录价约 4.45 亿美元折算'),

  // ── 超级工程（¥100亿+）──
  p('skyscraper', '一线城市地标摩天楼', 15_000_000_000, '🏙️', '超级工程', '632 米级超高层总投资公开报道约 150 亿'),
  p('hsr-100km', '修 100 公里高铁', 15_000_000_000, '🚄', '超级工程', '每公里约 1.5 亿的公开测算'),
  p('metro-line', '一条 30 公里地铁线', 30_000_000_000, '🚇', '超级工程', '一线城市每公里约 10 亿的公开测算'),
  p('theme-park', '建一座国际主题乐园', 34_000_000_000, '🎢', '超级工程', '上海某国际乐园一期投资公开报道约 340 亿'),
  p('space-station', '一座载人空间站', 35_000_000_000, '🛸', '超级工程', '载人航天工程历年投入公开报道量级'),
  p('constellation', '低轨卫星互联网星座', 50_000_000_000, '🌌', '超级工程', '大型星座计划总投资公开测算量级'),
  p('olympics', '承办一届夏季奥运会', 70_000_000_000, '🏟️', '超级工程', '东京奥运会最终成本公开报道折算约 700 亿'),
  p('airport', '建一座国际枢纽机场', 80_000_000_000, '🛫', '超级工程', '北京大兴机场总投资公开报道约 800 亿'),
  p('chip-fab', '一座先进晶圆厂', 100_000_000_000, '🏭', '超级工程', '先进制程晶圆厂单厂投资公开报道量级'),
  p('sea-bridge', '一座跨海大桥', 120_000_000_000, '🌉', '超级工程', '港珠澳大桥总投资公开报道约 1200 亿'),
]

export function cheapestPriceCents(products: readonly Product[]): number {
  return products.reduce((min, item) => Math.min(min, item.priceCents), Number.POSITIVE_INFINITY)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: PASS（60 项、唯一 id、五数量级、整元、最低价 500 分全部通过）

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 60 项商品库与目录 lint"
```

---

### Task 4: 买卖 reducer game-state（不可变）

**Files:**
- Create: `sites/spend-fortune/src/lib/game-state.ts`
- Test: `sites/spend-fortune/src/lib/game-state.test.ts`

**Interfaces:**
- Consumes: `Product`（Task 3）、`TOTAL_BALANCE_CENTS`（Task 2）
- Produces:
  - `interface GameState { balanceCents: number; holdings: Readonly<Record<string, number>>; opsCount: number }`（holdings 只存数量 ≥1 的商品；opsCount = 买+卖累计次数，供量化之神成就）
  - `type GameAction = { type: 'buy'; product: Product } | { type: 'sell'; product: Product }`
  - `initialGameState(totalCents?: number): GameState`（默认满额 3,000 亿）
  - `gameReducer(state: GameState, action: GameAction): GameState` — 一律返回新对象；余额不足买入 / 持有 0 卖出返回**原引用**；卖出全额退款
  - `isSettled(state: GameState, cheapestCents: number): boolean` — 余额 < 全场最低价即结算（设计 §3）

- [ ] **Step 1: 写失败测试** `sites/spend-fortune/src/lib/game-state.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { Product } from '../data/products'
import { TOTAL_BALANCE_CENTS } from './money'
import { gameReducer, initialGameState, isSettled, type GameState } from './game-state'

const jianbing: Product = {
  id: 'jianbing',
  name: '煎饼果子',
  priceCents: 500,
  emoji: '🥞',
  category: '小吃日常',
  priceNote: '测试夹具',
}

const fab: Product = {
  id: 'chip-fab',
  name: '一座先进晶圆厂',
  priceCents: 10_000_000_000_000,
  emoji: '🏭',
  category: '超级工程',
  priceNote: '测试夹具',
}

describe('initialGameState', () => {
  it('满余额、零持有、零操作', () => {
    expect(initialGameState()).toEqual({
      balanceCents: TOTAL_BALANCE_CENTS,
      holdings: {},
      opsCount: 0,
    })
  })
})

describe('gameReducer / 买入', () => {
  it('扣款、持有 +1、操作数 +1，返回新对象且原 state 不被修改', () => {
    const s0 = initialGameState()
    const s1 = gameReducer(s0, { type: 'buy', product: jianbing })
    expect(s1).not.toBe(s0)
    expect(s1.balanceCents).toBe(TOTAL_BALANCE_CENTS - 500)
    expect(s1.holdings).toEqual({ jianbing: 1 })
    expect(s1.opsCount).toBe(1)
    // 不可变：原对象保持初始值
    expect(s0.balanceCents).toBe(TOTAL_BALANCE_CENTS)
    expect(s0.holdings).toEqual({})
    expect(s0.opsCount).toBe(0)
  })

  it('余额不足：返回原引用', () => {
    const poor: GameState = { balanceCents: 400, holdings: {}, opsCount: 5 }
    expect(gameReducer(poor, { type: 'buy', product: jianbing })).toBe(poor)
  })

  it('恰好花完：余额等于单价可以买，买完为 0', () => {
    const s: GameState = { balanceCents: 500, holdings: {}, opsCount: 0 }
    expect(gameReducer(s, { type: 'buy', product: jianbing }).balanceCents).toBe(0)
  })

  it('三座晶圆厂恰好花光 3,000 亿', () => {
    let s = initialGameState()
    s = gameReducer(s, { type: 'buy', product: fab })
    s = gameReducer(s, { type: 'buy', product: fab })
    s = gameReducer(s, { type: 'buy', product: fab })
    expect(s.balanceCents).toBe(0)
    expect(s.holdings).toEqual({ 'chip-fab': 3 })
  })
})

describe('gameReducer / 卖出', () => {
  it('全额退款、持有 -1、操作数 +1', () => {
    const s0: GameState = { balanceCents: 0, holdings: { jianbing: 2 }, opsCount: 2 }
    const s1 = gameReducer(s0, { type: 'sell', product: jianbing })
    expect(s1.balanceCents).toBe(500)
    expect(s1.holdings).toEqual({ jianbing: 1 })
    expect(s1.opsCount).toBe(3)
    expect(s0.holdings).toEqual({ jianbing: 2 })
  })

  it('卖到 0 移除持有键；再卖返回原引用', () => {
    let s = initialGameState()
    s = gameReducer(s, { type: 'buy', product: jianbing })
    s = gameReducer(s, { type: 'sell', product: jianbing })
    expect(s.holdings).toEqual({})
    expect(s.balanceCents).toBe(TOTAL_BALANCE_CENTS)
    expect(gameReducer(s, { type: 'sell', product: jianbing })).toBe(s)
  })
})

describe('数量与金额一致性', () => {
  it('任意操作序列后：总额 − 余额 = Σ 持有数量 × 单价', () => {
    const actions = [
      { type: 'buy', product: fab },
      { type: 'buy', product: jianbing },
      { type: 'buy', product: jianbing },
      { type: 'sell', product: jianbing },
      { type: 'buy', product: fab },
      { type: 'sell', product: fab },
    ] as const
    const catalog = { jianbing, 'chip-fab': fab }
    const final = actions.reduce((s, a) => gameReducer(s, a), initialGameState())
    const heldValue = Object.entries(final.holdings).reduce(
      (sum, [id, qty]) => sum + catalog[id as keyof typeof catalog].priceCents * qty,
      0,
    )
    expect(TOTAL_BALANCE_CENTS - final.balanceCents).toBe(heldValue)
    expect(final.opsCount).toBe(6)
  })
})

describe('isSettled', () => {
  it('余额低于全场最低价触发结算', () => {
    expect(isSettled({ balanceCents: 499, holdings: {}, opsCount: 1 }, 500)).toBe(true)
    expect(isSettled({ balanceCents: 0, holdings: {}, opsCount: 1 }, 500)).toBe(true)
  })

  it('余额等于最低价不触发（还能买最后一个煎饼果子）', () => {
    expect(isSettled({ balanceCents: 500, holdings: {}, opsCount: 1 }, 500)).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/spend-fortune/src/lib/game-state.ts`

```ts
import type { Product } from '../data/products'
import { TOTAL_BALANCE_CENTS } from './money'

export interface GameState {
  balanceCents: number
  holdings: Readonly<Record<string, number>>
  opsCount: number
}

export type GameAction = { type: 'buy'; product: Product } | { type: 'sell'; product: Product }

export function initialGameState(totalCents: number = TOTAL_BALANCE_CENTS): GameState {
  return { balanceCents: totalCents, holdings: {}, opsCount: 0 }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const { product } = action
  const held = state.holdings[product.id] ?? 0

  if (action.type === 'buy') {
    if (state.balanceCents < product.priceCents) return state
    return {
      balanceCents: state.balanceCents - product.priceCents,
      holdings: { ...state.holdings, [product.id]: held + 1 },
      opsCount: state.opsCount + 1,
    }
  }

  if (held === 0) return state
  const holdings: Record<string, number> = { ...state.holdings }
  if (held === 1) {
    delete holdings[product.id] // 删的是新副本，原 state 不动
  } else {
    holdings[product.id] = held - 1
  }
  return {
    balanceCents: state.balanceCents + product.priceCents,
    holdings,
    opsCount: state.opsCount + 1,
  }
}

/** 设计 §3：余额 < 全场最低价 → 触发「你花光了首富的钱」结算 */
export function isSettled(state: GameState, cheapestCents: number): boolean {
  return state.balanceCents < cheapestCents
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 买卖 reducer 与结算触发判定"
```

---

### Task 5: 结算汇总与成就判定 settlement

**Files:**
- Create: `sites/spend-fortune/src/lib/settlement.ts`
- Test: `sites/spend-fortune/src/lib/settlement.test.ts`

**Interfaces:**
- Consumes: `Product`（Task 3）、`GameState`（Task 4）、`CENTS_PER_YI`（Task 2）
- Produces:
  - `type AchievementId = 'monomaniac' | 'speedrun' | 'wholesale' | 'quant' | 'rational'`
  - `const ACHIEVEMENTS: Record<AchievementId, { name: string; blurb: string }>`（偏执狂企业家/散财童子/批发富豪/量化之神/理性消费大师）
  - `const ACHIEVEMENT_PRIORITY: readonly AchievementId[]`（优先级写死 = 设计文档列举顺序）
  - `const SPEEDRUN_MS = 300_000`、`const QUANT_OPS = 100`、`const WHOLESALE_MIN_CENTS = CENTS_PER_YI`
  - `interface SettlementInput { state: GameState; products: readonly Product[]; startedAt: number; settledAt: number }`（用时显式传入开始/结束时间戳）
  - `determineAchievement(input: SettlementInput): AchievementId`
  - `interface PurchaseLine { product: Product; quantity: number; spentCents: number }`
  - `interface SettlementSummary { achievementId: AchievementId; durationMs: number; lines: PurchaseLine[]; top5: PurchaseLine[]; totalSpentCents: number; mostExpensive: Product | null }`（lines 按花费金额降序；mostExpensive 按单价最高）
  - `buildSettlement(input: SettlementInput): SettlementSummary`
  - `formatDuration(ms: number): string`（`42 秒` / `3 分 42 秒`）

- [ ] **Step 1: 写失败测试** `sites/spend-fortune/src/lib/settlement.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { Product } from '../data/products'
import type { GameState } from './game-state'
import {
  buildSettlement,
  determineAchievement,
  formatDuration,
  QUANT_OPS,
  SPEEDRUN_MS,
} from './settlement'

const item = (id: string, priceYuan: number): Product => ({
  id,
  name: `商品${id}`,
  priceCents: priceYuan * 100,
  emoji: '💰',
  category: '亿级资产',
  priceNote: '测试夹具备注',
})

const jianbing = item('jianbing', 5)
const jet = item('jet', 450_000_000) // ¥4.5 亿
const sat = item('sat', 1_000_000_000) // ¥10 亿
const PRODUCTS = [jianbing, jet, sat]

const state = (holdings: Record<string, number>, opsCount: number): GameState => ({
  balanceCents: 0,
  holdings,
  opsCount,
})

/** 便捷构造：默认 10 分钟、10 次操作（不触发任何叠加条件） */
const input = (
  holdings: Record<string, number>,
  opts: { opsCount?: number; durationMs?: number } = {},
) => ({
  state: state(holdings, opts.opsCount ?? 10),
  products: PRODUCTS,
  startedAt: 1_000,
  settledAt: 1_000 + (opts.durationMs ?? 600_000),
})

describe('determineAchievement', () => {
  it('只持有一种商品 → 偏执狂企业家', () => {
    expect(determineAchievement(input({ jianbing: 60 }))).toBe('monomaniac')
  })

  it('5 分钟内花完 → 散财童子', () => {
    expect(determineAchievement(input({ jet: 1, sat: 1 }, { durationMs: SPEEDRUN_MS - 1 }))).toBe(
      'speedrun',
    )
  })

  it('恰好 5 分钟整不算散财童子', () => {
    expect(determineAchievement(input({ jet: 1, sat: 1 }, { durationMs: SPEEDRUN_MS }))).toBe(
      'wholesale',
    )
  })

  it('只买 ≥1 亿的商品 → 批发富豪', () => {
    expect(determineAchievement(input({ jet: 2, sat: 1 }))).toBe('wholesale')
  })

  it('混入便宜货就不是批发富豪；操作 ≥100 → 量化之神', () => {
    expect(determineAchievement(input({ jianbing: 1, sat: 1 }, { opsCount: QUANT_OPS }))).toBe(
      'quant',
    )
  })

  it('都不满足 → 理性消费大师', () => {
    expect(determineAchievement(input({ jianbing: 1, sat: 1 }, { opsCount: 99 }))).toBe('rational')
  })

  it('叠加时按设计文档顺序取最先命中：单一持有且全 ≥1 亿且快且操作多 → 偏执狂', () => {
    expect(
      determineAchievement(input({ sat: 30 }, { opsCount: 150, durationMs: 60_000 })),
    ).toBe('monomaniac')
  })

  it('叠加：快 + 全 ≥1 亿（多种）→ 散财童子优先于批发富豪', () => {
    expect(
      determineAchievement(input({ jet: 1, sat: 1 }, { durationMs: 60_000, opsCount: 150 })),
    ).toBe('speedrun')
  })
})

describe('buildSettlement', () => {
  it('清单按花费金额降序，Top5 截断，总额与最贵单品正确', () => {
    const six = [
      item('a', 100),
      item('b', 200),
      item('c', 300),
      item('d', 400),
      item('e', 500),
      item('f', 600),
    ]
    const summary = buildSettlement({
      state: state({ a: 100, b: 1, c: 1, d: 1, e: 1, f: 1 }, 105),
      products: six,
      startedAt: 0,
      settledAt: 522_000, // 8 分 42 秒：不触发散财童子，落到量化之神
    })
    // a 花费 100×100 = 1 万元最高，f 单价最高
    expect(summary.lines.map((l) => l.product.id)).toEqual(['a', 'f', 'e', 'd', 'c', 'b'])
    expect(summary.top5).toHaveLength(5)
    expect(summary.top5[0].spentCents).toBe(1_000_000)
    expect(summary.totalSpentCents).toBe(1_000_000 + 60_000 + 50_000 + 40_000 + 30_000 + 20_000)
    expect(summary.mostExpensive?.id).toBe('f')
    expect(summary.durationMs).toBe(522_000)
    expect(summary.achievementId).toBe('quant') // 含 ¥100 的便宜货 → 非批发富豪；105 次操作 → 量化之神
  })

  it('用时 = settledAt − startedAt（显式传入，不取当前时间）', () => {
    const summary = buildSettlement({
      state: state({ jianbing: 1 }, 1),
      products: PRODUCTS,
      startedAt: 5_000,
      settledAt: 47_000,
    })
    expect(summary.durationMs).toBe(42_000)
  })
})

describe('formatDuration', () => {
  it('不足一分钟只显示秒', () => expect(formatDuration(42_000)).toBe('42 秒'))
  it('分秒组合', () => expect(formatDuration(222_000)).toBe('3 分 42 秒'))
  it('整分钟', () => expect(formatDuration(300_000)).toBe('5 分 0 秒'))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/spend-fortune/src/lib/settlement.ts`

```ts
import type { Product } from '../data/products'
import type { GameState } from './game-state'
import { CENTS_PER_YI } from './money'

export type AchievementId = 'monomaniac' | 'speedrun' | 'wholesale' | 'quant' | 'rational'

export interface AchievementMeta {
  name: string
  blurb: string
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementMeta> = {
  monomaniac: { name: '偏执狂企业家', blurb: '把全部身家押在同一件商品上' },
  speedrun: { name: '散财童子', blurb: '5 分钟内花光 3,000 亿' },
  wholesale: { name: '批发富豪', blurb: '只买 1 亿起步的大件' },
  quant: { name: '量化之神', blurb: '买卖操作超过 100 次' },
  rational: { name: '理性消费大师', blurb: '每一分钱都花得明明白白' },
}

/** 优先级写死 = 设计文档 §3 列举顺序，成就叠加时取最先命中 */
export const ACHIEVEMENT_PRIORITY: readonly AchievementId[] = [
  'monomaniac',
  'speedrun',
  'wholesale',
  'quant',
  'rational',
]

export const SPEEDRUN_MS = 5 * 60 * 1000
export const QUANT_OPS = 100
export const WHOLESALE_MIN_CENTS = CENTS_PER_YI

export interface SettlementInput {
  state: GameState
  products: readonly Product[]
  startedAt: number
  settledAt: number
}

function heldProducts(state: GameState, products: readonly Product[]): Product[] {
  return products.filter((product) => (state.holdings[product.id] ?? 0) > 0)
}

const CHECKS: Record<Exclude<AchievementId, 'rational'>, (held: Product[], input: SettlementInput) => boolean> = {
  monomaniac: (held) => held.length === 1,
  speedrun: (_held, input) => input.settledAt - input.startedAt < SPEEDRUN_MS,
  wholesale: (held) => held.length > 0 && held.every((p) => p.priceCents >= WHOLESALE_MIN_CENTS),
  quant: (_held, input) => input.state.opsCount >= QUANT_OPS,
}

export function determineAchievement(input: SettlementInput): AchievementId {
  const held = heldProducts(input.state, input.products)
  for (const id of ACHIEVEMENT_PRIORITY) {
    if (id === 'rational') break
    if (CHECKS[id](held, input)) return id
  }
  return 'rational'
}

export interface PurchaseLine {
  product: Product
  quantity: number
  spentCents: number
}

export interface SettlementSummary {
  achievementId: AchievementId
  durationMs: number
  /** 全部持有项，按花费金额降序（设计 §5：最贵的猎奇单品在顶部） */
  lines: PurchaseLine[]
  top5: PurchaseLine[]
  totalSpentCents: number
  /** 持有中单价最高的商品 */
  mostExpensive: Product | null
}

export function buildSettlement(input: SettlementInput): SettlementSummary {
  const lines = heldProducts(input.state, input.products)
    .map((product) => {
      const quantity = input.state.holdings[product.id] ?? 0
      return { product, quantity, spentCents: product.priceCents * quantity }
    })
    .sort((a, b) => b.spentCents - a.spentCents)
  const totalSpentCents = lines.reduce((sum, line) => sum + line.spentCents, 0)
  const mostExpensive = lines.reduce<Product | null>(
    (best, line) => (best === null || line.product.priceCents > best.priceCents ? line.product : best),
    null,
  )
  return {
    achievementId: determineAchievement(input),
    durationMs: input.settledAt - input.startedAt,
    lines,
    top5: lines.slice(0, 5),
    totalSpentCents,
    mostExpensive,
  }
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes === 0 ? `${seconds} 秒` : `${minutes} 分 ${seconds} 秒`
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/spend-fortune test && pnpm --filter @viral/spend-fortune typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 结算汇总与成就判定纯函数"
```

---

### Task 6: 签名元素 BalanceTicker 金色余额跳字

**Files:**
- Create: `sites/spend-fortune/src/components/balance-ticker.tsx`
- Test: `sites/spend-fortune/src/components/balance-ticker.test.tsx`

**Interfaces:**
- Consumes: `formatBalanceYuan`（Task 2）
- Produces: `<BalanceTicker balanceCents={number} />` — 烫金渐变大数字（`.gold-number .gold-shimmer`）；余额变化时单 rAF 循环 600ms 缓动从旧值滚到新值（每帧至多一次 setState，即帧级节流）；`prefers-reduced-motion` 直接跳终值；`aria-label="当前余额"`

- [ ] **Step 1: 写失败测试** `sites/spend-fortune/src/components/balance-ticker.test.tsx`

```tsx
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TOTAL_BALANCE_CENTS } from '../lib/money'
import { BalanceTicker } from './balance-ticker'

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia
  vi.restoreAllMocks()
})

describe('BalanceTicker', () => {
  it('初始渲染直接显示格式化余额，不启动动画', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    render(<BalanceTicker balanceCents={TOTAL_BALANCE_CENTS} />)
    expect(screen.getByLabelText('当前余额')).toHaveTextContent('¥300,000,000,000')
    expect(raf).not.toHaveBeenCalled()
  })

  it('余额变更时用 rAF 从旧值滚动到新值', () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb)
      return frames.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    const { rerender } = render(<BalanceTicker balanceCents={1_000_000} />)
    expect(screen.getByLabelText('当前余额')).toHaveTextContent('¥10,000')
    rerender(<BalanceTicker balanceCents={0} />)
    expect(frames.length).toBeGreaterThan(0)
    act(() => frames[0](0)) // 第一帧：起点
    act(() => frames[frames.length - 1](700)) // 超过 600ms：终点帧
    expect(screen.getByLabelText('当前余额')).toHaveTextContent('¥0')
  })

  it('prefers-reduced-motion 下变更直接跳到终值，不用 rAF', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const { rerender } = render(<BalanceTicker balanceCents={1_000_000} />)
    rerender(<BalanceTicker balanceCents={0} />)
    expect(screen.getByLabelText('当前余额')).toHaveTextContent('¥0')
    expect(raf).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/spend-fortune/src/components/balance-ticker.tsx`

```tsx
import { useEffect, useRef, useState } from 'react'
import { formatBalanceYuan } from '../lib/money'

const TICK_DURATION_MS = 600

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

interface Props {
  balanceCents: number
}

export function BalanceTicker({ balanceCents }: Props) {
  const [shownCents, setShownCents] = useState(balanceCents)
  const shownRef = useRef(balanceCents)
  const rafRef = useRef(0)

  useEffect(() => {
    if (balanceCents === shownRef.current) return
    const from = shownRef.current
    const to = balanceCents
    if (prefersReducedMotion()) {
      shownRef.current = to
      setShownCents(to)
      return
    }
    let start: number | null = null
    const step = (t: number) => {
      if (start === null) start = t
      const progress = Math.min(1, (t - start) / TICK_DURATION_MS)
      const eased = 1 - (1 - progress) ** 3 // ease-out：先快后慢，钞票哗哗掉的手感
      const value = Math.round(from + (to - from) * eased)
      shownRef.current = value
      setShownCents(value) // 每帧至多一次 setState = 帧级节流
      if (progress < 1) rafRef.current = window.requestAnimationFrame(step)
    }
    rafRef.current = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(rafRef.current)
  }, [balanceCents])

  return (
    <p aria-label="当前余额" className="gold-number gold-shimmer text-4xl font-black tracking-tight">
      ¥{formatBalanceYuan(shownCents)}
    </p>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 金色余额跳字组件"
```

---

### Task 7: 商品卡 ProductCard + 商店屏 ShopScreen

**Files:**
- Create: `sites/spend-fortune/src/components/product-card.tsx`, `sites/spend-fortune/src/components/shop-screen.tsx`
- Test: `sites/spend-fortune/src/components/product-card.test.tsx`, `sites/spend-fortune/src/components/shop-screen.test.tsx`

**Interfaces:**
- Consumes: `Product`/`PRODUCTS`（Task 3）、`formatPrice`（Task 2）、`GameState`/`GameAction`（Task 4）、`BalanceTicker`（Task 6）
- Produces:
  - `<ProductCard product quantity canBuy onBuy onSell />` — emoji + 名称 + 格式化单价 + priceNote + 买入/卖出按钮 + 持有数量角标；`canBuy=false` 买入禁用，`quantity===0` 卖出禁用；按钮 `aria-label` 为「买入 {名称}」「卖出 {名称}」
  - `<ShopScreen state onAction products? />` — 吸顶余额跳字 + 按分类分组的两列商品网格；`canBuy = 余额 ≥ 单价`；`products` 默认 `PRODUCTS`，可注入小目录便于测试

- [ ] **Step 1: 写失败测试**

`sites/spend-fortune/src/components/product-card.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Product } from '../data/products'
import { ProductCard } from './product-card'

const a380: Product = {
  id: 'a380',
  name: '一架空客 A380',
  priceCents: 320_000_000_000,
  emoji: '🛩️',
  category: '亿级资产',
  priceNote: '官方目录价约 4.45 亿美元折算',
}

describe('ProductCard', () => {
  it('渲染名称、emoji、亿/万格式化单价与价格来源备注', () => {
    render(<ProductCard product={a380} quantity={0} canBuy onBuy={() => {}} onSell={() => {}} />)
    expect(screen.getByText('一架空客 A380')).toBeInTheDocument()
    expect(screen.getByText('🛩️')).toBeInTheDocument()
    expect(screen.getByText('¥32亿')).toBeInTheDocument()
    expect(screen.getByText('官方目录价约 4.45 亿美元折算')).toBeInTheDocument()
  })

  it('买不起时买入禁用', () => {
    render(
      <ProductCard product={a380} quantity={0} canBuy={false} onBuy={() => {}} onSell={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '买入 一架空客 A380' })).toBeDisabled()
  })

  it('持有 0 时卖出禁用且不显示数量角标', () => {
    render(<ProductCard product={a380} quantity={0} canBuy onBuy={() => {}} onSell={() => {}} />)
    expect(screen.getByRole('button', { name: '卖出 一架空客 A380' })).toBeDisabled()
    expect(screen.queryByText(/×/)).not.toBeInTheDocument()
  })

  it('持有 >0 显示角标；点击买入/卖出触发回调', async () => {
    const onBuy = vi.fn()
    const onSell = vi.fn()
    render(<ProductCard product={a380} quantity={2} canBuy onBuy={onBuy} onSell={onSell} />)
    expect(screen.getByText('×2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '买入 一架空客 A380' }))
    await userEvent.click(screen.getByRole('button', { name: '卖出 一架空客 A380' }))
    expect(onBuy).toHaveBeenCalledOnce()
    expect(onSell).toHaveBeenCalledOnce()
  })
})
```

`sites/spend-fortune/src/components/shop-screen.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Product } from '../data/products'
import { TOTAL_BALANCE_CENTS } from '../lib/money'
import { ShopScreen } from './shop-screen'

const jianbing: Product = {
  id: 'jianbing',
  name: '煎饼果子',
  priceCents: 500,
  emoji: '🥞',
  category: '小吃日常',
  priceNote: '街头摊常见单价',
}
const a380: Product = {
  id: 'a380',
  name: '一架空客 A380',
  priceCents: 320_000_000_000,
  emoji: '🛩️',
  category: '亿级资产',
  priceNote: '官方目录价折算',
}
const products = [jianbing, a380]

describe('ShopScreen', () => {
  it('渲染余额跳字与分类标题', () => {
    render(
      <ShopScreen
        state={{ balanceCents: TOTAL_BALANCE_CENTS, holdings: {}, opsCount: 0 }}
        onAction={() => {}}
        products={products}
      />,
    )
    expect(screen.getByLabelText('当前余额')).toHaveTextContent('¥300,000,000,000')
    expect(screen.getByText(/小吃日常/)).toBeInTheDocument()
    expect(screen.getByText(/亿级资产/)).toBeInTheDocument()
  })

  it('点击买入派发 buy action', async () => {
    const onAction = vi.fn()
    render(
      <ShopScreen
        state={{ balanceCents: TOTAL_BALANCE_CENTS, holdings: {}, opsCount: 0 }}
        onAction={onAction}
        products={products}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '买入 煎饼果子' }))
    expect(onAction).toHaveBeenCalledWith({ type: 'buy', product: jianbing })
  })

  it('余额不足的商品买入禁用、买得起的可用；持有数量来自 state', () => {
    render(
      <ShopScreen
        state={{ balanceCents: 600, holdings: { a380: 1 }, opsCount: 3 }}
        onAction={() => {}}
        products={products}
      />,
    )
    expect(screen.getByRole('button', { name: '买入 煎饼果子' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '买入 一架空客 A380' })).toBeDisabled()
    expect(screen.getByText('×1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/spend-fortune/src/components/product-card.tsx`：

```tsx
import type { Product } from '../data/products'
import { formatPrice } from '../lib/money'

interface Props {
  product: Product
  quantity: number
  canBuy: boolean
  onBuy: () => void
  onSell: () => void
}

export function ProductCard({ product, quantity, canBuy, onBuy, onSell }: Props) {
  return (
    <article className="flex flex-col gap-1.5 rounded-xl border border-[#1e8f52]/40 bg-black/40 p-3">
      <div className="flex items-start justify-between">
        <span className="text-3xl" aria-hidden>
          {product.emoji}
        </span>
        {quantity > 0 && (
          <span className="rounded-full bg-[#f7c948] px-2 text-sm font-bold text-black">
            ×{quantity}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium">{product.name}</h3>
      <p className="gold-number text-lg font-bold">{formatPrice(product.priceCents)}</p>
      <p className="text-sm leading-snug text-[#9fd8b4]/80">{product.priceNote}</p>
      <div className="mt-auto flex gap-2 pt-1">
        <button
          type="button"
          aria-label={`买入 ${product.name}`}
          disabled={!canBuy}
          onClick={onBuy}
          className="flex-1 rounded-lg bg-[#1e8f52] py-2 text-sm font-bold text-white disabled:opacity-30"
        >
          买入
        </button>
        <button
          type="button"
          aria-label={`卖出 ${product.name}`}
          disabled={quantity === 0}
          onClick={onSell}
          className="flex-1 rounded-lg border border-[#ff3d8b] py-2 text-sm font-bold text-[#ff3d8b] disabled:opacity-30"
        >
          卖出
        </button>
      </div>
    </article>
  )
}
```

`sites/spend-fortune/src/components/shop-screen.tsx`：

```tsx
import { PRODUCTS, type Product } from '../data/products'
import type { GameAction, GameState } from '../lib/game-state'
import { BalanceTicker } from './balance-ticker'
import { ProductCard } from './product-card'

interface Props {
  state: GameState
  onAction: (action: GameAction) => void
  /** 默认全量商品库；测试可注入小目录 */
  products?: readonly Product[]
}

export function ShopScreen({ state, onAction, products = PRODUCTS }: Props) {
  const categories = [...new Set(products.map((p) => p.category))]
  return (
    <section className="flex flex-col gap-6">
      <header className="sticky top-0 z-10 -mx-4 bg-[#0b0d0b]/95 px-4 py-3 backdrop-blur">
        <p className="text-sm text-[#9fd8b4]">你的余额 💰</p>
        <BalanceTicker balanceCents={state.balanceCents} />
      </header>
      {categories.map((category) => (
        <div key={category} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-widest text-[#3dd6ff]">💸 {category}</h2>
          <div className="grid grid-cols-2 gap-3">
            {products
              .filter((product) => product.category === category)
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={state.holdings[product.id] ?? 0}
                  canBuy={state.balanceCents >= product.priceCents}
                  onBuy={() => onAction({ type: 'buy', product })}
                  onSell={() => onAction({ type: 'sell', product })}
                />
              ))}
          </div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 商品卡与商店屏"
```

---

### Task 8: 结算屏 ResultScreen

**Files:**
- Create: `sites/spend-fortune/src/components/result-screen.tsx`
- Test: `sites/spend-fortune/src/components/result-screen.test.tsx`

**Interfaces:**
- Consumes: `SettlementSummary`/`ACHIEVEMENTS`/`formatDuration`（Task 5）、`formatPrice`（Task 2）
- Produces: `<ResultScreen summary onRestart>{children}</ResultScreen>` — 「你花光了首富的钱」+ 烫金称号 + 用时 + 共花掉总额 + Top5 清单（花费降序）+ 最贵单品 + 「再花一次」按钮；`children` 为保存按钮插槽（Task 9 的 SaveCardButton 由 App 注入，本组件不依赖它）

- [ ] **Step 1: 写失败测试** `sites/spend-fortune/src/components/result-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Product } from '../data/products'
import type { SettlementSummary } from '../lib/settlement'
import { ResultScreen } from './result-screen'

const fab: Product = {
  id: 'chip-fab',
  name: '一座先进晶圆厂',
  priceCents: 10_000_000_000_000,
  emoji: '🏭',
  category: '超级工程',
  priceNote: '公开报道量级',
}
const jianbing: Product = {
  id: 'jianbing',
  name: '煎饼果子',
  priceCents: 500,
  emoji: '🥞',
  category: '小吃日常',
  priceNote: '街头摊单价',
}

const lines = [
  { product: fab, quantity: 2, spentCents: 20_000_000_000_000 },
  { product: jianbing, quantity: 20_000_000_000, spentCents: 10_000_000_000_000 }, // 200 亿个 × ¥5
]

const summary: SettlementSummary = {
  achievementId: 'quant',
  durationMs: 222_000,
  lines,
  top5: lines,
  totalSpentCents: 30_000_000_000_000,
  mostExpensive: fab,
}

describe('ResultScreen', () => {
  it('渲染称号、用时与总额', () => {
    render(<ResultScreen summary={summary} onRestart={() => {}} />)
    expect(screen.getByText('你花光了首富的钱')).toBeInTheDocument()
    expect(screen.getByText('量化之神')).toBeInTheDocument()
    expect(screen.getByText('3 分 42 秒')).toBeInTheDocument()
    expect(screen.getAllByText(/¥3,000亿/).length).toBeGreaterThan(0)
  })

  it('渲染 Top5 清单（花费降序）与最贵单品', () => {
    render(<ResultScreen summary={summary} onRestart={() => {}} />)
    const list = screen.getByLabelText('购物清单 Top5')
    const items = list.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain('一座先进晶圆厂')
    expect(items[1].textContent).toContain('煎饼果子')
    expect(screen.getByText(/最贵单品/).textContent).toContain('一座先进晶圆厂')
  })

  it('再花一次触发 onRestart；children 插槽渲染', async () => {
    const onRestart = vi.fn()
    render(
      <ResultScreen summary={summary} onRestart={onRestart}>
        <button>保存我的购物清单卡</button>
      </ResultScreen>,
    )
    expect(screen.getByText('保存我的购物清单卡')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '再花一次' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/spend-fortune/src/components/result-screen.tsx`

```tsx
import type { ReactNode } from 'react'
import { formatPrice } from '../lib/money'
import { ACHIEVEMENTS, formatDuration, type SettlementSummary } from '../lib/settlement'

interface Props {
  summary: SettlementSummary
  onRestart: () => void
  children?: ReactNode
}

export function ResultScreen({ summary, onRestart, children }: Props) {
  const meta = ACHIEVEMENTS[summary.achievementId]
  return (
    <section className="flex flex-col gap-6">
      <header className="text-center">
        <p className="text-sm tracking-widest text-[#9fd8b4]">🤑 你花光了首富的钱 🤑</p>
        <h1 className="gold-number gold-shimmer mx-auto mt-2 w-fit text-4xl font-black">
          {meta.name}
        </h1>
        <p className="mt-1 text-sm text-[#f5f2e6]/80">{meta.blurb}</p>
        <p className="mt-3 text-sm">
          用时 <span className="font-bold text-[#f7c948]">{formatDuration(summary.durationMs)}</span>
          ，共花掉{' '}
          <span className="font-bold text-[#f7c948]">{formatPrice(summary.totalSpentCents)}</span>
        </p>
      </header>
      <ol className="flex flex-col gap-2" aria-label="购物清单 Top5">
        {summary.top5.map((line) => (
          <li
            key={line.product.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#1e8f52]/40 bg-black/40 px-3 py-2"
          >
            <span className="text-sm">
              {line.product.emoji} {line.product.name} × {line.quantity.toLocaleString('en-US')}
            </span>
            <span className="gold-number shrink-0 text-sm font-bold">
              {formatPrice(line.spentCents)}
            </span>
          </li>
        ))}
      </ol>
      {summary.mostExpensive && (
        <p className="text-center text-sm text-[#9fd8b4]">
          最贵单品：{summary.mostExpensive.emoji} {summary.mostExpensive.name}（
          {formatPrice(summary.mostExpensive.priceCents)}）
        </p>
      )}
      <div className="flex flex-col gap-3">
        {children}
        <button type="button" onClick={onRestart} className="py-2 text-sm text-[#9fd8b4]">
          再花一次
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 结算屏"
```

---

### Task 9: 购物清单卡绘制 + 保存流程

**Files:**
- Create: `sites/spend-fortune/src/card/draw-list-card.ts`, `sites/spend-fortune/src/components/save-card-button.tsx`, `sites/spend-fortune/src/components/long-press-overlay.tsx`
- Test: `sites/spend-fortune/src/card/draw-list-card.test.ts`, `sites/spend-fortune/src/components/save-card-button.test.tsx`

**Interfaces:**
- Consumes: `renderCard`/`saveCard`/`track`/`DrawFn`（shared，已存在零改动）、`SettlementSummary`/`ACHIEVEMENTS`/`formatDuration`（Task 5）、`formatPrice`（Task 2）、`installCanvasStub`（Task 1）
- Produces:
  - `makeListCardDraw(summary: SettlementSummary): DrawFn` — 1080×1440 购物清单卡：黑底 + 美元绿光带 + 💵✨ 贴纸角标 + 烫金称号 + 用时 + Top5（按金额降序，emoji 名称 × 数量 | 金额右对齐）+ 金色分隔线 + 「共花掉 ¥3,000亿」 + 品牌条「花光首富的钱 · viral-sites」
  - `<SaveCardButton summary={SettlementSummary} />` — 点击：renderCard → saveCard；成功 `track('save_image')`；long-press 策略弹 `<LongPressOverlay dataUrl onClose />`；异常 `track('export_error')` 并提示「保存失败了，直接截图也一样」

- [ ] **Step 1: 写失败测试**

`sites/spend-fortune/src/card/draw-list-card.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Product } from '../data/products'
import type { SettlementSummary } from '../lib/settlement'
import { makeListCardDraw } from './draw-list-card'

const fab: Product = {
  id: 'chip-fab',
  name: '一座先进晶圆厂',
  priceCents: 10_000_000_000_000,
  emoji: '🏭',
  category: '超级工程',
  priceNote: '公开报道量级',
}

const summary: SettlementSummary = {
  achievementId: 'monomaniac',
  durationMs: 222_000,
  lines: [{ product: fab, quantity: 3, spentCents: 30_000_000_000_000 }],
  top5: [{ product: fab, quantity: 3, spentCents: 30_000_000_000_000 }],
  totalSpentCents: 30_000_000_000_000,
  mostExpensive: fab,
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

describe('makeListCardDraw', () => {
  it('绘制背景/光带/分隔线（fillRect ≥ 3）', () => {
    const ctx = fakeCtx()
    makeListCardDraw(summary)(ctx, { width: 1080, height: 1440 })
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('文字包含称号、用时、清单行、总额与品牌条', () => {
    const ctx = fakeCtx()
    makeListCardDraw(summary)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(texts.some((t) => t.includes('偏执狂企业家'))).toBe(true)
    expect(texts.some((t) => t.includes('用时 3 分 42 秒'))).toBe(true)
    expect(texts.some((t) => t.includes('一座先进晶圆厂 × 3'))).toBe(true)
    expect(texts.some((t) => t.includes('共花掉 ¥3,000亿'))).toBe(true)
    expect(texts.some((t) => t.includes('花光首富的钱 · viral-sites'))).toBe(true)
  })
})
```

`sites/spend-fortune/src/components/save-card-button.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { Product } from '../data/products'
import type { SettlementSummary } from '../lib/settlement'
import { SaveCardButton } from './save-card-button'

const fab: Product = {
  id: 'chip-fab',
  name: '一座先进晶圆厂',
  priceCents: 10_000_000_000_000,
  emoji: '🏭',
  category: '超级工程',
  priceNote: '公开报道量级',
}

const summary: SettlementSummary = {
  achievementId: 'monomaniac',
  durationMs: 60_000,
  lines: [{ product: fab, quantity: 3, spentCents: 30_000_000_000_000 }],
  top5: [{ product: fab, quantity: 3, spentCents: 30_000_000_000_000 }],
  totalSpentCents: 30_000_000_000_000,
  mostExpensive: fab,
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
    render(<SaveCardButton summary={summary} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的购物清单卡' }))
    expect(umamiSpy).toHaveBeenCalledWith('save_image', undefined)
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton summary={summary} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的购物清单卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton summary={summary} />)
    await userEvent.click(screen.getByRole('button', { name: '保存我的购物清单卡' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/spend-fortune/src/card/draw-list-card.ts`：

```ts
import type { DrawFn } from '@viral/shared'
import { formatPrice } from '../lib/money'
import { ACHIEVEMENTS, formatDuration, type SettlementSummary } from '../lib/settlement'

/** 与 index.css 色板一致（canvas 无法读 CSS 变量，此处复写常量） */
const COLORS = {
  bg: '#0b0d0b',
  green: '#1e8f52',
  greenLight: '#9fd8b4',
  gold: '#f7c948',
  goldDeep: '#c9971c',
  paper: '#f5f2e6',
} as const

const BRAND_TEXT = '花光首富的钱 · viral-sites'
const FONT = '-apple-system, "PingFang SC", sans-serif'

export function makeListCardDraw(summary: SettlementSummary): DrawFn {
  return (ctx, size) => {
    // 底：黑 + 顶部美元绿光带
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.globalAlpha = 0.18
    ctx.fillStyle = COLORS.green
    ctx.fillRect(0, 0, size.width, 320)
    ctx.globalAlpha = 1

    // Y2K 贴纸角标
    ctx.font = `64px ${FONT}`
    ctx.textAlign = 'left'
    ctx.fillText('💵', 60, 116)
    ctx.textAlign = 'right'
    ctx.fillText('✨', size.width - 60, 116)

    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.greenLight
    ctx.font = `600 44px ${FONT}`
    ctx.fillText('我花光了首富的钱', size.width / 2, 190)

    const meta = ACHIEVEMENTS[summary.achievementId]
    ctx.fillStyle = COLORS.gold
    ctx.font = `900 104px ${FONT}`
    ctx.fillText(meta.name, size.width / 2, 330)

    ctx.fillStyle = COLORS.paper
    ctx.font = `400 40px ${FONT}`
    ctx.fillText(`用时 ${formatDuration(summary.durationMs)}`, size.width / 2, 410)

    // Top5 清单（按花费金额降序，最贵的猎奇单品在顶部）
    let y = 540
    for (const line of summary.top5) {
      ctx.font = `400 40px ${FONT}`
      ctx.textAlign = 'left'
      ctx.fillStyle = COLORS.paper
      ctx.fillText(
        `${line.product.emoji} ${line.product.name} × ${line.quantity.toLocaleString('en-US')}`,
        90,
        y,
      )
      ctx.textAlign = 'right'
      ctx.fillStyle = COLORS.gold
      ctx.fillText(formatPrice(line.spentCents), size.width - 90, y)
      y += 92
    }

    // 金色分隔线 + 总额
    ctx.fillStyle = COLORS.goldDeep
    ctx.fillRect(90, y, size.width - 180, 4)
    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.gold
    ctx.font = `700 64px ${FONT}`
    ctx.fillText(`共花掉 ${formatPrice(summary.totalSpentCents)}`, size.width / 2, y + 120)

    // 品牌条
    ctx.fillStyle = COLORS.greenLight
    ctx.font = `400 30px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 60)
  }
}
```

`sites/spend-fortune/src/components/long-press-overlay.tsx`：

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
      <img src={dataUrl} alt="购物清单卡" className="max-h-[70vh] w-auto rounded-lg" />
      <p className="text-sm text-white">长按图片保存</p>
      <p className="text-sm text-[#9fd8b4]">点击空白处关闭</p>
    </div>
  )
}
```

`sites/spend-fortune/src/components/save-card-button.tsx`：

```tsx
import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import type { SettlementSummary } from '../lib/settlement'
import { makeListCardDraw } from '../card/draw-list-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  summary: SettlementSummary
}

export function SaveCardButton({ summary }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeListCardDraw(summary))
      saveCard(canvas, {
        filename: 'spend-fortune.png',
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
        className="gold-shimmer rounded-lg bg-gradient-to-b from-[#f7c948] to-[#c9971c] py-3 font-bold text-black"
      >
        保存我的购物清单卡
      </button>
      {failed && <p className="text-center text-sm text-[#9fd8b4]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/spend-fortune test && pnpm --filter @viral/spend-fortune typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): 购物清单卡绘制与保存流程"
```

---

### Task 10: App 组装（状态机 + generate/achievement 埋点 + 页脚免责声明）

**Files:**
- Modify: `sites/spend-fortune/src/app.tsx`（替换 Task 1 占位）
- Test: `sites/spend-fortune/src/app.test.tsx`

**Interfaces:**
- Consumes: `PRODUCTS`/`cheapestPriceCents`（Task 3）、`gameReducer`/`initialGameState`/`isSettled`（Task 4）、`buildSettlement`（Task 5）、`ShopScreen`（Task 7）、`ResultScreen`（Task 8）、`SaveCardButton`（Task 9）、`track`（shared）
- Produces: `<App />` — `{ phase: 'shop'; game; startedAt } | { phase: 'result'; summary }` 状态机；计时起点 = 第一次买卖操作；结算跳转处一次性上报 `generate`（带 `duration_seconds`）与 `achievement`（带 `id`）；页脚免责声明常驻；**`Date.now()` 只允许出现在本文件**

- [ ] **Step 1: 写失败测试** `sites/spend-fortune/src/app.test.tsx`

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

  const buyFab = () =>
    userEvent.click(screen.getByRole('button', { name: '买入 一座先进晶圆厂' }))

  it('初始：显示满余额与页脚免责声明', () => {
    render(<App />)
    expect(screen.getByLabelText('当前余额')).toHaveTextContent('¥300,000,000,000')
    expect(screen.getByText(/首富为虚构人物，价格为公开资料估算/)).toBeInTheDocument()
  })

  it('三次买入晶圆厂恰好花光 → 结算：偏执狂企业家 + generate/achievement 埋点', async () => {
    // 用可控变量 mock Date.now（比 mockReturnValueOnce 队列稳：不怕 React 内部也调 Date.now）
    let nowValue = 1_000
    vi.spyOn(Date, 'now').mockImplementation(() => nowValue)
    render(<App />)
    await buyFab() // 第一次操作：计时起点 1000
    nowValue = 2_000
    await buyFab()
    nowValue = 61_000
    await buyFab() // 结算：61000 − 1000 = 60 秒
    expect(screen.getByText('偏执狂企业家')).toBeInTheDocument()
    expect(screen.getByText('1 分 0 秒')).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('generate', { duration_seconds: 60 })
    expect(umamiSpy).toHaveBeenCalledWith('achievement', { id: 'monomaniac' })
  })

  it('再花一次回到商店且余额复满', async () => {
    render(<App />)
    await buyFab()
    await buyFab()
    await buyFab()
    await userEvent.click(screen.getByRole('button', { name: '再花一次' }))
    expect(screen.getByLabelText('当前余额')).toHaveTextContent('¥300,000,000,000')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/spend-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/spend-fortune/src/app.tsx`

```tsx
import { useMemo, useState } from 'react'
import { track } from '@viral/shared'
import { cheapestPriceCents, PRODUCTS } from './data/products'
import {
  gameReducer,
  initialGameState,
  isSettled,
  type GameAction,
  type GameState,
} from './lib/game-state'
import { buildSettlement, type SettlementSummary } from './lib/settlement'
import { ResultScreen } from './components/result-screen'
import { SaveCardButton } from './components/save-card-button'
import { ShopScreen } from './components/shop-screen'

type Phase =
  | { phase: 'shop'; game: GameState; startedAt: number | null }
  | { phase: 'result'; summary: SettlementSummary }

export function App() {
  const [state, setState] = useState<Phase>({
    phase: 'shop',
    game: initialGameState(),
    startedAt: null,
  })
  const cheapest = useMemo(() => cheapestPriceCents(PRODUCTS), [])

  const handleAction = (action: GameAction) => {
    if (state.phase !== 'shop') return
    const next = gameReducer(state.game, action)
    if (next === state.game) return // 非法操作，无变化
    // Date.now() 只允许出现在组装层这一处；计时起点 = 第一次操作
    const now = Date.now()
    const startedAt = state.startedAt ?? now
    if (isSettled(next, cheapest)) {
      const summary = buildSettlement({
        state: next,
        products: PRODUCTS,
        startedAt,
        settledAt: now,
      })
      track('generate', { duration_seconds: Math.round(summary.durationMs / 1000) })
      track('achievement', { id: summary.achievementId })
      setState({ phase: 'result', summary })
    } else {
      setState({ phase: 'shop', game: next, startedAt })
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <div className="flex-1">
        {state.phase === 'shop' ? (
          <ShopScreen state={state.game} onAction={handleAction} />
        ) : (
          <ResultScreen
            summary={state.summary}
            onRestart={() =>
              setState({ phase: 'shop', game: initialGameState(), startedAt: null })
            }
          >
            <SaveCardButton summary={state.summary} />
          </ResultScreen>
        )}
      </div>
      <footer className="pt-8 text-center text-sm leading-relaxed text-[#9fd8b4]/70">
        首富为虚构人物，价格为公开资料估算，仅供娱乐 · 机制致敬海外经典网页游戏
        <br />
        所有数据在本地计算，不上传不存储
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + 全仓核验**

Run: `pnpm -r test && pnpm -r typecheck && pnpm --filter @viral/spend-fortune build`
Expected: 全 PASS，构建成功

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(spend-fortune): App 状态机组装与埋点"
```

---

### Task 11: 上线准备（gzip 预算 + 价格人工核对 + 部署 + 手工验收）

**Files:**
- Modify: `README.md`（路线图状态表 09 行 → 已上线）、`sites/spend-fortune/index.html`（umami website-id）、`sites/spend-fortune/src/data/products.ts`（价格核对勘误，如有）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: 体积预算核验**

Run: `pnpm --filter @viral/spend-fortune build`
查看 vite 输出的 gzip 列：JS + CSS gzip 合计须 < 100KB。超了先查 react-dom 之外是否混入多余依赖（`pnpm --filter @viral/spend-fortune list --depth 0`）。

- [ ] **Step 2: 本地手机真机冒烟**

Run: `pnpm --filter @viral/spend-fortune dev --host`
手机连同一 Wi-Fi 打开 `http://<局域网IP>:5173`，走一遍：买入若干件 → 余额跳字流畅 → 卖出回退 → 买到余额 < ¥5 触发结算 → 结算页称号/清单正确 → 保存卡片。

- [ ] **Step 3: 【手工·需用户】全库 60 项商品价格人工核对（上线 gate，不可跳过）**

被扒错价是本站最大口碑风险（设计 §8）。执行者停下来，把 `src/data/products.ts` 的 60 项逐条列给用户核对：
- 每项按 `priceNote` 声明的口径查一遍公开资料（新闻/官网/成交纪录），确认价格量级正确
- 有出入的当场改 `products.ts`（改完必须重跑 `pnpm --filter @viral/spend-fortune test`，目录 lint 保证改动不破坏五数量级覆盖与最低价 ¥5）
- 特别核对已知高危项：A380（设计文档写 ¥120 亿，公开目录价约 4.45 亿美元 ≈ ¥32 亿，本计划按 32 亿落库——若用户坚持设计文档口径需同步改 priceNote）
- 用户确认「全库过完」后才能进入下一步

- [ ] **Step 4: 【手工·需用户】创建 umami 站点**

在 umami 后台（与 life-grid 同一账号）Add website → 拿到 website-id → 替换 `sites/spend-fortune/index.html` 里的 `TO_BE_FILLED`。此步骤需要用户账号，执行者停下来向用户要。

- [ ] **Step 5: 【手工·需用户】部署 Cloudflare Pages**

```bash
pnpm dlx wrangler login        # 需要用户浏览器授权
pnpm dlx wrangler pages project create spend-fortune --production-branch main
pnpm --filter @viral/spend-fortune build
pnpm dlx wrangler pages deploy sites/spend-fortune/dist --project-name spend-fortune
```

产出 `https://spend-fortune.pages.dev`。

- [ ] **Step 6: 四环境 + 动效手工验收**

- [ ] iPhone 微信内打开 → 保存走长按路径，图能存到相册
- [ ] 安卓微信内打开 → 同上
- [ ] iOS Safari → 长按路径
- [ ] 桌面 Chrome → 直接下载
- [ ] 低端安卓机连点买入：余额跳字不掉帧（设计 §7 手工验收项）
- [ ] 系统开启「减弱动态效果」后：跳字直接跳变、shimmer 扫光停止
- [ ] umami 后台能看到 pageview / generate / achievement / save_image 事件

- [ ] **Step 7: 更新 README 状态并提交推送**

README 路线图表中 09 行状态改为 `🚀 已上线（spend-fortune.pages.dev）`。

```bash
git add -A && git commit -m "chore: spend-fortune 上线，更新状态与 umami 配置" && git push
```

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §3 玩法（余额跳字 Task 6、商品网格买卖/持有/禁用 Task 7、结算触发「余额 < 全场最低价」Task 4/10）、§3 成就四彩蛋 + 默认称号与叠加优先级（Task 5，优先级 = 设计文档列举顺序并测试写死）、§4 商品库五数量级 + priceNote 必填 + 分整数运算（Task 2/3）、§5 购物清单卡（称号+用时+Top5 金额降序+总额+品牌条，Task 9）、§6 埋点三事件 + achievement + duration（Task 10）与 export_error（Task 9）、§7 测试（结算/成就纯函数单测 Task 5、商品库构建期 lint Task 3、跳字不掉帧手工验收 Task 11）、§8 风险（价格人工核对 gate Task 11、页脚免责声明 Task 10）。00a 风格（Y2K 金钱极繁色板、防模板脸条款、与 12 号站区分、reduced-motion）落在 Global Constraints + Task 1/6。
- **设计文档矛盾与本计划裁决**（实施者无需再决策）：
  1. §4 要求商品库「100+ 项」，本计划按任务指令落 60 项（五数量级每级 ≥8 项，lint 强制）；扩到 100+ 列入上线后迭代，不阻塞首发。
  2. §1 写「¥120 亿的 A380」，但空客官方目录价约 4.45 亿美元 ≈ ¥32 亿——设计文档自身即「被扒错价」样本；本计划按 ¥32 亿落库并在 Task 11 手工核对步骤显式标注。
  3. §3「不出现任何真实人名与企业名」与 §8「页脚注明灵感来源」（原版名称含真实人名）措辞冲突；裁决：页脚写「机制致敬海外经典网页游戏」不点名。商品名沿用品牌（帕拉梅拉等）——§4 自身举例即品牌名，故该条款只约束「首富」形象。
  4. §3 结算显示「用时」但未定义计时起点；裁决：起点 = 第一次买卖操作时刻（避免用户停在首屏刷时长），`startedAt`/`settledAt` 显式传参可测。
  5. 结算是否可逆未定义；裁决：结算不可逆（进入结算页即定格），提供「再花一次」重置重玩，与成就系统的重玩动机一致。
- **占位符扫描**：无 TBD/TODO；`TO_BE_FILLED`（umami website-id）与 life-grid 计划同款，是 Task 11 手工步骤的既定替换目标，非占位符；Task 11 三个【手工·需用户】步骤明确标注需用户参与。
- **数值核验**：`TOTAL_BALANCE_CENTS = 3×10¹³ < 2⁵³`（Task 2 断言测试）；晶圆厂 ¥1,000 亿 × 3 = ¥3,000 亿恰好清零（Task 4/10 测试利用此构造确定性结算路径）；60 项 = 12+12+12+14+10，五数量级带划分与商品定价逐项核对无越界；最低价 ¥5 = 500 分 = 结算阈值。
- **类型一致性**：`Product`/`ProductCategory`（Task 3 定义，4/5/7/8/9 消费）、`GameState`/`GameAction`（Task 4 定义，5/7/10 消费）、`SettlementSummary`/`AchievementId`（Task 5 定义，8/9/10 消费）、`DrawFn`（shared 既有，Task 9 消费）、`formatPrice`/`formatBalanceYuan`（Task 2 定义，6/7/8/9 消费）签名逐一核对一致；shared 包零改动。
- **测试自查**：Task 5 曾有一处夹具用时 222 秒落入散财童子区间导致断言与优先级矛盾，已改为 522 秒并加注释；BalanceTicker 测试用捕获 rAF 回调手动推帧，不依赖真实时钟；App 测试用 `Date.now` mock 序列显式控制用时 = 60 秒。
