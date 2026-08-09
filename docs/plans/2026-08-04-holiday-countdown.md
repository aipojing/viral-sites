# 放假倒计时（10 · A 级）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有工厂基建（`@viral/shared`）上完成第 10 站「放假倒计时」到可部署状态：主屏大数字倒计时 + 调休锐评、全年假期总账（名义/调休/净赚）、最优请假攻略、「我的假期余额」年览卡。年度数据 JSON 驱动，构建期 lint，上线前节假日数据人工校对是硬 gate。

**Architecture:** `sites/holiday-countdown` 是独立 Vite React 应用，只依赖 `@viral/shared`（renderCard / saveCard / track）。数据层：`src/data/holidays-2026.json` 单文件承载全年假期 + 调休 + 锐评，`validateHolidayData` 在构建期（build 脚本前置 vitest run）把关。计算层全部为显式传 `now: Date` 的纯函数，内部统一换算成「UTC+8 日序号」做日期运算，与运行环境时区彻底解耦。UI 层是无输入的单页（hero → 总览表 → 攻略区 → 保存卡片），`new Date()` 只允许出现在 App 组装层一处。TDD：每个纯函数与组件先写失败测试。

**Tech Stack:** pnpm workspace · Vite 8 · React 19 · TypeScript(strict) · Tailwind v4 · Vitest 3 + Testing Library(jsdom, globals) · Cloudflare Pages（\_worker.js 同源代理 umami 上报） · umami

## Global Constraints

（来自 [10-holiday-countdown.md](../10-holiday-countdown.md)、[00-factory-design.md](../00-factory-design.md)、[00a-style-map.md](../00a-style-map.md) 与 life-grid 实施验证，所有任务默认遵守）

- **工程**：包名 `@viral/holiday-countdown`，目录 `sites/holiday-countdown`；只依赖 `@viral/shared`；vitest `globals: true` + `setupFiles: ['./test/setup.ts']`；vitest@^3、@testing-library/jest-dom@^6（与 life-grid 对齐）；测试命令统一 `pnpm --filter @viral/holiday-countdown test`
- **体积**：首屏资源 gzip 后 < 100KB；不引入日期库（自写 UTC+8 日序号工具即可）、不引入 UI 组件库、不打包 webfont（大字报靠系统黑体 900 字重）
- **时区（本站关键约束）**：一切「今天 / 还有几天」以 UTC+8 为准，与浏览器本地时区无关。实现手段：`utc8DayNumber(now)` 把任意时刻折算成北京时间当日的日序号（1970-01-01 为第 0 天），所有比较都在日序号上做。涉及「今天」的函数一律显式传 `now: Date`，`new Date()` 只允许出现在 `app.tsx` 组装层一处
- **数据**：年度数据 JSON 单文件（`holidays-2026.json`），字段 `{ id, name, start, end, workdays[], review }`；数据源为国务院办公厅通知；**本计划写入的 2026 数据是草稿，上线前必须逐条人工校对（Task 12 手工 gate，JSON 内 `verified: false` 显式标记）**；构建期 lint：日期合法、调休日不在假期内且必须是周末、假期不重叠、字段完整。系统边界校验：`validateHolidayData` 接收 `unknown`，结构与内容一起查
- **埋点**（事件名与工厂规范一致，便于横向对比）：
  - `visit`：umami pageview 自带，本站无输入表单，visit 即价值
  - `generate`：**本站语义 = 查看请假攻略（即设计文档 §7 的 plan_viewed）**——本站没有「生成结果」流程，把工厂标准事件 generate 映射到「用户展开某个假期的攻略」这一核心动作，data 带 `{ plan: holidayId }`。保留 generate 事件名（不新造 plan_viewed 事件）是为了 umami 里各站三事件同名可比
  - `save_image`：保存「假期余额」年览卡；`export_error`：canvas 导出失败降级
  - **考核特殊（写死在此，防止后续误判）**：本站生死指标是**周复访率 + 热点期日访问峰值**（调休公布日、长假前一周），`save_image` 预期偏低，**不以保存率判死刑**（覆盖 00-factory §3.1 的默认决策标准，依据设计文档 §7）
- **视觉（00a 大字报 Big Type）**：签名元素 = 占满整屏的剩余天数，字重 900、字号 `clamp(8rem, 52vw, 20rem)`、`tabular-nums`——超大数字的字重与字号是本站设计核心；信息层级只留两级（大数字层 / 正文层）。完整色板（三色即全部，不加第四色，弱化信息用墨黑 60% 不透明度实现）：
  - 假期红 `#c22f1e`（大数字、反白块底色；对纸白对比度 ≈ 5.2:1，反白小字合规）
  - 纸白 `#f9f4e8`（页面底色、反白态文字）
  - 墨黑 `#26221c`（正文；对纸白对比度远超 4.5:1）
  - **调休日反白**：今天是调休上班日 → 主屏整体反白（红底纸白字）；总览表中调休天数用反白 chip。正文红字禁止（红对纸白 5.2:1 够但只留给大字与反白块，维持两级层级）
  - 移动端优先，最小可读字号 14px；动效仅允许出现在签名时刻且尊重 `prefers-reduced-motion`（v1 大字报为静态，无动效）
- **SEO（本站少见的真实渠道，认真做）**：title 带年份关键词（「2026 放假安排 · 还有几天放假」），description 覆盖「调休 / 净赚 / 请假攻略」搜索词；总览表日期用 `<time datetime>` 语义化标记；数据年份更新时 title 年份同步更新（写入 Task 12 的年度更新 SOP）
- **卡片**：走 shared 的 `renderCard` / `saveCard`，固定 1080×1440；「我的假期余额」年览卡；品牌条文字 `放假倒计时 · viral-sites`
- **数据过期兜底**（设计 §9）：页面自带「数据截至」标识；数据超过 `{year}-12-31` 后 30 天未更新 → 主屏自动切「等官方通知」态
- 不可变数据风格：更新对象一律返回新副本，不原地修改（组件内 `useState` 持有的集合也用拷贝更新）
- 提交信息用 conventional commits（feat/fix/test/chore/docs），**不加 Co-Authored-By**；包管理只用 pnpm

**文件全景**（Create 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
sites/holiday-countdown/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  public/_worker.js  public/u.js            # cp 自 sites/life-grid/public/（umami 同源代理 + 自托管脚本）
  public/favicon.svg                         # 现写：大字报风红底「休」
  test/setup.ts  test/canvas-stub.ts         # canvas-stub cp 自 life-grid
  src/main.tsx  src/index.css  src/app.tsx (+test)
  src/data/holiday-types.ts                  # Holiday / HolidayData 类型
  src/data/holidays-2026.json                # 2026 全年数据草稿【上线前人工校对，Task 12】
  src/data/holidays.ts                       # 类型化数据出口 HOLIDAYS
  src/data/validate-holidays.ts (+test)      # 数据 lint 纯函数
  src/data/holidays-2026.lint.test.ts        # 真实数据必须过 lint（接入 build 前置）
  src/lib/date-utc8.ts (+test)               # UTC+8 日序号工具
  src/lib/holiday-math.ts (+test)            # nextHoliday / 净赚 / 总览 / 彩蛋周末 / 调休反白 / 过期态
  src/lib/leave-optimizer.ts (+test)         # 请假攻略算法
  src/components/countdown-hero.tsx (+test)  # 主屏大数字（四态 + 反白）
  src/components/year-overview.tsx (+test)   # 全年总账表 + 彩蛋条 + 数据截至
  src/components/leave-plans.tsx (+test)     # 攻略区（generate ≙ plan_viewed 埋点）
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-balance-card.ts (+test)      # 「我的假期余额」年览卡绘制
```

---

### Task 1: 站点脚手架 + 静态资产（SEO / favicon / umami 占位）

**Files:**
- Create: `sites/holiday-countdown/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/app.tsx`, `src/index.css`, `test/setup.ts`, `public/favicon.svg`
- Copy: `public/_worker.js`, `public/u.js`, `test/canvas-stub.ts`（均自 life-grid）

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）、life-grid 的 `_worker.js` / `u.js` / `canvas-stub.ts`
- Produces: 可 build 的 Vite React 站点骨架；色板 CSS 变量与 `.big-days` / `.inverted` 两个风格类供后续组件使用

- [ ] **Step 1: 建包与依赖**

`sites/holiday-countdown/package.json`：

```json
{
  "name": "@viral/holiday-countdown",
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

（Task 4 会把 build 改成 `vitest run src/data && tsc --noEmit && vite build` 接入数据 lint，此时 lint 测试文件尚不存在，先不写。）

Run:

```bash
cd /Users/ahs/Documents/vibe-coding/viral-sites
pnpm --filter @viral/holiday-countdown add react@^19 react-dom@^19
pnpm --filter @viral/holiday-countdown add -D typescript vite@^8 @vitejs/plugin-react tailwindcss@^4 @tailwindcss/vite@^4 vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom@^6 @types/react @types/react-dom
pnpm --filter @viral/holiday-countdown add '@viral/shared@workspace:*'
```

- [ ] **Step 2: 配置文件**

`sites/holiday-countdown/tsconfig.json`（`resolveJsonModule` 是本站新增：要 import 年度数据 JSON）：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["vite/client", "@testing-library/jest-dom"],
    "resolveJsonModule": true
  },
  "include": ["src", "test"]
}
```

`sites/holiday-countdown/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/holiday-countdown/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
})
```

`sites/holiday-countdown/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: 复制工厂静态资产**

```bash
mkdir -p sites/holiday-countdown/public sites/holiday-countdown/test
cp sites/life-grid/public/_worker.js sites/holiday-countdown/public/_worker.js
cp sites/life-grid/public/u.js sites/holiday-countdown/public/u.js
cp sites/life-grid/test/canvas-stub.ts sites/holiday-countdown/test/canvas-stub.ts
```

（`_worker.js` 是 Cloudflare Pages 高级模式 Worker：同源代理 `/api/send` → umami gateway，保证大陆用户「站点打得开 = 统计一定通」；`u.js` 是 umami 自托管采集脚本。两者跨站通用，原样复制。）

- [ ] **Step 4: index.html（SEO 是本站真实渠道，title/description 认真写）**

`sites/holiday-countdown/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f9f4e8" />
    <title>2026 放假安排 · 还有几天放假 — 调休真相与请假攻略</title>
    <meta
      name="description"
      content="距离下一个法定节假日还有几天？2026 全年放假安排一览：每个假期的名义天数、调休上班日、实际净赚天数，附最优请假攻略和「下一个不调休的周末」。数据依据国务院办公厅通知，本地计算，无广告。"
    />
    <meta property="og:title" content="2026 放假安排 · 还有几天放假" />
    <meta property="og:description" content="调休真相：名义放几天、实际净赚几天，附最优请假攻略。" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- umami 自托管脚本 + 同源上报（data-host-url="/" → POST /api/send，由 _worker.js 代理转发）。
         上线前把 TO_BE_FILLED 替换为真实 website-id（Task 12 手工步骤） -->
    <script defer src="/u.js" data-website-id="TO_BE_FILLED" data-host-url="/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: favicon（大字报风，现写）**

`sites/holiday-countdown/public/favicon.svg`：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#c22f1e"/>
  <text x="32" y="47" text-anchor="middle" font-family="-apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif" font-size="42" font-weight="900" fill="#f9f4e8">休</text>
</svg>
```

- [ ] **Step 6: 样式与入口**

`sites/holiday-countdown/src/index.css`：

```css
@import 'tailwindcss';

:root {
  color-scheme: light;
  --holiday-red: #c22f1e;
  --paper-white: #f9f4e8;
  --ink-black: #26221c;
}

body {
  background-color: var(--paper-white);
  color: var(--ink-black);
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

/* 签名元素：占满整屏的剩余天数。字号靠视口宽度撑满，字重拉满 */
.big-days {
  font-size: clamp(8rem, 52vw, 20rem);
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--holiday-red);
}

/* 调休反白：红底纸白字（调休上班日主屏整体反白 / 总览表调休 chip） */
.inverted {
  background-color: var(--holiday-red);
  color: var(--paper-white);
}
.inverted .big-days {
  color: var(--paper-white);
}
```

`sites/holiday-countdown/src/main.tsx`：

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

`sites/holiday-countdown/src/app.tsx`（占位，Task 11 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-6 py-10">放假倒计时</main>
}
```

- [ ] **Step 7: 验证构建**

Run: `pnpm --filter @viral/holiday-countdown build`
Expected: 构建成功，产出 `sites/holiday-countdown/dist/`（此时无测试文件，不跑 test）

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(holiday-countdown): 站点脚手架与大字报基础样式"
```

---
