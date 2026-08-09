# 站点 06 · 默契度测试 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 monorepo 中新增 `sites/tacit-test`（默契度测试，S 级）：发起方答 10 题生成挑战链接（答案 base64url 编码进 URL，纯前端无后端），应战方打开链接答同 10 题后本地比对出「默契度 N%」对比报告；两张分享卡（挑战发起卡 / 默契对比卡）走 shared 卡片管线；埋点覆盖 generate → challenge_opened → challenge_completed 闭环漏斗。

**Architecture:** 站点只依赖 `@viral/shared`（`track` / `renderCard` / `saveCard` / `detectSaveStrategy`，签名以 `packages/shared/src/index.ts` 现状为准，本计划不改 shared）。核心逻辑全部是显式传参的纯函数模块：题库 `questions.ts`、编解码 `challenge-codec.ts`、计分 `scoring.ts`、风格锐评 `style-remark.ts`、复制降级 `copy-link.ts`、手绘线条 `card/doodle.ts`（种子随机，绘制确定性可测）。React 组件只做展示与状态机组装。TDD：每个模块先写失败测试再实现。

**Tech Stack:** pnpm workspace · Vite + React 19 · TypeScript(strict) · Tailwind v4 · Vitest 3 + Testing Library(jsdom) · Cloudflare Pages（`public/_worker.js` 高级模式：umami 同源代理 + `/c` 路由回退）· umami（自托管 `u.js` 同源上报）

## Global Constraints

（来自 [06-tacit-test.md](../06-tacit-test.md)、[00-factory-design.md](../00-factory-design.md)、[00a-style-map.md](../00a-style-map.md) 与 life-grid 实施验证的工程约定，所有任务默认遵守）

- 包名 `@viral/tacit-test`，位于 `sites/tacit-test`，依赖 `'@viral/shared@workspace:*'`；站与站零依赖；脚手架与 `sites/life-grid` 同构（package.json scripts、tsconfig extends、vite/vitest 配置同款）
- `vitest.config.ts` 必须 `globals: true` + `setupFiles: ['./test/setup.ts']`；devDeps 锁定 `vitest@^3`、`@testing-library/jest-dom@^6`
- 首屏 gzip < 100KB；不引入 UI 组件库、日期库、手写字体——「手写感」全靠 CSS（不规则圆角/微倾斜/虚线描边）与 canvas 抖动线条实现
- 纯函数显式传参；不可变数据风格（更新一律返回新副本，不原地修改）
- **色板（手绘涂鸦风，签名元素 = 两种笔迹的答案对比；禁止套用 life-grid 作业本配色）**：
  - 纸白底 `#fdfbf4` / 墨色正文 `#33302b` / 发起方蓝笔 `#2b59c3` / 应战方红笔 `#e0483a` / 铅笔灰辅助 `#9b948a`
  - 对比卡档位强调色（高分暖、低分冷）：90+ `#e0483a`、70+ `#e08f3a`、50+ `#c9a227`、30+ `#6b9bbf`、0+ `#8a94a6`
  - 蓝笔只用于发起方的名字/笔迹/按钮，红笔只用于应战方，页面与两张卡片都要维持这一对应关系
- **URL 规格（设计文档 §5，逐字执行）**：`/c?d=<base64url(JSON)>`，JSON `{ v: 1, q: 'friend' | 'couple', n: 昵称≤8字, a: number[10] 取值0~3 }`；直接 JSON → UTF-8 → base64url，不做位压缩；昵称按 Unicode code point 计数，编码前与解码后各截断一次；任何校验失败落首页提示「链接失效了，重新发起一个吧」，绝不白屏
- **路由用 query 不用 hash**（微信可能吞 hash）：解析一律 `URLSearchParams`；`/c` 路径由 `_worker.js` 回退到 `index.html`（vite dev 自带 SPA 回退，无需额外配置）。query 会随请求发送给托管基础设施，因此页面不得宣称“服务器不可见”；Umami 必须设置 `data-exclude-search="true"`，应用本身不持久化挑战参数
- **埋点事件表**（`track` 来自 shared；visit 由 umami pageview 自带）：
  - `generate`：发起方生成链接（data: `{ quiz }`）
  - `challenge_opened`：带 `d` 参数的访问，无论解码成败（解码失败额外记 `link_invalid`）
  - `challenge_completed`：应战方出结果（data: `{ quiz, score }`）
  - `q_answered`：每答一题（data: `{ q: 1~10, mode: 'initiate' | 'respond' }`，找流失题）
  - `save_image`（data: `{ card: 'invite' | 'compare' }`）、`copy_link`、`export_error`
  - **闭环率 = challenge_opened / generate 是本站生死指标**（预期 > 40%；低于说明链接在聊天场景传不动，机制假设不成立）——事件语义不得偏移，否则指标失真
- 分享卡固定 1080×1440，走 shared `renderCard` / `saveCard`；两张卡：挑战发起卡（兜底产出）与默契对比卡（核心传播物，配色按档位变化）
- 隐私声明只放页脚一处：「答案随挑战链接传递，请只发给你信任的人；本站不保存挑战内容」
- `public/_worker.js` 与 `public/u.js` 从 `sites/life-grid/public/` 复制（`_worker.js` 复制后追加 `/c` 回退）；`index.html` 同款 umami 接法：`src="/u.js"`、`data-website-id="TO_BE_FILLED"`（上线手工步骤替换，非计划占位符）、`data-host-url="/"`、`data-exclude-search="true"`；`favicon.svg` 按涂鸦风现写
- 提交信息用 conventional commits（feat/fix/test/chore/docs），不加 Co-Authored-By；测试命令统一 `pnpm --filter @viral/tacit-test test`

**文件全景**（Create 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
sites/tacit-test/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  public/_worker.js  public/u.js               # 从 life-grid 复制（_worker.js 加 /c 回退）
  public/favicon.svg                           # 涂鸦风，现写
  test/setup.ts  test/canvas-stub.ts
  src/main.tsx  src/index.css  src/app.tsx (+test)
  src/lib/palette.ts                           # 色板常量
  src/lib/questions.ts (+test)                 # 两套题库全文
  src/lib/challenge-codec.ts (+test)           # URL 编解码 + 严格校验
  src/lib/scoring.ts (+test)                   # 计分/五档/逐题对比
  src/lib/style-remark.ts (+test)              # 发起方答题风格锐评
  src/lib/copy-link.ts (+test)                 # clipboard + execCommand 降级
  src/card/doodle.ts (+test)                   # 种子随机 + 抖动线条 + 文本折行
  src/card/draw-invite-card.ts (+test)         # 挑战发起卡
  src/card/draw-compare-card.ts (+test)        # 默契对比卡
  src/components/home-screen.tsx (+test)
  src/components/nickname-screen.tsx (+test)
  src/components/quiz-screen.tsx (+test)
  src/components/invite-screen.tsx (+test)
  src/components/compare-screen.tsx (+test)
  src/components/copy-link-button.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
```

---

### Task 1: 站点脚手架（配置 + 静态资产 + 色板）

**Files:**
- Create: `sites/tacit-test/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `test/setup.ts`, `test/canvas-stub.ts`, `src/main.tsx`, `src/app.tsx`（占位，Task 11 替换）, `src/index.css`, `src/lib/palette.ts`, `public/favicon.svg`
- Create（复制）: `public/_worker.js`, `public/u.js`

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）
- Produces:
  - 可 build 的 Vite React 站点
  - `PALETTE: { paper: '#fdfbf4'; ink: '#33302b'; bluePen: '#2b59c3'; redPen: '#e0483a'; pencil: '#9b948a' }`（`src/lib/palette.ts`，as const）
  - `installCanvasStub(): RecordingCtx` 与 `makeRecordingCtx(): RecordingCtx`（`test/canvas-stub.ts`；比 life-grid 版多 stroke 系方法与 `fillStyles`/`strokeStyles` 历史记录，供卡片测试断言配色）

- [ ] **Step 1: 建包与依赖**

`sites/tacit-test/package.json`：

```json
{
  "name": "@viral/tacit-test",
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
pnpm --filter @viral/tacit-test add react react-dom
pnpm --filter @viral/tacit-test add -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest@^3 jsdom "@testing-library/jest-dom@^6" @testing-library/react @testing-library/user-event @types/react @types/react-dom
pnpm --filter @viral/tacit-test add '@viral/shared@workspace:*'
```

- [ ] **Step 2: 配置文件**

`sites/tacit-test/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client", "@testing-library/jest-dom"] },
  "include": ["src", "test"]
}
```

`sites/tacit-test/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/tacit-test/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
})
```

`sites/tacit-test/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: index.html 与入口**

`sites/tacit-test/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#fdfbf4" />
    <title>默契度测试 — 你们俩到底多默契</title>
    <meta
      name="description"
      content="答 10 道关于你们的题，把链接甩给对方；对方答完，默契度当场揭晓。本站不保存挑战内容。"
    />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- umami 自托管脚本 + 同源上报（data-host-url="/" → POST /api/send 由 _worker.js 代理转发）。
         website-id 在 Task 12 手工步骤替换。 -->
    <script
      defer
      src="/u.js"
      data-website-id="TO_BE_FILLED"
      data-host-url="/"
      data-exclude-search="true"
    ></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`sites/tacit-test/src/main.tsx`：

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

`sites/tacit-test/src/app.tsx`（占位，Task 11 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-6 py-10">默契度测试</main>
}
```

- [ ] **Step 4: 样式与色板**

`sites/tacit-test/src/index.css`：

```css
@import 'tailwindcss';

:root {
  color-scheme: light;
}

body {
  background-color: #fdfbf4;
  /* 纸面质感：极淡噪点用径向渐变模拟，纯 CSS 不用图片 */
  background-image: radial-gradient(rgba(51, 48, 43, 0.05) 1px, transparent 1px);
  background-size: 22px 22px;
  color: #33302b;
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

/* 手绘感三件套：不规则圆角边框 / 微倾斜 / 虚线描边（不引入手写字体，保体积预算） */
.doodle-border {
  border: 2px solid currentColor;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}

.sketch-dash {
  border: 2px dashed currentColor;
  border-radius: 12px 4px 14px 6px / 6px 12px 4px 14px;
}

.tilt-l {
  transform: rotate(-0.8deg);
}

.tilt-r {
  transform: rotate(0.7deg);
}

.pen-blue {
  color: #2b59c3;
}

.pen-red {
  color: #e0483a;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

`sites/tacit-test/src/lib/palette.ts`：

```ts
export const PALETTE = {
  paper: '#fdfbf4',
  ink: '#33302b',
  bluePen: '#2b59c3',
  redPen: '#e0483a',
  pencil: '#9b948a',
} as const
```

- [ ] **Step 5: 静态资产**

复制 life-grid 的 worker 与 umami 脚本：

```bash
mkdir -p sites/tacit-test/public
cp sites/life-grid/public/_worker.js sites/life-grid/public/u.js sites/tacit-test/public/
```

编辑 `sites/tacit-test/public/_worker.js`：在 `/api/send` 分支之后、`return env.ASSETS.fetch(request)` 之前，插入 `/c` 回退（挑战链接是单页应用的别名路径）：

```js
    if (url.pathname === '/c') {
      // 挑战链接 /c?d=... 回退到单页应用入口，query 原样保留
      return env.ASSETS.fetch(new Request(new URL('/', url.origin), request))
    }
```

`sites/tacit-test/public/favicon.svg`（涂鸦风：蓝红两支笔画的交叠圆圈 = 双人双色签名元素）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#fdfbf4"/>
  <path d="M22 14 C10 17 6 34 15 43 C24 52 40 48 43 36 C45 26 37 15 27 14" fill="none" stroke="#2b59c3" stroke-width="5" stroke-linecap="round"/>
  <path d="M40 21 C52 20 60 34 52 45 C44 55 29 53 24 44" fill="none" stroke="#e0483a" stroke-width="5" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 6: canvas 测试桩**

`sites/tacit-test/test/canvas-stub.ts`（在 life-grid 版基础上扩展 stroke 系方法；`fillStyle`/`strokeStyle` 用 getter/setter 记录赋值历史，供卡片测试断言「用过哪些颜色」）：

```ts
import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  beginPath: ReturnType<typeof vi.fn>
  moveTo: ReturnType<typeof vi.fn>
  lineTo: ReturnType<typeof vi.fn>
  quadraticCurveTo: ReturnType<typeof vi.fn>
  stroke: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  translate: ReturnType<typeof vi.fn>
  rotate: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
  measureText: ReturnType<typeof vi.fn>
  fillStyles: string[]
  strokeStyles: string[]
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  globalAlpha: number
  font: string
  textAlign: string
}

export function makeRecordingCtx(): RecordingCtx {
  const fillStyles: string[] = []
  const strokeStyles: string[] = []
  const ctx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    fillStyles,
    strokeStyles,
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as RecordingCtx
  Object.defineProperty(ctx, 'fillStyle', {
    get: () => fillStyles[fillStyles.length - 1] ?? '',
    set: (v: string) => {
      fillStyles.push(v)
    },
  })
  Object.defineProperty(ctx, 'strokeStyle', {
    get: () => strokeStyles[strokeStyles.length - 1] ?? '',
    set: (v: string) => {
      strokeStyles.push(v)
    },
  })
  return ctx
}

export function installCanvasStub(): RecordingCtx {
  const ctx = makeRecordingCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}
```

- [ ] **Step 7: 验证构建**

Run: `pnpm --filter @viral/tacit-test build`
Expected: 构建成功，产出 `sites/tacit-test/dist/`（含 `_worker.js`、`u.js`、`favicon.svg`）

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 站点脚手架、涂鸦风样式与静态资产"
```

---

### Task 2: 题库 questions.ts（两套 10 题全文）

**Files:**
- Create: `sites/tacit-test/src/lib/questions.ts`
- Test: `sites/tacit-test/src/lib/questions.test.ts`

**Interfaces:**
- Produces（后续任务大量依赖，签名必须一致）:
  - `type QuizId = 'friend' | 'couple'`
  - `interface Question { text: string; options: readonly [string, string, string, string] }`
  - `interface QuizSet { id: QuizId; name: string; intro: string; declaration: string; questions: readonly Question[] }`
  - `const QUESTION_COUNT = 10`、`const OPTION_COUNT = 4`
  - `const QUIZZES: Record<QuizId, QuizSet>`

题目硬标准（设计文档 §4）：答案客观存在、双方视角一致（判定 = 双方选同一选项），不能是主观偏好题。涉及「谁」的题，选项统一用「发起挑战的那位 / 接招的这位」指代，两侧视角看到同一事实映射到同一选项。注意：设计文档 §4 的两道示例题（「TA 深夜 emo 会先干嘛」「TA 最近一次让你心动是因为什么」）本身是单方视角题，不满足本节硬标准，题库不采用，改写为对称题（此矛盾已在计划 Self-Review 记录）。

- [ ] **Step 1: 写失败测试** `sites/tacit-test/src/lib/questions.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { OPTION_COUNT, QUESTION_COUNT, QUIZZES } from './questions'

describe('QUIZZES', () => {
  it('恰好两套题库：friend 与 couple', () => {
    expect(Object.keys(QUIZZES).sort()).toEqual(['couple', 'friend'])
  })

  it.each(['friend', 'couple'] as const)('%s：固定 10 题、每题 4 个非空选项', (id) => {
    const quiz = QUIZZES[id]
    expect(quiz.id).toBe(id)
    expect(quiz.questions).toHaveLength(QUESTION_COUNT)
    for (const q of quiz.questions) {
      expect(q.text.length).toBeGreaterThan(0)
      expect(q.options).toHaveLength(OPTION_COUNT)
      for (const opt of q.options) {
        expect(opt.length).toBeGreaterThan(0)
        expect(opt.length).toBeLessThanOrEqual(20) // 一屏一题与卡片排版上限
      }
    }
  })

  it.each(['friend', 'couple'] as const)('%s：题目文本不重复', (id) => {
    const texts = QUIZZES[id].questions.map((q) => q.text)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('入口文案与挑战宣言非空', () => {
    for (const quiz of Object.values(QUIZZES)) {
      expect(quiz.name.length).toBeGreaterThan(0)
      expect(quiz.intro.length).toBeGreaterThan(0)
      expect(quiz.declaration.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL（questions 未定义）

- [ ] **Step 3: 实现** `sites/tacit-test/src/lib/questions.ts`（题库全文如下，文案即产品，逐字落盘）

```ts
export type QuizId = 'friend' | 'couple'

export interface Question {
  text: string
  options: readonly [string, string, string, string]
}

export interface QuizSet {
  id: QuizId
  name: string
  intro: string
  declaration: string
  questions: readonly Question[]
}

export const QUESTION_COUNT = 10
export const OPTION_COUNT = 4

const FRIEND_QUESTIONS: readonly Question[] = [
  {
    text: '你们俩约饭，最后拍板去哪家店的是？',
    options: ['发起挑战的那位', '接招的这位', '大众点评替你们决定', '拖到饭点随便进一家'],
  },
  {
    text: '你们最常见的聊天开场白是？',
    options: ['「在吗」', '不打招呼直接甩链接', '表情包开路', '「我跟你说！！」'],
  },
  {
    text: '一起吃饭，你们的买单默契是？',
    options: ['抢着买单全武行', '轮流来，心里都有账', 'AA 到小数点后两位', '谁刚发工资谁请'],
  },
  {
    text: '你们的深夜聊天，多半因为什么开场？',
    options: ['有人 emo 了要陪聊', '分享刚刷到的沙雕视频', '游戏开黑三缺一', '睡不着，纯瞎聊'],
  },
  {
    text: '你们一起出门，负责认路的是？',
    options: ['发起挑战的那位', '接招的这位', '手机导航，但经常走反', '不认路，迷路也算行程'],
  },
  {
    text: '你们闹别扭之后，一般怎么和好？',
    options: ['一顿饭的事', '装作无事发生自动复原', '表情包试探破冰', '从没真正闹过别扭'],
  },
  {
    text: '你们的合照通常是什么画风？',
    options: ['摆拍精修九宫格', '沙雕抓拍互黑', '只拍风景不拍人', '想不起上次合照是何时'],
  },
  {
    text: '你们多久联系一次算正常？',
    options: ['一天不聊浑身难受', '三五天一波小高潮', '半个月一次深夜长谈', '半年不联系也不生分'],
  },
  {
    text: '借钱这件事，在你们之间——',
    options: ['张口就借不打借条', '借归借，转账记录两清', '从不谈钱，谈钱伤感情', '谁也没钱，互相哭穷'],
  },
  {
    text: '你们要是一起旅行，最可能因为什么吵起来？',
    options: ['早上谁都叫不醒谁', '一个做攻略一个全程躺', '吃什么能僵持一小时', '吵不起来，各玩各的'],
  },
]

const COUPLE_QUESTIONS: readonly Question[] = [
  {
    text: '第一句「喜欢你」是谁先说的？',
    options: ['发起挑战的那位', '接招的这位', '同时说破，心照不宣', '没人说过，处着处着就在一起了'],
  },
  {
    text: '你们的第一次约会去了哪里？',
    options: ['老老实实吃了顿饭', '看了场电影', '压马路瞎逛', '已经记不清了（危）'],
  },
  {
    text: '吵架之后，通常谁先低头？',
    options: ['发起挑战的那位', '接招的这位', '谁理亏谁低头，很公平', '冷战到自动过期'],
  },
  {
    text: '你们的情侣头像现状是？',
    options: ['一直有，还定期换新', '有过，现在各过各的', '从来没用过，没必要', '一方换了另一方装没看见'],
  },
  {
    text: '你们的作息属于哪一款？',
    options: ['一起早睡的养生型', '一起熬夜的修仙型', '一个熬夜一个夺命催', '各睡各的互不干涉'],
  },
  {
    text: '出门约会，最后站在门口等的是？',
    options: ['发起挑战的那位', '接招的这位', '拖延症对轰，比谁更晚', '不存在等，永远同步出门'],
  },
  {
    text: '你们的纪念日靠谁记住？',
    options: ['发起挑战的那位', '接招的这位', '手机日历，机器比人靠谱', '什么纪念日？（胆子不小）'],
  },
  {
    text: '今晚吃什么，通常怎么定？',
    options: ['发起挑战的那位说了算', '接招的这位说了算', '转盘猜拳等玄学工具', '互相「随便」到饿过头'],
  },
  {
    text: '你们吵过最凶的一架，导火索是？',
    options: ['家务和生活习惯', '打游戏不回消息', '前任或异性朋友', '想不起来，都是小打小闹'],
  },
  {
    text: '关于未来，你们聊得最多的是？',
    options: ['在哪座城市定下来', '先养猫还是先养狗', '攒钱和花钱的拉锯', '只谈当下，未来再说'],
  },
]

export const QUIZZES: Record<QuizId, QuizSet> = {
  friend: {
    id: 'friend',
    name: '好友版',
    intro: '测你和那个总损你的人，到底多懂彼此',
    declaration: '出了 10 道关于你们俩的题，赌你答不对一半',
    questions: FRIEND_QUESTIONS,
  },
  couple: {
    id: 'couple',
    name: '情侣版',
    intro: '测你们是灵魂共振，还是需要聊聊',
    declaration: '出了 10 道关于你们的题，看看你到底有没有走心',
    questions: COUPLE_QUESTIONS,
  },
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/tacit-test test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 好友版/情侣版题库全文"
```

---

### Task 3: URL 编解码 challenge-codec.ts

**Files:**
- Create: `sites/tacit-test/src/lib/challenge-codec.ts`
- Test: `sites/tacit-test/src/lib/challenge-codec.test.ts`

**Interfaces:**
- Consumes: `QUESTION_COUNT` / `OPTION_COUNT` / `QuizId`（Task 2）
- Produces:
  - `const NICKNAME_MAX = 8`
  - `interface ChallengePayload { v: 1; q: QuizId; n: string; a: readonly number[] }`
  - `clampNickname(raw: string): string` — trim 后按 code point 截断到 8 字（`Array.from` 切分，中文/emoji 各算 1 字）
  - `encodeChallenge(quiz: QuizId, nickname: string, answers: readonly number[]): string` — 返回 base64url 串（`d` 参数值）；answers 长度/取值非法时抛 Error（程序内部错误，快速失败）
  - `decodeChallenge(d: string): ChallengePayload | null` — 严格校验（base64/UTF-8/JSON/版本/题库/数组长度与取值/昵称类型），任何一步失败返回 null；成功时返回新对象（昵称再截断一次，数组拷贝）
  - `buildChallengeUrl(origin: string, d: string): string` — `` `${origin}/c?d=${d}` ``

- [ ] **Step 1: 写失败测试** `sites/tacit-test/src/lib/challenge-codec.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  buildChallengeUrl,
  clampNickname,
  decodeChallenge,
  encodeChallenge,
} from './challenge-codec'

const ANSWERS = [0, 2, 1, 3, 0, 1, 2, 3, 0, 1]

/** 测试专用：把任意对象按同一管线编成 base64url，用于构造非法 payload */
function rawEncode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('clampNickname', () => {
  it('8 字以内原样保留（trim 后）', () => expect(clampNickname(' 阿福 ')).toBe('阿福'))
  it('超长按 code point 截断到 8', () =>
    expect(clampNickname('一二三四五六七八九十')).toBe('一二三四五六七八'))
  it('emoji 算 1 字不被劈开', () => expect(clampNickname('猫猫🐱🐱猫猫🐱🐱九')).toBe('猫猫🐱🐱猫猫🐱🐱'))
})

describe('encode → decode roundtrip', () => {
  it('中文昵称', () => {
    const d = encodeChallenge('friend', '阿福', ANSWERS)
    expect(decodeChallenge(d)).toEqual({ v: 1, q: 'friend', n: '阿福', a: ANSWERS })
  })

  it('emoji 昵称', () => {
    const d = encodeChallenge('couple', '小明🐱', ANSWERS)
    expect(decodeChallenge(d)?.n).toBe('小明🐱')
  })

  it('超长昵称编码前截断', () => {
    const d = encodeChallenge('friend', '一二三四五六七八九十', ANSWERS)
    expect(decodeChallenge(d)?.n).toBe('一二三四五六七八')
  })

  it('产物 URL 安全：只含 A-Za-z0-9_-', () => {
    const d = encodeChallenge('couple', '猫🐱与狗', ANSWERS)
    expect(d).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('encodeChallenge 非法入参快速失败', () => {
  it('答案数组长度不是 10 抛错', () =>
    expect(() => encodeChallenge('friend', '阿福', [0, 1])).toThrow())
  it('答案取值越界抛错', () =>
    expect(() => encodeChallenge('friend', '阿福', [...ANSWERS.slice(0, 9), 4])).toThrow())
})

describe('decodeChallenge 严格校验（全部返回 null，绝不抛错）', () => {
  it('坏 base64', () => expect(decodeChallenge('%%%not-base64%%%')).toBeNull())
  it('base64 合法但不是 UTF-8 JSON', () => expect(decodeChallenge('_v7_')).toBeNull())
  it('JSON 合法但不是对象', () => expect(decodeChallenge(rawEncode([1, 2, 3]))).toBeNull())
  it('空对象', () => expect(decodeChallenge(rawEncode({}))).toBeNull())
  it('未知版本号', () =>
    expect(decodeChallenge(rawEncode({ v: 2, q: 'friend', n: 'x', a: ANSWERS }))).toBeNull())
  it('未知题库', () =>
    expect(decodeChallenge(rawEncode({ v: 1, q: 'enemy', n: 'x', a: ANSWERS }))).toBeNull())
  it('昵称不是字符串', () =>
    expect(decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 42, a: ANSWERS }))).toBeNull())
  it('篡改：答案数组长度 9', () =>
    expect(
      decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: ANSWERS.slice(0, 9) })),
    ).toBeNull())
  it('篡改：答案取值 4 越界', () =>
    expect(
      decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: [...ANSWERS.slice(0, 9), 4] })),
    ).toBeNull())
  it('篡改：负数与小数', () => {
    expect(
      decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: [...ANSWERS.slice(0, 9), -1] })),
    ).toBeNull()
    expect(
      decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: [...ANSWERS.slice(0, 9), 1.5] })),
    ).toBeNull()
  })
  it('篡改：a 不是数组', () =>
    expect(decodeChallenge(rawEncode({ v: 1, q: 'friend', n: 'x', a: 'abc' }))).toBeNull())
  it('手改超长昵称：解码后仍截断到 8 字', () => {
    const d = rawEncode({ v: 1, q: 'friend', n: '一二三四五六七八九十', a: ANSWERS })
    expect(decodeChallenge(d)?.n).toBe('一二三四五六七八')
  })
})

describe('buildChallengeUrl', () => {
  it('拼接 /c?d=', () =>
    expect(buildChallengeUrl('https://tacit-test.pages.dev', 'abc')).toBe(
      'https://tacit-test.pages.dev/c?d=abc',
    ))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/tacit-test/src/lib/challenge-codec.ts`

```ts
import { OPTION_COUNT, QUESTION_COUNT, type QuizId } from './questions'

export const NICKNAME_MAX = 8

export interface ChallengePayload {
  v: 1
  q: QuizId
  n: string
  a: readonly number[]
}

export function clampNickname(raw: string): string {
  return Array.from(raw.trim()).slice(0, NICKNAME_MAX).join('')
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array | null {
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function isValidAnswers(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === QUESTION_COUNT &&
    value.every((x) => Number.isInteger(x) && x >= 0 && x < OPTION_COUNT)
  )
}

export function encodeChallenge(
  quiz: QuizId,
  nickname: string,
  answers: readonly number[],
): string {
  if (!isValidAnswers([...answers])) throw new Error('answers must be 10 integers in 0~3')
  const payload: ChallengePayload = { v: 1, q: quiz, n: clampNickname(nickname), a: [...answers] }
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

export function decodeChallenge(d: string): ChallengePayload | null {
  const bytes = fromBase64Url(d)
  if (!bytes) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>
  if (obj.v !== 1) return null
  if (obj.q !== 'friend' && obj.q !== 'couple') return null
  if (typeof obj.n !== 'string') return null
  if (!isValidAnswers(obj.a)) return null
  return { v: 1, q: obj.q, n: clampNickname(obj.n), a: [...obj.a] }
}

export function buildChallengeUrl(origin: string, d: string): string {
  return `${origin}/c?d=${d}`
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/tacit-test test && pnpm --filter @viral/tacit-test typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 挑战链接编解码与严格校验"
```

---

### Task 4: 计分与档位 scoring.ts

**Files:**
- Create: `sites/tacit-test/src/lib/scoring.ts`
- Test: `sites/tacit-test/src/lib/scoring.test.ts`

**Interfaces:**
- Consumes: `QUIZZES` / `QuizId`（Task 2）
- Produces:
  - `type TierId = 'soulmate' | 'mutual' | 'grinding' | 'parallel' | 'plastic'`
  - `interface Tier { id: TierId; min: number; title: string; remark: string; accent: string }`
  - `computeScore(a: readonly number[], b: readonly number[]): number` — 相同选项数 × 10；长度不等抛 Error
  - `tierFor(score: number, quiz: QuizId): Tier` — 档位边界 90/70/50/30/0；最低档称号按题库分流（塑料情谊/建议聊聊），锐评全部按题库分流
  - `interface ComparisonRow { index: number; question: string; initiatorOption: string; challengerOption: string; matched: boolean }`
  - `buildComparison(quiz: QuizId, initiator: readonly number[], challenger: readonly number[]): ComparisonRow[]`
  - `pickHighlightRow(rows: readonly ComparisonRow[]): ComparisonRow` — 对比卡「最有梗的一条」规则：取第一条一致的题；全不一致则取第 1 题（确定性规则，卡片文案区分两种情况）

- [ ] **Step 1: 写失败测试** `sites/tacit-test/src/lib/scoring.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { QUIZZES } from './questions'
import { buildComparison, computeScore, pickHighlightRow, tierFor } from './scoring'

const A = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]

/** 与 A 恰好错开 n 题的答案数组 */
function mismatch(n: number): number[] {
  return A.map((v, i) => (i < n ? (v + 1) % 4 : v))
}

describe('computeScore', () => {
  it('全对 100', () => expect(computeScore(A, [...A])).toBe(100))
  it('全错 0', () => expect(computeScore(A, mismatch(10))).toBe(0))
  it('7 题一致 70', () => expect(computeScore(A, mismatch(3))).toBe(70))
  it('长度不等抛错', () => expect(() => computeScore(A, [0, 1])).toThrow())
})

describe('tierFor 档位边界（0/29/30/49/50/69/70/89/90/100）', () => {
  it.each([
    [100, 'soulmate'],
    [90, 'soulmate'],
    [89, 'mutual'],
    [70, 'mutual'],
    [69, 'grinding'],
    [50, 'grinding'],
    [49, 'parallel'],
    [30, 'parallel'],
    [29, 'plastic'],
    [0, 'plastic'],
  ] as const)('%i 分 → %s', (score, id) => {
    expect(tierFor(score, 'friend').id).toBe(id)
  })

  it('称号：90+ 灵魂共振 / 70+ 双向奔赴 / 50+ 还在磨合 / 30+ 各过各的', () => {
    expect(tierFor(90, 'friend').title).toBe('灵魂共振')
    expect(tierFor(70, 'couple').title).toBe('双向奔赴')
    expect(tierFor(50, 'friend').title).toBe('还在磨合')
    expect(tierFor(30, 'couple').title).toBe('各过各的')
  })

  it('最低档称号按题库分流', () => {
    expect(tierFor(0, 'friend').title).toBe('塑料情谊')
    expect(tierFor(0, 'couple').title).toBe('建议聊聊')
  })

  it('每档带非空锐评与档位强调色', () => {
    for (const score of [95, 75, 55, 35, 5]) {
      for (const quiz of ['friend', 'couple'] as const) {
        const tier = tierFor(score, quiz)
        expect(tier.remark.length).toBeGreaterThan(0)
        expect(tier.accent).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('高低档锐评不同（题库内差异化）', () => {
    expect(tierFor(95, 'couple').remark).not.toBe(tierFor(5, 'couple').remark)
    expect(tierFor(5, 'friend').remark).not.toBe(tierFor(5, 'couple').remark)
  })
})

describe('buildComparison', () => {
  it('10 行，一致的行 matched 且带双方选项原文', () => {
    const rows = buildComparison('friend', A, mismatch(3))
    expect(rows).toHaveLength(10)
    expect(rows[0].matched).toBe(false)
    expect(rows[9].matched).toBe(true)
    expect(rows[0].question).toBe(QUIZZES.friend.questions[0].text)
    expect(rows[0].initiatorOption).toBe(QUIZZES.friend.questions[0].options[A[0]])
    expect(rows[0].challengerOption).toBe(QUIZZES.friend.questions[0].options[(A[0] + 1) % 4])
  })
})

describe('pickHighlightRow', () => {
  it('优先取第一条一致的题', () => {
    const rows = buildComparison('friend', A, mismatch(3))
    expect(pickHighlightRow(rows).index).toBe(3)
    expect(pickHighlightRow(rows).matched).toBe(true)
  })
  it('全不一致取第 1 题', () => {
    const rows = buildComparison('friend', A, mismatch(10))
    expect(pickHighlightRow(rows).index).toBe(0)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/tacit-test/src/lib/scoring.ts`（五档 × 两题库共 10 条锐评全文，低分好笑不伤人，情侣版低分单独打磨）

```ts
import { QUIZZES, type QuizId } from './questions'

export type TierId = 'soulmate' | 'mutual' | 'grinding' | 'parallel' | 'plastic'

export interface Tier {
  id: TierId
  min: number
  title: string
  remark: string
  accent: string
}

interface TierDef {
  id: TierId
  min: number
  accent: string
  title: Record<QuizId, string>
  remark: Record<QuizId, string>
}

const TIER_DEFS: readonly TierDef[] = [
  {
    id: 'soulmate',
    min: 90,
    accent: '#e0483a',
    title: { friend: '灵魂共振', couple: '灵魂共振' },
    remark: {
      friend: '你们俩上辈子大概是同一个人，这辈子拆成两份也没拆干净',
      couple: '这默契已经不需要开口了，一个眼神就能吵完一整架再和好',
    },
  },
  {
    id: 'mutual',
    min: 70,
    accent: '#e08f3a',
    title: { friend: '双向奔赴', couple: '双向奔赴' },
    remark: {
      friend: '不用天天联系，但一开口就知道对方在哪个频道，这就够了',
      couple: '你们在彼此心里显然都存着一份持续更新的使用说明书',
    },
  },
  {
    id: 'grinding',
    min: 50,
    accent: '#c9a227',
    title: { friend: '还在磨合', couple: '还在磨合' },
    remark: {
      friend: '一半默契一半惊喜，友谊的乐趣就在猜错的那几题里',
      couple: '爱是确定的，细节还在打补丁——多约几次会，版本就更新了',
    },
  },
  {
    id: 'parallel',
    min: 30,
    accent: '#6b9bbf',
    title: { friend: '各过各的', couple: '各过各的' },
    remark: {
      friend: '你们的默契像信号不好的 WiFi——有，但得看缘分',
      couple: '住在同一段感情里，跑着两套操作系统，建议定期同步一下',
    },
  },
  {
    id: 'plastic',
    min: 0,
    accent: '#8a94a6',
    title: { friend: '塑料情谊', couple: '建议聊聊' },
    remark: {
      friend: '恭喜解锁塑料友情认证——别慌，塑料的优点是特别耐用',
      couple: '分数不代表感情，但今晚的聊天话题这不就来了吗',
    },
  },
]

export function computeScore(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error('answer arrays must have equal length')
  return a.reduce((acc, v, i) => (v === b[i] ? acc + 10 : acc), 0)
}

export function tierFor(score: number, quiz: QuizId): Tier {
  const def = TIER_DEFS.find((t) => score >= t.min) ?? TIER_DEFS[TIER_DEFS.length - 1]
  return {
    id: def.id,
    min: def.min,
    title: def.title[quiz],
    remark: def.remark[quiz],
    accent: def.accent,
  }
}

export interface ComparisonRow {
  index: number
  question: string
  initiatorOption: string
  challengerOption: string
  matched: boolean
}

export function buildComparison(
  quiz: QuizId,
  initiator: readonly number[],
  challenger: readonly number[],
): ComparisonRow[] {
  return QUIZZES[quiz].questions.map((question, i) => ({
    index: i,
    question: question.text,
    initiatorOption: question.options[initiator[i]],
    challengerOption: question.options[challenger[i]],
    matched: initiator[i] === challenger[i],
  }))
}

export function pickHighlightRow(rows: readonly ComparisonRow[]): ComparisonRow {
  return rows.find((r) => r.matched) ?? rows[0]
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/tacit-test test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 计分五档、锐评文案与逐题对比"
```

---

### Task 5: 答题风格锐评 style-remark.ts + 复制降级 copy-link.ts

**Files:**
- Create: `sites/tacit-test/src/lib/style-remark.ts`, `sites/tacit-test/src/lib/copy-link.ts`
- Test: `sites/tacit-test/src/lib/style-remark.test.ts`, `sites/tacit-test/src/lib/copy-link.test.ts`

**Interfaces:**
- Produces:
  - `type StyleId = 'single-minded' | 'unpredictable' | 'steady' | 'classic'`
  - `const STYLE_REMARKS: Record<StyleId, string>`
  - `classifyStyle(answers: readonly number[]): StyleId` — 映射规则（按优先级）：① 同一选项出现 ≥7 次 → `single-minded`；② 四个选项都用过且最高频 ≤4 → `unpredictable`；③ 存在连续 ≥4 题同选项 → `steady`；④ 其余 → `classic`
  - `styleRemark(answers: readonly number[]): string` — `STYLE_REMARKS[classifyStyle(answers)]`
  - `copyText(text: string): Promise<boolean>` — 先 `navigator.clipboard.writeText`；不可用或被拒（微信内常见）降级到隐藏 textarea + `document.execCommand('copy')`；两条路都失败返回 false，绝不抛错

- [ ] **Step 1: 写失败测试**

`sites/tacit-test/src/lib/style-remark.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { STYLE_REMARKS, classifyStyle, styleRemark } from './style-remark'

describe('classifyStyle', () => {
  it('同一选项 ≥7 次 → single-minded', () =>
    expect(classifyStyle([0, 0, 0, 0, 0, 0, 0, 1, 2, 3])).toBe('single-minded'))
  it('四选项全用且最高 ≤4 → unpredictable', () =>
    expect(classifyStyle([0, 1, 2, 3, 0, 1, 2, 3, 0, 1])).toBe('unpredictable'))
  it('连续 ≥4 同选项（未触发前两条）→ steady', () =>
    expect(classifyStyle([0, 0, 0, 0, 1, 2, 1, 2, 1, 2])).toBe('steady'))
  it('其余 → classic', () => expect(classifyStyle([0, 1, 0, 1, 2, 0, 1, 0, 1, 0])).toBe('classic'))
  it('优先级：满 10 同选项归 single-minded 而非 steady', () =>
    expect(classifyStyle(Array(10).fill(2))).toBe('single-minded'))
})

describe('styleRemark', () => {
  it('四种风格锐评各不相同且非空', () => {
    const texts = Object.values(STYLE_REMARKS)
    expect(new Set(texts).size).toBe(4)
    for (const t of texts) expect(t.length).toBeGreaterThan(0)
  })
  it('返回对应风格的文案', () =>
    expect(styleRemark(Array(10).fill(0))).toBe(STYLE_REMARKS['single-minded']))
})
```

`sites/tacit-test/src/lib/copy-link.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './copy-link'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('copyText', () => {
  it('clipboard API 可用：写入成功返回 true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await expect(copyText('https://x/c?d=abc')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://x/c?d=abc')
  })

  it('clipboard 被拒：降级 execCommand 成功返回 true', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    document.execCommand = vi.fn().mockReturnValue(true)
    await expect(copyText('link')).resolves.toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('clipboard 不存在：直接走 execCommand', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn().mockReturnValue(true)
    await expect(copyText('link')).resolves.toBe(true)
  })

  it('两条路都失败：返回 false 不抛错', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported')
    })
    await expect(copyText('link')).resolves.toBe(false)
  })

  it('降级路径不在 DOM 留下 textarea', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn().mockReturnValue(true)
    await copyText('link')
    expect(document.querySelector('textarea')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/tacit-test/src/lib/style-remark.ts`：

```ts
export type StyleId = 'single-minded' | 'unpredictable' | 'steady' | 'classic'

export const STYLE_REMARKS: Record<StyleId, string> = {
  'single-minded': '答题像盖章，认准一个选项就不撒手——这份执拗，对方肯定领教过',
  unpredictable: '四个选项雨露均沾，出题人都摸不透你，何况屏幕对面那位',
  steady: '一连好几题不换选项，你是把你们的日常答成了肌肉记忆',
  classic: '选得有来有回，看得出你认真回忆了你们的每一件小事',
}

export function classifyStyle(answers: readonly number[]): StyleId {
  const counts = [0, 0, 0, 0]
  for (const a of answers) counts[a] += 1
  const max = Math.max(...counts)
  const used = counts.filter((c) => c > 0).length
  let streak = 1
  let longest = 1
  for (let i = 1; i < answers.length; i += 1) {
    streak = answers[i] === answers[i - 1] ? streak + 1 : 1
    longest = Math.max(longest, streak)
  }
  if (max >= 7) return 'single-minded'
  if (used === 4 && max <= 4) return 'unpredictable'
  if (longest >= 4) return 'steady'
  return 'classic'
}

export function styleRemark(answers: readonly number[]): string {
  return STYLE_REMARKS[classifyStyle(answers)]
}
```

`sites/tacit-test/src/lib/copy-link.ts`：

```ts
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 微信内 clipboard API 可能被拒，落入降级路径
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/tacit-test test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 答题风格锐评与复制链接双路径"
```

---

### Task 6: 手绘线条辅助 card/doodle.ts

**Files:**
- Create: `sites/tacit-test/src/card/doodle.ts`
- Test: `sites/tacit-test/src/card/doodle.test.ts`

**Interfaces:**
- Produces:
  - `type Rand = () => number`
  - `mulberry32(seed: number): Rand` — 种子伪随机，同种子序列完全一致（卡片绘制确定性 = 可测试、同一数据出同一张图）
  - `wobblyLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, rand: Rand): void` — 端点抖动 ±1.5px、中点抖动 ±3px 的二次贝塞尔「手抖线」
  - `wobblyRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rand: Rand): void` — 四条手抖线围成的框
  - `fillWrappedText(ctx: CanvasRenderingContext2D, text: string, centerX: number, startY: number, charsPerLine: number, lineHeight: number): number` — 按 code point 数折行居中绘制，返回末行之后的 y（卡片长文案排版）

- [ ] **Step 1: 写失败测试** `sites/tacit-test/src/card/doodle.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { fillWrappedText, mulberry32, wobblyLine, wobblyRect } from './doodle'

describe('mulberry32', () => {
  it('同种子序列一致', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('不同种子序列不同', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
  it('取值在 [0, 1)', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 100; i += 1) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('wobblyLine', () => {
  it('一次 beginPath/moveTo/quadraticCurveTo/stroke，端点抖动不超过 ±1.5px', () => {
    const ctx = makeRecordingCtx()
    wobblyLine(ctx as unknown as CanvasRenderingContext2D, 10, 20, 110, 20, mulberry32(1))
    expect(ctx.beginPath).toHaveBeenCalledOnce()
    expect(ctx.stroke).toHaveBeenCalledOnce()
    const [mx, my] = ctx.moveTo.mock.calls[0]
    expect(Math.abs(mx - 10)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(my - 20)).toBeLessThanOrEqual(1.5)
    const [, , ex, ey] = ctx.quadraticCurveTo.mock.calls[0]
    expect(Math.abs(ex - 110)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(ey - 20)).toBeLessThanOrEqual(1.5)
  })
})

describe('wobblyRect', () => {
  it('画 4 条边', () => {
    const ctx = makeRecordingCtx()
    wobblyRect(ctx as unknown as CanvasRenderingContext2D, 0, 0, 100, 50, mulberry32(1))
    expect(ctx.stroke).toHaveBeenCalledTimes(4)
  })
})

describe('fillWrappedText', () => {
  it('按字数折行并返回下一行 y', () => {
    const ctx = makeRecordingCtx()
    const nextY = fillWrappedText(
      ctx as unknown as CanvasRenderingContext2D,
      '一二三四五六七八九十一二',
      540,
      100,
      5,
      60,
    )
    const texts = ctx.fillText.mock.calls.map((c) => c[0])
    expect(texts).toEqual(['一二三四五', '六七八九十', '一二'])
    expect(nextY).toBe(280)
  })
  it('emoji 不被劈开', () => {
    const ctx = makeRecordingCtx()
    fillWrappedText(ctx as unknown as CanvasRenderingContext2D, '猫🐱狗🐶鸟', 540, 100, 2, 60)
    expect(ctx.fillText.mock.calls.map((c) => c[0])).toEqual(['猫🐱', '狗🐶', '鸟'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/tacit-test/src/card/doodle.ts`

```ts
export type Rand = () => number

export function mulberry32(seed: number): Rand {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const END_JITTER = 3
const MID_JITTER = 6

export function wobblyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rand: Rand,
): void {
  const midX = (x1 + x2) / 2 + (rand() - 0.5) * MID_JITTER
  const midY = (y1 + y2) / 2 + (rand() - 0.5) * MID_JITTER
  ctx.beginPath()
  ctx.moveTo(x1 + (rand() - 0.5) * END_JITTER, y1 + (rand() - 0.5) * END_JITTER)
  ctx.quadraticCurveTo(
    midX,
    midY,
    x2 + (rand() - 0.5) * END_JITTER,
    y2 + (rand() - 0.5) * END_JITTER,
  )
  ctx.stroke()
}

export function wobblyRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rand: Rand,
): void {
  wobblyLine(ctx, x, y, x + w, y, rand)
  wobblyLine(ctx, x + w, y, x + w, y + h, rand)
  wobblyLine(ctx, x + w, y + h, x, y + h, rand)
  wobblyLine(ctx, x, y + h, x, y, rand)
}

export function fillWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  charsPerLine: number,
  lineHeight: number,
): number {
  const chars = Array.from(text)
  let y = startY
  for (let i = 0; i < chars.length; i += charsPerLine) {
    ctx.fillText(chars.slice(i, i + charsPerLine).join(''), centerX, y)
    y += lineHeight
  }
  return y
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/tacit-test test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 种子随机手绘线条与文本折行辅助"
```

---

### Task 7: 两张分享卡绘制

**Files:**
- Create: `sites/tacit-test/src/card/draw-invite-card.ts`, `sites/tacit-test/src/card/draw-compare-card.ts`
- Test: `sites/tacit-test/src/card/draw-invite-card.test.ts`, `sites/tacit-test/src/card/draw-compare-card.test.ts`

**Interfaces:**
- Consumes: `DrawFn`（shared）、`PALETTE`（Task 1）、`QUIZZES`/`QuizId`（Task 2）、`Tier`/`ComparisonRow`（Task 4）、`styleRemark`（Task 5）、`mulberry32`/`wobblyRect`/`wobblyLine`/`fillWrappedText`（Task 6）
- Produces:
  - `makeInviteCardDraw(quiz: QuizId, nickname: string, answers: readonly number[]): DrawFn` — 挑战发起卡（兜底产出）：蓝笔手抖框 + 标题「默契度挑战书」+ 蓝笔昵称 + 挑战宣言 + 红笔手抖分隔线 + 答题风格锐评 + 品牌条
  - `interface CompareCardData { quiz: QuizId; initiatorName: string; challengerName: string; score: number; tier: Tier; highlight: ComparisonRow }`
  - `makeCompareCardDraw(data: CompareCardData): DrawFn` — 默契对比卡（核心传播物）：档位强调色手抖框 + 蓝笔发起方名 ×（墨色）红笔应战方名 + 档位色大数字 `N%` + 称号 + 锐评 + 最有梗一条对比（题目 + 蓝笔选项 vs 红笔选项）+ 品牌条；配色随 `tier.accent` 变化（高分暖低分冷，九宫格可辨识）
  - 两张卡固定种子 `CARD_SEED = 42`，同数据必出同图

- [ ] **Step 1: 写失败测试**

`sites/tacit-test/src/card/draw-invite-card.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { PALETTE } from '../lib/palette'
import { STYLE_REMARKS } from '../lib/style-remark'
import { makeInviteCardDraw } from './draw-invite-card'

const SIZE = { width: 1080, height: 1440 }
const ANSWERS = Array(10).fill(0)

describe('makeInviteCardDraw', () => {
  it('纸白底 + 蓝笔手抖框', () => {
    const ctx = makeRecordingCtx()
    makeInviteCardDraw('friend', '阿福', ANSWERS)(ctx as never, SIZE)
    expect(ctx.fillStyles[0]).toBe(PALETTE.paper)
    expect(ctx.fillRect.mock.calls[0]).toEqual([0, 0, 1080, 1440])
    expect(ctx.strokeStyles).toContain(PALETTE.bluePen)
    expect(ctx.stroke.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('文字含标题/昵称/宣言/题库名/风格锐评/品牌条', () => {
    const ctx = makeRecordingCtx()
    makeInviteCardDraw('friend', '阿福', ANSWERS)(ctx as never, SIZE)
    const texts = ctx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('默契度挑战书')
    expect(texts).toContain('阿福')
    // 宣言与锐评经 fillWrappedText 折行，断言用 join 后的整串
    expect(texts.join('')).toContain('赌你答不对一半')
    expect(texts.some((t) => t.includes('好友版'))).toBe(true)
    expect(texts.join('')).toContain(STYLE_REMARKS['single-minded'])
    expect(texts.some((t) => t.includes('默契度测试'))).toBe(true)
  })

  it('同数据两次绘制调用序列一致（种子确定性）', () => {
    const a = makeRecordingCtx()
    const b = makeRecordingCtx()
    makeInviteCardDraw('couple', '小明', ANSWERS)(a as never, SIZE)
    makeInviteCardDraw('couple', '小明', ANSWERS)(b as never, SIZE)
    expect(a.moveTo.mock.calls).toEqual(b.moveTo.mock.calls)
  })
})
```

`sites/tacit-test/src/card/draw-compare-card.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { PALETTE } from '../lib/palette'
import { buildComparison, pickHighlightRow, tierFor } from '../lib/scoring'
import { makeCompareCardDraw, type CompareCardData } from './draw-compare-card'

const SIZE = { width: 1080, height: 1440 }
const A = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
const B = [1, 1, 2, 3, 0, 1, 2, 3, 0, 2] // 8 题一致 → 80 分

function makeData(): CompareCardData {
  const rows = buildComparison('friend', A, B)
  return {
    quiz: 'friend',
    initiatorName: '阿福',
    challengerName: '小明',
    score: 80,
    tier: tierFor(80, 'friend'),
    highlight: pickHighlightRow(rows),
  }
}

describe('makeCompareCardDraw', () => {
  it('框与大数字用档位强调色', () => {
    const ctx = makeRecordingCtx()
    makeCompareCardDraw(makeData())(ctx as never, SIZE)
    expect(ctx.strokeStyles).toContain('#e08f3a')
    expect(ctx.fillStyles).toContain('#e08f3a')
  })

  it('双人名字分别用蓝笔与红笔', () => {
    const ctx = makeRecordingCtx()
    makeCompareCardDraw(makeData())(ctx as never, SIZE)
    expect(ctx.fillStyles).toContain(PALETTE.bluePen)
    expect(ctx.fillStyles).toContain(PALETTE.redPen)
  })

  it('文字含双方昵称/大数字/称号/最有梗一条/品牌条', () => {
    const ctx = makeRecordingCtx()
    makeCompareCardDraw(makeData())(ctx as never, SIZE)
    const texts = ctx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('阿福')
    expect(texts).toContain('小明')
    expect(texts).toContain('80%')
    expect(texts).toContain('双向奔赴')
    expect(texts.some((t) => t.includes('第 2 题你们想到一起了'))).toBe(true)
    expect(texts.some((t) => t.includes('阿福：'))).toBe(true)
    expect(texts.some((t) => t.includes('小明：'))).toBe(true)
    expect(texts.some((t) => t.includes('默契度测试'))).toBe(true)
  })

  it('全不一致时高亮文案换成「分道扬镳」', () => {
    const allMiss = A.map((v) => (v + 1) % 4)
    const rows = buildComparison('friend', A, allMiss)
    const ctx = makeRecordingCtx()
    makeCompareCardDraw({
      quiz: 'friend',
      initiatorName: '阿福',
      challengerName: '小明',
      score: 0,
      tier: tierFor(0, 'friend'),
      highlight: pickHighlightRow(rows),
    })(ctx as never, SIZE)
    const texts = ctx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts.some((t) => t.includes('第 1 题你们就分道扬镳'))).toBe(true)
    expect(texts).toContain('塑料情谊')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/tacit-test/src/card/draw-invite-card.ts`：

```ts
import type { DrawFn } from '@viral/shared'
import { PALETTE } from '../lib/palette'
import { QUIZZES, type QuizId } from '../lib/questions'
import { styleRemark } from '../lib/style-remark'
import { fillWrappedText, mulberry32, wobblyLine, wobblyRect } from './doodle'

export const CARD_SEED = 42
export const BRAND_TEXT = '默契度测试 · viral-sites'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

export function makeInviteCardDraw(
  quiz: QuizId,
  nickname: string,
  answers: readonly number[],
): DrawFn {
  return (ctx, size) => {
    const rand = mulberry32(CARD_SEED)
    ctx.fillStyle = PALETTE.paper
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.strokeStyle = PALETTE.bluePen
    ctx.lineWidth = 6
    wobblyRect(ctx, 60, 60, size.width - 120, size.height - 120, rand)

    ctx.textAlign = 'center'
    ctx.fillStyle = PALETTE.ink
    ctx.font = `700 76px ${FONT}`
    ctx.fillText('默契度挑战书', size.width / 2, 240)

    ctx.fillStyle = PALETTE.bluePen
    ctx.font = `700 104px ${FONT}`
    ctx.fillText(nickname, size.width / 2, 430)

    ctx.fillStyle = PALETTE.ink
    ctx.font = `400 44px ${FONT}`
    fillWrappedText(ctx, QUIZZES[quiz].declaration, size.width / 2, 560, 20, 64)
    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 38px ${FONT}`
    ctx.fillText(`—— ${QUIZZES[quiz].name} · 10 题`, size.width / 2, 740)

    ctx.strokeStyle = PALETTE.redPen
    ctx.lineWidth = 4
    wobblyLine(ctx, size.width / 2 - 300, 820, size.width / 2 + 300, 820, rand)

    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 36px ${FONT}`
    ctx.fillText('出题人的答题风格', size.width / 2, 920)
    ctx.fillStyle = PALETTE.ink
    ctx.font = `400 44px ${FONT}`
    fillWrappedText(ctx, styleRemark(answers), size.width / 2, 1000, 18, 66)

    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 32px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 100)
  }
}
```

`sites/tacit-test/src/card/draw-compare-card.ts`：

```ts
import type { DrawFn } from '@viral/shared'
import { PALETTE } from '../lib/palette'
import type { QuizId } from '../lib/questions'
import type { ComparisonRow, Tier } from '../lib/scoring'
import { BRAND_TEXT, CARD_SEED } from './draw-invite-card'
import { fillWrappedText, mulberry32, wobblyLine, wobblyRect } from './doodle'

const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'

export interface CompareCardData {
  quiz: QuizId
  initiatorName: string
  challengerName: string
  score: number
  tier: Tier
  highlight: ComparisonRow
}

export function makeCompareCardDraw(data: CompareCardData): DrawFn {
  return (ctx, size) => {
    const rand = mulberry32(CARD_SEED)
    ctx.fillStyle = PALETTE.paper
    ctx.fillRect(0, 0, size.width, size.height)

    ctx.strokeStyle = data.tier.accent
    ctx.lineWidth = 6
    wobblyRect(ctx, 60, 60, size.width - 120, size.height - 120, rand)

    // 双人名字：蓝笔 ×（墨色）红笔 —— 签名元素「两种笔迹」
    ctx.font = `700 64px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillStyle = PALETTE.bluePen
    ctx.fillText(data.initiatorName, size.width / 2 - 70, 230)
    ctx.textAlign = 'center'
    ctx.fillStyle = PALETTE.ink
    ctx.fillText('×', size.width / 2, 230)
    ctx.textAlign = 'left'
    ctx.fillStyle = PALETTE.redPen
    ctx.fillText(data.challengerName, size.width / 2 + 70, 230)

    ctx.textAlign = 'center'
    ctx.fillStyle = data.tier.accent
    ctx.font = `800 250px ${FONT}`
    ctx.fillText(`${data.score}%`, size.width / 2, 560)

    ctx.fillStyle = PALETTE.ink
    ctx.font = `700 76px ${FONT}`
    ctx.fillText(data.tier.title, size.width / 2, 690)
    ctx.font = `400 42px ${FONT}`
    fillWrappedText(ctx, data.tier.remark, size.width / 2, 780, 22, 60)

    ctx.strokeStyle = data.tier.accent
    ctx.lineWidth = 4
    wobblyLine(ctx, size.width / 2 - 320, 920, size.width / 2 + 320, 920, rand)

    // 最有梗的一条逐题对比
    const label = data.highlight.matched
      ? `第 ${data.highlight.index + 1} 题你们想到一起了`
      : `第 ${data.highlight.index + 1} 题你们就分道扬镳`
    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 36px ${FONT}`
    ctx.fillText(label, size.width / 2, 1000)
    ctx.fillStyle = PALETTE.ink
    ctx.font = `400 40px ${FONT}`
    const afterQuestion = fillWrappedText(ctx, data.highlight.question, size.width / 2, 1060, 22, 56)
    ctx.fillStyle = PALETTE.bluePen
    ctx.fillText(
      `${data.initiatorName}：${data.highlight.initiatorOption}`,
      size.width / 2,
      afterQuestion + 30,
    )
    ctx.fillStyle = PALETTE.redPen
    ctx.fillText(
      `${data.challengerName}：${data.highlight.challengerOption}`,
      size.width / 2,
      afterQuestion + 96,
    )

    ctx.fillStyle = PALETTE.pencil
    ctx.font = `400 32px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 100)
  }
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/tacit-test test && pnpm --filter @viral/tacit-test typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 挑战发起卡与默契对比卡绘制"
```

---

### Task 8: 保存与复制组件（SaveCardButton / LongPressOverlay / CopyLinkButton）

**Files:**
- Create: `sites/tacit-test/src/components/save-card-button.tsx`, `sites/tacit-test/src/components/long-press-overlay.tsx`, `sites/tacit-test/src/components/copy-link-button.tsx`
- Test: `sites/tacit-test/src/components/save-card-button.test.tsx`, `sites/tacit-test/src/components/copy-link-button.test.tsx`

**Interfaces:**
- Consumes: `renderCard`/`saveCard`/`track`/`DrawFn`（shared）、`copyText`（Task 5）
- Produces:
  - `<SaveCardButton draw={DrawFn} filename={string} label={string} cardId={'invite' | 'compare'} />` — 点击：`renderCard(draw)` → `saveCard`；成功 `track('save_image', { card: cardId })`；long-press 策略弹 `<LongPressOverlay dataUrl onClose />`；异常 `track('export_error', { card: cardId })` 并提示「保存失败了，直接截图也一样」
  - `<LongPressOverlay dataUrl={string} onClose={() => void} />` — 全屏遮罩 + 图片 + 「长按图片保存」提示
  - `<CopyLinkButton url={string} />` — 点击 `copyText(url)`；成功按钮文案变「已复制，去粘贴给对方吧」并 `track('copy_link')`；失败展示只读输入框（`aria-label="挑战链接"`，聚焦全选）+ 提示「自动复制被拦下了，长按上面这行手动复制」

- [ ] **Step 1: 写失败测试**

`sites/tacit-test/src/components/save-card-button.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { SaveCardButton } from './save-card-button'

describe('SaveCardButton', () => {
  let umamiSpy: ReturnType<typeof vi.fn>
  const draw = vi.fn()

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

  it('桌面：点击触发下载并埋点 save_image 带卡片标识', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton draw={draw} filename="x.png" label="保存挑战发起卡" cardId="invite" />)
    await userEvent.click(screen.getByRole('button', { name: '保存挑战发起卡' }))
    expect(draw).toHaveBeenCalled()
    expect(umamiSpy).toHaveBeenCalledWith('save_image', { card: 'invite' })
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton draw={draw} filename="x.png" label="保存默契对比卡" cardId="compare" />)
    await userEvent.click(screen.getByRole('button', { name: '保存默契对比卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton draw={draw} filename="x.png" label="保存挑战发起卡" cardId="invite" />)
    await userEvent.click(screen.getByRole('button', { name: '保存挑战发起卡' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', { card: 'invite' })
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
```

`sites/tacit-test/src/components/copy-link-button.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyLinkButton } from './copy-link-button'

const URL = 'https://tacit-test.pages.dev/c?d=abc'

describe('CopyLinkButton', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('复制成功：按钮文案切换并埋点 copy_link', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    render(<CopyLinkButton url={URL} />)
    await userEvent.click(screen.getByRole('button', { name: '复制挑战链接' }))
    expect(await screen.findByText('已复制，去粘贴给对方吧')).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('copy_link', undefined)
  })

  it('复制失败：展示可手动复制的只读链接与提示', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported')
    })
    render(<CopyLinkButton url={URL} />)
    await userEvent.click(screen.getByRole('button', { name: '复制挑战链接' }))
    expect(await screen.findByLabelText('挑战链接')).toHaveValue(URL)
    expect(screen.getByText('自动复制被拦下了，长按上面这行手动复制')).toBeInTheDocument()
    expect(umamiSpy).not.toHaveBeenCalledWith('copy_link', undefined)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/tacit-test/src/components/long-press-overlay.tsx`：

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
      <img src={dataUrl} alt="默契度卡片" className="max-h-[70vh] w-auto rounded-lg" />
      <p className="text-sm text-white">长按图片保存</p>
      <p className="text-xs text-[#9b948a]">点击空白处关闭</p>
    </div>
  )
}
```

`sites/tacit-test/src/components/save-card-button.tsx`：

```tsx
import { useState } from 'react'
import { renderCard, saveCard, track, type DrawFn } from '@viral/shared'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  draw: DrawFn
  filename: string
  label: string
  cardId: 'invite' | 'compare'
}

export function SaveCardButton({ draw, filename, label, cardId }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(draw)
      saveCard(canvas, { filename, onLongPress: setOverlayUrl })
      track('save_image', { card: cardId })
    } catch {
      setFailed(true)
      track('export_error', { card: cardId })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSave}
        className="doodle-border tilt-l bg-[#e0483a] py-3 font-medium text-[#fdfbf4]"
      >
        {label}
      </button>
      {failed && <p className="text-sm text-[#9b948a]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
```

`sites/tacit-test/src/components/copy-link-button.tsx`：

```tsx
import { useState } from 'react'
import { track } from '@viral/shared'
import { copyText } from '../lib/copy-link'

interface Props {
  url: string
}

export function CopyLinkButton({ url }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const handleCopy = async () => {
    const ok = await copyText(url)
    setStatus(ok ? 'copied' : 'failed')
    if (ok) track('copy_link')
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="doodle-border tilt-r bg-[#2b59c3] py-3 font-medium text-[#fdfbf4]"
      >
        {status === 'copied' ? '已复制，去粘贴给对方吧' : '复制挑战链接'}
      </button>
      {status === 'failed' && (
        <>
          <input
            readOnly
            value={url}
            aria-label="挑战链接"
            onFocus={(e) => e.target.select()}
            className="sketch-dash bg-transparent px-3 py-2 text-xs text-[#33302b]"
          />
          <p className="text-xs text-[#9b948a]">自动复制被拦下了，长按上面这行手动复制</p>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/tacit-test test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 保存卡片与复制链接组件（微信降级）"
```

---

### Task 9: 流程屏 HomeScreen / NicknameScreen / QuizScreen

**Files:**
- Create: `sites/tacit-test/src/components/home-screen.tsx`, `sites/tacit-test/src/components/nickname-screen.tsx`, `sites/tacit-test/src/components/quiz-screen.tsx`
- Test: `sites/tacit-test/src/components/home-screen.test.tsx`, `sites/tacit-test/src/components/nickname-screen.test.tsx`, `sites/tacit-test/src/components/quiz-screen.test.tsx`

**Interfaces:**
- Consumes: `QUIZZES`/`QuizId`/`Question`（Task 2）、`clampNickname`（Task 3）
- Produces:
  - `<HomeScreen linkInvalid={boolean} onPick={(quiz: QuizId) => void} />` — 标题 + 两个题库入口大按钮（名称 + intro）；`linkInvalid` 时顶部提示「链接失效了，重新发起一个吧」
  - `<NicknameScreen heading={string} sub={string} buttonLabel={string} onSubmit={(nickname: string) => void} />` — 昵称输入（`clampNickname` 实时截断到 8 字）；空昵称不提交并提示「先留个称呼，好让对方知道你是谁」。发起方与应战方落地页共用（应战方 heading = 「XX 向你发起默契挑战」）
  - `<QuizScreen questions={readonly Question[]} pen={'blue' | 'red'} onAnswered={(qIndex: number) => void} onComplete={(answers: number[]) => void} />` — 一屏一题点选即跳；进度「N / 10」；`pen` 控制选项高亮笔色（发起方蓝、应战方红）；答案数组不可变追加；答完第 10 题触发 `onComplete`

- [ ] **Step 1: 写失败测试**

`sites/tacit-test/src/components/home-screen.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HomeScreen } from './home-screen'

describe('HomeScreen', () => {
  it('两个题库入口，点击回调对应 QuizId', async () => {
    const onPick = vi.fn()
    render(<HomeScreen linkInvalid={false} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /好友版/ }))
    expect(onPick).toHaveBeenCalledWith('friend')
    await userEvent.click(screen.getByRole('button', { name: /情侣版/ }))
    expect(onPick).toHaveBeenCalledWith('couple')
  })

  it('默认不显示失效提示', () => {
    render(<HomeScreen linkInvalid={false} onPick={() => {}} />)
    expect(screen.queryByText('链接失效了，重新发起一个吧')).not.toBeInTheDocument()
  })

  it('linkInvalid 时显示失效提示', () => {
    render(<HomeScreen linkInvalid={true} onPick={() => {}} />)
    expect(screen.getByText('链接失效了，重新发起一个吧')).toBeInTheDocument()
  })
})
```

`sites/tacit-test/src/components/nickname-screen.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NicknameScreen } from './nickname-screen'

function setup(onSubmit = vi.fn()) {
  render(
    <NicknameScreen heading="怎么称呼你" sub="写在挑战卡上" buttonLabel="出题" onSubmit={onSubmit} />,
  )
  return onSubmit
}

describe('NicknameScreen', () => {
  it('提交昵称（trim 后）', async () => {
    const onSubmit = setup()
    await userEvent.type(screen.getByLabelText('你的昵称'), ' 阿福 ')
    await userEvent.click(screen.getByRole('button', { name: '出题' }))
    expect(onSubmit).toHaveBeenCalledWith('阿福')
  })

  it('输入实时截断到 8 字', async () => {
    setup()
    const input = screen.getByLabelText('你的昵称')
    await userEvent.type(input, '一二三四五六七八九十')
    expect(input).toHaveValue('一二三四五六七八')
  })

  it('空昵称不提交并提示', async () => {
    const onSubmit = setup()
    await userEvent.click(screen.getByRole('button', { name: '出题' }))
    expect(screen.getByText('先留个称呼，好让对方知道你是谁')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('渲染 heading 与 sub', () => {
    setup()
    expect(screen.getByText('怎么称呼你')).toBeInTheDocument()
    expect(screen.getByText('写在挑战卡上')).toBeInTheDocument()
  })
})
```

`sites/tacit-test/src/components/quiz-screen.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QUIZZES } from '../lib/questions'
import { QuizScreen } from './quiz-screen'

const QUESTIONS = QUIZZES.friend.questions

describe('QuizScreen', () => {
  it('先展示第 1 题与进度 1 / 10', () => {
    render(<QuizScreen questions={QUESTIONS} pen="blue" onAnswered={() => {}} onComplete={() => {}} />)
    expect(screen.getByText(QUESTIONS[0].text)).toBeInTheDocument()
    expect(screen.getByText('1 / 10')).toBeInTheDocument()
  })

  it('点选选项：回调题号并跳到下一题', async () => {
    const onAnswered = vi.fn()
    render(
      <QuizScreen questions={QUESTIONS} pen="blue" onAnswered={onAnswered} onComplete={() => {}} />,
    )
    await userEvent.click(screen.getByRole('button', { name: QUESTIONS[0].options[2] }))
    expect(onAnswered).toHaveBeenCalledWith(0)
    expect(screen.getByText(QUESTIONS[1].text)).toBeInTheDocument()
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
  })

  it('答完 10 题触发 onComplete，答案与点选一致', async () => {
    const onComplete = vi.fn()
    render(
      <QuizScreen questions={QUESTIONS} pen="red" onAnswered={() => {}} onComplete={onComplete} />,
    )
    for (let i = 0; i < 10; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: QUESTIONS[i].options[i % 4] }))
    }
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0]).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 1])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/tacit-test/src/components/home-screen.tsx`：

```tsx
import { QUIZZES, type QuizId } from '../lib/questions'

interface Props {
  linkInvalid: boolean
  onPick: (quiz: QuizId) => void
}

export function HomeScreen({ linkInvalid, onPick }: Props) {
  return (
    <section className="flex flex-col gap-6">
      {linkInvalid && (
        <p className="sketch-dash pen-red px-4 py-3 text-sm">链接失效了，重新发起一个吧</p>
      )}
      <h1 className="text-4xl font-bold">默契度测试</h1>
      <p className="text-sm text-[#9b948a]">
        答 10 道关于你们的题，生成链接甩给对方——对方答完，默契度当场揭晓
      </p>
      {(['friend', 'couple'] as const).map((id, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className={`doodle-border ${i === 0 ? 'pen-blue tilt-l' : 'pen-red tilt-r'} flex flex-col gap-1 px-5 py-4 text-left`}
        >
          <span className="text-xl font-bold">{QUIZZES[id].name}</span>
          <span className="text-sm text-[#9b948a]">{QUIZZES[id].intro}</span>
        </button>
      ))}
    </section>
  )
}
```

`sites/tacit-test/src/components/nickname-screen.tsx`：

```tsx
import { useState } from 'react'
import { clampNickname } from '../lib/challenge-codec'

interface Props {
  heading: string
  sub: string
  buttonLabel: string
  onSubmit: (nickname: string) => void
}

export function NicknameScreen({ heading, sub, buttonLabel, onSubmit }: Props) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = () => {
    const clean = clampNickname(nickname)
    if (clean === '') {
      setError(true)
      return
    }
    onSubmit(clean)
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{heading}</h1>
      <p className="text-sm text-[#9b948a]">{sub}</p>
      <label className="flex flex-col gap-2 text-sm">
        你的昵称
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(clampNickname(e.target.value))}
          placeholder="最多 8 个字"
          className="sketch-dash bg-transparent px-3 py-2 text-lg"
        />
      </label>
      {error && <p className="pen-red text-sm">先留个称呼，好让对方知道你是谁</p>}
      <button
        type="button"
        onClick={handleSubmit}
        className="doodle-border tilt-l bg-[#2b59c3] py-3 font-medium text-[#fdfbf4]"
      >
        {buttonLabel}
      </button>
    </section>
  )
}
```

注意：`clampNickname` 会 trim，用户输入中间态的尾随空格会被立即吃掉——中文昵称几乎不含空格，接受此简化；若要保留中间态，提交时再 clamp 即可，两处测试都按「输入即截断」写。

`sites/tacit-test/src/components/quiz-screen.tsx`：

```tsx
import { useState } from 'react'
import type { Question } from '../lib/questions'

interface Props {
  questions: readonly Question[]
  pen: 'blue' | 'red'
  onAnswered: (qIndex: number) => void
  onComplete: (answers: number[]) => void
}

export function QuizScreen({ questions, pen, onAnswered, onComplete }: Props) {
  const [answers, setAnswers] = useState<readonly number[]>([])
  const current = answers.length
  const question = questions[current]
  const penClass = pen === 'blue' ? 'pen-blue' : 'pen-red'

  const handlePick = (choice: number) => {
    const next = [...answers, choice]
    onAnswered(current)
    if (next.length === questions.length) {
      onComplete([...next])
    } else {
      setAnswers(next)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <p className={`${penClass} text-sm font-bold`}>
        {current + 1} / {questions.length}
      </p>
      <h2 className="min-h-16 text-2xl font-bold leading-snug">{question.text}</h2>
      <div className="flex flex-col gap-3">
        {question.options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => handlePick(i)}
            className={`doodle-border ${penClass} ${i % 2 === 0 ? 'tilt-l' : 'tilt-r'} px-4 py-3 text-left text-base`}
          >
            {opt}
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/tacit-test test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 首页/昵称/一屏一题答题组件"
```

---

### Task 10: 结果屏 InviteScreen / CompareScreen

**Files:**
- Create: `sites/tacit-test/src/components/invite-screen.tsx`, `sites/tacit-test/src/components/compare-screen.tsx`
- Test: `sites/tacit-test/src/components/invite-screen.test.tsx`, `sites/tacit-test/src/components/compare-screen.test.tsx`

**Interfaces:**
- Consumes: `ChallengePayload`（Task 3）、`computeScore`/`tierFor`/`buildComparison`/`pickHighlightRow`（Task 4）、`styleRemark`（Task 5）、`makeInviteCardDraw`/`makeCompareCardDraw`（Task 7）、`SaveCardButton`/`CopyLinkButton`（Task 8）、`QUIZZES`（Task 2）
- Produces:
  - `<InviteScreen payload={ChallengePayload} url={string} />` — 「链接已生成，甩给 TA」+ CopyLinkButton + 答题风格锐评区 + SaveCardButton（发起卡，兜底产出）+ 说明「对方答完，你们的默契度当场揭晓」
  - `<CompareScreen payload={ChallengePayload} challengerName={string} challengerAnswers={readonly number[]} onRestart={() => void} />` — 内部计算 score/tier/rows/highlight；渲染双方昵称（蓝/红笔迹）、默契度大数字、称号、锐评、逐题对比明细（一致行打钩「✓ 想到一起了」并用档位色高亮，不一致行展示 蓝笔发起方选项 / 红笔应战方选项）、SaveCardButton（对比卡，核心传播物）、「我也要发起一个」按钮

- [ ] **Step 1: 写失败测试**

`sites/tacit-test/src/components/invite-screen.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChallengePayload } from '../lib/challenge-codec'
import { STYLE_REMARKS } from '../lib/style-remark'
import { InviteScreen } from './invite-screen'

const PAYLOAD: ChallengePayload = { v: 1, q: 'friend', n: '阿福', a: Array(10).fill(0) }
const URL = 'https://tacit-test.pages.dev/c?d=abc'

describe('InviteScreen', () => {
  it('渲染复制按钮与保存发起卡按钮', () => {
    render(<InviteScreen payload={PAYLOAD} url={URL} />)
    expect(screen.getByRole('button', { name: '复制挑战链接' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存挑战发起卡' })).toBeInTheDocument()
  })

  it('展示发起方答题风格锐评（兜底产出）', () => {
    render(<InviteScreen payload={PAYLOAD} url={URL} />)
    expect(screen.getByText(STYLE_REMARKS['single-minded'])).toBeInTheDocument()
  })

  it('展示闭环引导文案', () => {
    render(<InviteScreen payload={PAYLOAD} url={URL} />)
    expect(screen.getByText(/对方答完，你们的默契度当场揭晓/)).toBeInTheDocument()
  })
})
```

`sites/tacit-test/src/components/compare-screen.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ChallengePayload } from '../lib/challenge-codec'
import { QUIZZES } from '../lib/questions'
import { CompareScreen } from './compare-screen'

const A = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
const B = [1, 1, 2, 3, 0, 1, 2, 3, 0, 2] // 8 题一致 → 80 分
const PAYLOAD: ChallengePayload = { v: 1, q: 'friend', n: '阿福', a: A }

function setup(onRestart = vi.fn()) {
  render(
    <CompareScreen
      payload={PAYLOAD}
      challengerName="小明"
      challengerAnswers={B}
      onRestart={onRestart}
    />,
  )
  return onRestart
}

describe('CompareScreen', () => {
  it('展示双方昵称、默契度大数字与称号', () => {
    setup()
    expect(screen.getByText('阿福')).toBeInTheDocument()
    expect(screen.getByText('小明')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('双向奔赴')).toBeInTheDocument()
  })

  it('逐题对比明细 10 行：一致行打钩，不一致行展示双方选项', () => {
    setup()
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    expect(screen.getAllByText('✓ 想到一起了')).toHaveLength(8)
    // 第 1 题不一致：双方选项原文都在
    expect(screen.getByText(new RegExp(QUIZZES.friend.questions[0].options[0]))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(QUIZZES.friend.questions[0].options[1]))).toBeInTheDocument()
  })

  it('保存对比卡按钮存在', () => {
    setup()
    expect(screen.getByRole('button', { name: '保存默契对比卡' })).toBeInTheDocument()
  })

  it('「我也要发起一个」触发 onRestart', async () => {
    const onRestart = setup()
    await userEvent.click(screen.getByRole('button', { name: '我也要发起一个' }))
    expect(onRestart).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/tacit-test/src/components/invite-screen.tsx`：

```tsx
import type { ChallengePayload } from '../lib/challenge-codec'
import { QUIZZES } from '../lib/questions'
import { styleRemark } from '../lib/style-remark'
import { makeInviteCardDraw } from '../card/draw-invite-card'
import { CopyLinkButton } from './copy-link-button'
import { SaveCardButton } from './save-card-button'

interface Props {
  payload: ChallengePayload
  url: string
}

export function InviteScreen({ payload, url }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">链接已生成，甩给 TA</h1>
      <p className="text-sm text-[#9b948a]">
        {QUIZZES[payload.q].name} · 对方答完，你们的默契度当场揭晓
      </p>
      <CopyLinkButton url={url} />
      <div className="sketch-dash pen-blue flex flex-col gap-2 px-4 py-4">
        <p className="text-sm text-[#9b948a]">你的答题风格</p>
        <p className="text-base text-[#33302b]">{styleRemark(payload.a)}</p>
      </div>
      <SaveCardButton
        draw={makeInviteCardDraw(payload.q, payload.n, payload.a)}
        filename="tacit-invite.png"
        label="保存挑战发起卡"
        cardId="invite"
      />
    </section>
  )
}
```

`sites/tacit-test/src/components/compare-screen.tsx`：

```tsx
import type { ChallengePayload } from '../lib/challenge-codec'
import { buildComparison, computeScore, pickHighlightRow, tierFor } from '../lib/scoring'
import { makeCompareCardDraw } from '../card/draw-compare-card'
import { SaveCardButton } from './save-card-button'

interface Props {
  payload: ChallengePayload
  challengerName: string
  challengerAnswers: readonly number[]
  onRestart: () => void
}

export function CompareScreen({ payload, challengerName, challengerAnswers, onRestart }: Props) {
  const score = computeScore(payload.a, challengerAnswers)
  const tier = tierFor(score, payload.q)
  const rows = buildComparison(payload.q, payload.a, challengerAnswers)
  const highlight = pickHighlightRow(rows)

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-xl font-bold">
          <span className="pen-blue">{payload.n}</span>
          <span className="px-2 text-[#33302b]">×</span>
          <span className="pen-red">{challengerName}</span>
        </p>
        <p className="text-7xl font-extrabold" style={{ color: tier.accent }}>
          {score}%
        </p>
        <p className="text-2xl font-bold">{tier.title}</p>
        <p className="text-sm text-[#9b948a]">{tier.remark}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.index}
            className={`sketch-dash flex flex-col gap-1 px-4 py-3 ${row.matched ? '' : 'opacity-90'}`}
            style={row.matched ? { color: tier.accent } : undefined}
          >
            <p className="text-sm text-[#33302b]">
              {row.index + 1}. {row.question}
            </p>
            {row.matched ? (
              <p className="text-sm font-bold">✓ 想到一起了</p>
            ) : (
              <>
                <p className="pen-blue text-sm">
                  {payload.n}：{row.initiatorOption}
                </p>
                <p className="pen-red text-sm">
                  {challengerName}：{row.challengerOption}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <SaveCardButton
          draw={makeCompareCardDraw({
            quiz: payload.q,
            initiatorName: payload.n,
            challengerName,
            score,
            tier,
            highlight,
          })}
          filename="tacit-result.png"
          label="保存默契对比卡"
          cardId="compare"
        />
        <button type="button" onClick={onRestart} className="py-2 text-sm text-[#9b948a]">
          我也要发起一个
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/tacit-test test && pnpm --filter @viral/tacit-test typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): 发起结果屏与默契对比报告屏"
```

---

### Task 11: App 组装（URL 解析 + 状态机 + 闭环埋点）

**Files:**
- Modify: `sites/tacit-test/src/app.tsx`（替换 Task 1 占位）
- Test: `sites/tacit-test/src/app.test.tsx`

**Interfaces:**
- Consumes: 全部前置组件与纯函数、`track`（shared）
- Produces:
  - `type AppState =`
    - `| { screen: 'home'; linkInvalid: boolean }`
    - `| { screen: 'setup'; quiz: QuizId }`（发起方填昵称）
    - `| { screen: 'quiz-initiate'; quiz: QuizId; nickname: string }`
    - `| { screen: 'invite'; payload: ChallengePayload; d: string }`
    - `| { screen: 'intro'; payload: ChallengePayload }`（应战方落地：复用 NicknameScreen，heading「XX 向你发起默契挑战」）
    - `| { screen: 'quiz-respond'; payload: ChallengePayload; nickname: string }`
    - `| { screen: 'compare'; payload: ChallengePayload; nickname: string; answers: number[] }`
  - `initialAppState(search: string): AppState` — 纯函数：无 `d` → home；`decodeChallenge` 成功 → intro；失败 → home + linkInvalid（提示「链接失效了，重新发起一个吧」，绝不白屏）
  - `<App search?: string />` — `search` 默认 `window.location.search`（测试注入用）；埋点：挂载时带 `d` 记 `challenge_opened`（解码失败追加 `link_invalid`）；发起完成 `track('generate', { quiz })`；应战完成 `track('challenge_completed', { quiz, score })`；每题 `track('q_answered', { q, mode })`；重新发起时 `history.replaceState` 清掉 `?d=` 防止旧参数串场；页脚唯一隐私声明「答案随挑战链接传递，请只发给你信任的人；本站不保存挑战内容」

- [ ] **Step 1: 写失败测试** `sites/tacit-test/src/app.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { encodeChallenge } from './lib/challenge-codec'
import { QUIZZES } from './lib/questions'
import { App, initialAppState } from './app'

const ANSWERS = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]

async function answerAll(pickFor: (i: number) => number) {
  for (let i = 0; i < 10; i += 1) {
    await userEvent.click(
      screen.getByRole('button', { name: QUIZZES.friend.questions[i].options[pickFor(i)] }),
    )
  }
}

describe('initialAppState', () => {
  it('无 d 参数 → home', () =>
    expect(initialAppState('')).toEqual({ screen: 'home', linkInvalid: false }))
  it('合法 d → intro 且 payload 解码正确', () => {
    const d = encodeChallenge('friend', '阿福', ANSWERS)
    const state = initialAppState(`?d=${d}`)
    expect(state.screen).toBe('intro')
    if (state.screen === 'intro') expect(state.payload.n).toBe('阿福')
  })
  it('非法 d → home + linkInvalid', () =>
    expect(initialAppState('?d=garbage!!!')).toEqual({ screen: 'home', linkInvalid: true }))
})

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('发起全流程：选题库 → 昵称 → 10 题 → 链接页，generate 与 q_answered 埋点', async () => {
    render(<App search="" />)
    await userEvent.click(screen.getByRole('button', { name: /好友版/ }))
    await userEvent.type(screen.getByLabelText('你的昵称'), '阿福')
    await userEvent.click(screen.getByRole('button', { name: '出题' }))
    await answerAll((i) => i % 4)
    expect(screen.getByText('链接已生成，甩给 TA')).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('generate', { quiz: 'friend' })
    expect(umamiSpy).toHaveBeenCalledWith('q_answered', { q: 1, mode: 'initiate' })
    expect(umamiSpy).toHaveBeenCalledWith('q_answered', { q: 10, mode: 'initiate' })
  })

  it('应战全流程：intro → 昵称 → 10 题 → 对比页，challenge_opened/completed 埋点', async () => {
    const d = encodeChallenge('friend', '阿福', ANSWERS)
    render(<App search={`?d=${d}`} />)
    expect(screen.getByText('阿福 向你发起默契挑战')).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('challenge_opened', undefined)
    await userEvent.type(screen.getByLabelText('你的昵称'), '小明')
    await userEvent.click(screen.getByRole('button', { name: '接招' }))
    await answerAll((i) => ANSWERS[i]) // 全对
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('灵魂共振')).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('challenge_completed', { quiz: 'friend', score: 100 })
    expect(umamiSpy).toHaveBeenCalledWith('q_answered', { q: 1, mode: 'respond' })
  })

  it('非法链接：落首页提示，challenge_opened 与 link_invalid 都记', () => {
    render(<App search="?d=garbage!!!" />)
    expect(screen.getByText('链接失效了，重新发起一个吧')).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('challenge_opened', undefined)
    expect(umamiSpy).toHaveBeenCalledWith('link_invalid', undefined)
  })

  it('隐私声明常驻页脚（只此一处）', () => {
    render(<App search="" />)
    expect(
      screen.getAllByText('答案随挑战链接传递，请只发给你信任的人；本站不保存挑战内容'),
    ).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/tacit-test test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/tacit-test/src/app.tsx`

```tsx
import { useEffect, useState } from 'react'
import { track } from '@viral/shared'
import {
  buildChallengeUrl,
  decodeChallenge,
  encodeChallenge,
  type ChallengePayload,
} from './lib/challenge-codec'
import { QUIZZES, type QuizId } from './lib/questions'
import { computeScore } from './lib/scoring'
import { CompareScreen } from './components/compare-screen'
import { HomeScreen } from './components/home-screen'
import { InviteScreen } from './components/invite-screen'
import { NicknameScreen } from './components/nickname-screen'
import { QuizScreen } from './components/quiz-screen'

export type AppState =
  | { screen: 'home'; linkInvalid: boolean }
  | { screen: 'setup'; quiz: QuizId }
  | { screen: 'quiz-initiate'; quiz: QuizId; nickname: string }
  | { screen: 'invite'; payload: ChallengePayload; d: string }
  | { screen: 'intro'; payload: ChallengePayload }
  | { screen: 'quiz-respond'; payload: ChallengePayload; nickname: string }
  | { screen: 'compare'; payload: ChallengePayload; nickname: string; answers: number[] }

export function initialAppState(search: string): AppState {
  const d = new URLSearchParams(search).get('d')
  if (d === null) return { screen: 'home', linkInvalid: false }
  const payload = decodeChallenge(d)
  return payload ? { screen: 'intro', payload } : { screen: 'home', linkInvalid: true }
}

interface Props {
  search?: string
}

export function App({ search = window.location.search }: Props) {
  const [state, setState] = useState<AppState>(() => initialAppState(search))

  useEffect(() => {
    const d = new URLSearchParams(search).get('d')
    if (d === null) return
    track('challenge_opened')
    if (decodeChallenge(d) === null) track('link_invalid')
  }, [search])

  const restart = () => {
    // 清掉 ?d=，防止应战方「我也要发起一个」时旧挑战参数串场
    window.history.replaceState(null, '', '/')
    setState({ screen: 'home', linkInvalid: false })
  }

  const finishInitiate = (quiz: QuizId, nickname: string, answers: number[]) => {
    const d = encodeChallenge(quiz, nickname, answers)
    const payload = decodeChallenge(d)
    if (!payload) return // encode 产物必可解码；防御性兜底
    track('generate', { quiz })
    setState({ screen: 'invite', payload, d })
  }

  const finishRespond = (payload: ChallengePayload, nickname: string, answers: number[]) => {
    track('challenge_completed', { quiz: payload.q, score: computeScore(payload.a, answers) })
    setState({ screen: 'compare', payload, nickname, answers })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex-1">
        {state.screen === 'home' && (
          <HomeScreen
            linkInvalid={state.linkInvalid}
            onPick={(quiz) => setState({ screen: 'setup', quiz })}
          />
        )}
        {state.screen === 'setup' && (
          <NicknameScreen
            heading="怎么称呼你"
            sub={`${QUIZZES[state.quiz].name} · 你的名字会写在挑战卡上`}
            buttonLabel="出题"
            onSubmit={(nickname) =>
              setState({ screen: 'quiz-initiate', quiz: state.quiz, nickname })
            }
          />
        )}
        {state.screen === 'quiz-initiate' && (
          <QuizScreen
            questions={QUIZZES[state.quiz].questions}
            pen="blue"
            onAnswered={(i) => track('q_answered', { q: i + 1, mode: 'initiate' })}
            onComplete={(answers) => finishInitiate(state.quiz, state.nickname, answers)}
          />
        )}
        {state.screen === 'invite' && (
          <InviteScreen
            payload={state.payload}
            url={buildChallengeUrl(window.location.origin, state.d)}
          />
        )}
        {state.screen === 'intro' && (
          <NicknameScreen
            heading={`${state.payload.n} 向你发起默契挑战`}
            sub={`${QUIZZES[state.payload.q].name} · 10 道题，答案一致才算默契`}
            buttonLabel="接招"
            onSubmit={(nickname) =>
              setState({ screen: 'quiz-respond', payload: state.payload, nickname })
            }
          />
        )}
        {state.screen === 'quiz-respond' && (
          <QuizScreen
            questions={QUIZZES[state.payload.q].questions}
            pen="red"
            onAnswered={(i) => track('q_answered', { q: i + 1, mode: 'respond' })}
            onComplete={(answers) => finishRespond(state.payload, state.nickname, answers)}
          />
        )}
        {state.screen === 'compare' && (
          <CompareScreen
            payload={state.payload}
            challengerName={state.nickname}
            challengerAnswers={state.answers}
            onRestart={restart}
          />
        )}
      </div>
      <footer className="pt-10 text-center text-xs text-[#9b948a]">
        答案随挑战链接传递，请只发给你信任的人；本站不保存挑战内容
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + 全仓核验**

Run: `pnpm -r test && pnpm -r typecheck && pnpm --filter @viral/tacit-test build`
Expected: 全 PASS，构建成功

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(tacit-test): App 状态机组装与闭环埋点"
```

---

### Task 12: 上线准备（预算核验为止；部署与实测列手工）

**Files:**
- Modify: `sites/tacit-test/index.html`（仅手工步骤替换 umami website-id 时改动）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: 体积预算核验（本任务自动化部分到此为止）**

Run: `pnpm --filter @viral/tacit-test build`
查看 vite 输出的 gzip 列：JS + CSS gzip 合计须 < 100KB。超了先查 react/react-dom 之外是否混入多余依赖（`pnpm --filter @viral/tacit-test list --depth 0`）；题库/文案是纯字符串常量，不构成体积风险。

顺手冒烟：`pnpm --filter @viral/tacit-test dev --host`，本机浏览器走一遍 发起 → 复制链接 → 新标签页打开链接 → 应战 → 对比报告 → 保存卡片；确认 `/c?d=...` 在 dev 下可直达（vite SPA 回退）。

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore(tacit-test): 上线前体积核验"
```

- [ ] **Step 3: 【手工·需用户】创建 umami 站点**

在 umami 后台 Add website（域名 `tacit-test.pages.dev`）→ 拿到 website-id → 替换 `sites/tacit-test/index.html` 里的 `TO_BE_FILLED`。此步骤需要用户账号，执行者停下来向用户要。完成后补一次 commit：`chore(tacit-test): 填入 umami website-id`。

- [ ] **Step 4: 【手工·需用户】部署 Cloudflare Pages**

```bash
pnpm dlx wrangler login        # 需要用户浏览器授权
pnpm dlx wrangler pages project create tacit-test --production-branch main
pnpm --filter @viral/tacit-test build
pnpm dlx wrangler pages deploy sites/tacit-test/dist --project-name tacit-test
```

产出 `https://tacit-test.pages.dev`。部署后先在桌面浏览器验证：直开 `/c?d=<任意合法编码>` 不 404（`_worker.js` 回退生效）、`/api/send` 上报 200。

- [ ] **Step 5: 【手工·需用户】微信双机实测长参数链接（设计文档 §9/§10 上线清单）**

- [ ] 手机 A 微信内发起 → 复制链接 → 发给手机 B
- [ ] 手机 B 微信内点开：链接不被截断/转义/拦截，intro 页正常（`d` 约 150 字符的 query 完整到达）
- [ ] 手机 B 答完出对比报告 → 长按保存对比卡到相册 → 发回手机 A
- [ ] 手机 A 保存发起卡（长按路径）；桌面 Chrome 走直接下载路径
- [ ] QQ / 钉钉粘贴链接各试一次，确认不被转义
- [ ] umami 后台看到 pageview / generate / challenge_opened / challenge_completed / q_answered / save_image 事件
- [ ] 若微信拦截或吞参数：启用设计文档 §10 备选方案（短域名 + 参数进 hash `#d=`），此时需回改 `initialAppState` 的解析源并重新验证——作为独立迭代处理，不在本计划内展开
- [ ] 全部通过后更新 `README.md` 路线图中 06 行状态为已上线（若尚无 06 行则新增），commit：`chore: tacit-test 上线，更新状态`

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §3 双流程（发起 Task 9/11、应战 Task 9/10/11，兜底发起卡 Task 7/10）、§4 题库两套各 10 题×4 选项全文（Task 2，配置驱动）、§5 URL 编码规格逐字落实（Task 3：`/c?d=` + base64url(JSON) + v/q/n/a 严格校验 + 昵称双重截断 + 失效落首页文案；`/c` 静态托管回退 Task 1 `_worker.js`）、§6 计分五档与锐评 + 逐题对比明细（Task 4/10）、§7 两张卡与档位配色（Task 7）、§8 闭环埋点全事件 + 闭环率口径（Global Constraints + Task 11）、§9 测试清单（roundtrip/边界 0~100 分档/手工微信双机 Task 3/4/12）、§10 风险（长链接实测与 hash 备选在 Task 12 手工清单）。00a 涂鸦风：色板、双人双色笔迹、CSS 手绘感、favicon 签名元素（Task 1/7）。
- **占位符扫描**：无 TBD/TODO/「实现期补充」。`index.html` 的 `data-website-id="TO_BE_FILLED"` 是与 life-grid 一致的部署时约定值，由 Task 12 手工步骤替换，非计划占位符；Task 12 三个【手工·需用户】步骤明确标注，非占位。
- **类型一致性**：`QuizId`/`Question`/`QuizSet`（Task 2 定义，3/4/7/9/10/11 消费）、`ChallengePayload`（Task 3 定义，10/11 消费）、`Tier`/`ComparisonRow`（Task 4 定义，7/10 消费）、`Rand`/doodle 辅助（Task 6 定义，7 消费）、`DrawFn`/`CardSize`/`renderCard`/`saveCard`/`track`（shared 现有导出 `packages/shared/src/index.ts`，7/8 消费，签名与源码逐一核对一致：`track(event, data?: Record<string, string | number>)`、`renderCard(draw, size?)`、`saveCard(canvas, { filename, onLongPress, userAgent? })`）、`RecordingCtx`（Task 1 定义，6/7/8/11 消费）。
- **设计文档矛盾（已按硬标准裁决）**：§4 的示例题「TA 深夜 emo 会先干嘛」「TA 最近一次让你心动是因为什么」是单方视角题，与同节「答案客观存在、双方视角一致」的硬标准冲突——题库未采用示例原题，涉及「谁」的题一律用「发起挑战的那位 / 接招的这位」对称指代改写（Task 2 说明）。
- **埋点语义核对**：`generate` 在编码成功生成链接时记（不是答完题就记），`challenge_opened` 对一切带 `d` 的访问记（含解码失败，另加 `link_invalid` 区分），与 §8 闭环率分子分母口径一致；`save_image` 带 `card` 维度区分两张卡，与工厂保存率口径兼容。
- **格式硬性要求核对**：任务数 12（8~14 区间内）；每任务含 Files / Interfaces(Consumes/Produces 精确签名) / checkbox 步骤；TDD 先完整失败测试后完整实现，每步附 Run/Expected；commit 均为 conventional 且无 Co-Authored-By。
