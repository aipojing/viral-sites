# 怪好玩统一主站接入与单服务部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 固化“一个主站、多个站内玩法、一个构建产物、一个线上服务”的工程契约，让现有和未来玩法都通过 `sites/home` 的同源路径进入，并为 AI 判官与按住不放提供同一个主站 Worker 下的命名空间 API。

**Architecture:** 保留 `sites/<slug>` 作为玩法源码、单元测试和本地调试边界；生产入口只属于 `sites/home`。`sites/home` 继续使用 Vite MPA 输出 `/` 与 `/<slug>/index.html`，`experience-entry.tsx` 按首段路径懒加载一个玩法，Cloudflare Worker Static Assets 只从 `sites/home/dist` 提供静态文件，并在 `/api/*` 和少数深链接上优先执行统一 Worker 路由。

**Tech Stack:** pnpm workspace · Vite 8 MPA · React 19 · TypeScript(strict) · Vitest 3 · Testing Library · Cloudflare Workers Static Assets · Wrangler 4 · D1（仅按住不放）· Durable Objects/KV（仅 AI 判官）

## Global Constraints

- 线上只能存在一个“怪好玩”前端部署；不得为任何玩法新建独立 Pages/Workers 静态站，也不得在 `projects.ts` 配置外部站点 URL。
- 生产构建与发布入口固定为 `@viral/home`；`sites/<slug>` 的 `dev/test/typecheck` 可保留，独立 `build` 只作模块自检，产物不得发布。
- 每个新玩法必须同时登记同源路径、Vite MPA 输入、懒加载器、首页元数据、独立页面 metadata 和主站构建验证；任一项缺失都视为未接入。
- 玩法页面全屏展示自己的设计，仅由 `experience-entry.tsx` 注入统一“返回怪好玩”入口；不使用 iframe，不强行套首页完整导航。
- 玩法 CSS 只在对应懒加载分支加载；禁止从首页静态 import 所有玩法 CSS。玩法可设置 `body` 视觉，但不得修改或移除 `.portal-home-link`。
- API 必须按玩法命名空间：`/api/ai-judge/*`、`/api/hold-button/*`；`/api/send` 专用于 Umami 代理。不得新增无归属的 `/api/session`、`/api/verdict` 等全局路径。
- Cloudflare 资源绑定名必须带玩法前缀；统一 Worker 入口负责路由、404、静态资源回退和公共响应头，玩法 handler 不直接调用其他玩法 handler。
- `wrangler.jsonc` 只存在于 `sites/home`；D1 migration 存在 `sites/hold-button/migrations`，DO/KV 业务代码存在 `sites/ai-judge/worker`，但都由主站 Worker 导入并部署。
- `compatibility_date` 在实施当天设为真实当天日期；生产资源 id 必须来自 Wrangler 创建命令，计划与仓库不得提交虚构 id 或 secret。
- 任何部署、远程 migration、secret 写入和外部模型真实调用都需要用户另行明确授权；计划编写和本地实现不构成生产授权。
- 每个 Task 采用 TDD，验证命令必须新鲜运行；每次提交只包含该 Task 明确列出的文件，不夹带工作区其他未提交改动。

---

## File Map

```text
sites/home/
  package.json                         # 唯一生产 build/deploy scripts
  vite.config.ts                       # 首页 + 全部玩法的 MPA input
  wrangler.jsonc                       # 唯一 Cloudflare Worker/Assets/bindings 配置
  vitest.worker.config.ts              # 统一 Worker 测试入口
  worker/
    index.ts                           # /api 分发、深链接改写、ASSETS fallback
    env.ts                             # PortalEnv 与绑定类型
    response.ts                        # JSON 404/405/安全响应头
    umami.ts (+test)                   # /api/send 白名单代理
    routes.ts (+test)                  # 纯路由判定
  src/
    projects.ts (+test)                # 首页展示数据，href 只能是 /<slug>/
    experience-entry.tsx               # 按 path 首段懒加载玩法
    experience-loaders.ts (+test)      # slug → literal dynamic import
  <slug>/index.html                    # 每个玩法独立 title/description/theme-color
  scripts/verify-integrated-build.mjs  # 检查 dist 中所有玩法入口与同源资源

sites/<slug>/
  src/app.tsx                          # 被 home 懒加载的唯一生产 UI 导出
  src/index.css                        # 只随该玩法 chunk 加载
  src/main.tsx                         # 可选本地调试入口，不是生产入口
  package.json                         # 模块 test/typecheck/dev；不得含 deploy

sites/ai-judge/worker/*                # 导出 handleAiJudgeApi 与 AiJudgeEnv 子集
sites/hold-button/worker/*             # 导出 handleHoldButtonApi 与 HoldButtonEnv 子集
sites/hold-button/migrations/*         # HOLD_DB migration，由 home Wrangler 执行
```

## 接入接口

```ts
export type ExperienceSlug =
  | 'life-grid'
  | 'mental-state'
  | 'tacit-test'
  | 'cyber-fortune'
  | 'refusal-generator'
  | 'internet-age'

export type ExperienceLoader = () => Promise<React.ComponentType>

export interface FeatureApiHandler<E> {
  (request: Request, env: E, ctx: ExecutionContext): Promise<Response>
}
```

纯前端玩法只实现 `App` 和 route loader。AI 判官、按住不放额外导出：

```ts
export function handleAiJudgeApi(
  request: Request,
  env: AiJudgeEnv,
  ctx: ExecutionContext,
): Promise<Response>

export function handleHoldButtonApi(
  request: Request,
  env: HoldButtonEnv,
  ctx: ExecutionContext,
): Promise<Response>
```

---

### Task 1: 固化现有主站集成契约

**Files:**
- Create: `sites/home/src/experience-loaders.ts`
- Create: `sites/home/src/experience-loaders.test.ts`
- Modify: `sites/home/src/experience-entry.tsx`
- Modify: `sites/home/src/projects.test.ts`

**Interfaces:**
- Produces: `experienceLoaders: Readonly<Record<ExperienceSlug, ExperienceLoader>>`
- Consumes: 每个现有玩法的 `src/app.tsx` 默认命名导出 `App`

- [ ] **Step 1: 写失败的注册表一致性测试**

```ts
import { describe, expect, it } from 'vitest'
import { experienceLoaders } from './experience-loaders'
import { projects } from './projects'

describe('experience registry', () => {
  it('首页项目、懒加载器和同源路径一一对应', () => {
    expect(Object.keys(experienceLoaders).sort()).toEqual(
      projects.map(({ slug }) => slug).sort(),
    )
    for (const project of projects) expect(project.href).toBe(`/${project.slug}/`)
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm --filter @viral/home test -- src/experience-loaders.test.ts`

Expected：FAIL，`experience-loaders.ts` 不存在。

- [ ] **Step 3: 抽出 literal dynamic import 注册表**

每个 loader 必须继续使用字面量 import，保证 Vite 能静态发现并拆 chunk：

```ts
export const experienceLoaders = {
  'life-grid': async () => {
    const [module] = await Promise.all([
      import('../../life-grid/src/app'),
      import('../../life-grid/src/index.css'),
    ])
    return module.App
  },
  'mental-state': async () => {
    const [module] = await Promise.all([
      import('../../mental-state/src/app'),
      import('../../mental-state/src/index.css'),
    ])
    return module.App
  },
  'tacit-test': async () => {
    const [module] = await Promise.all([
      import('../../tacit-test/src/app'),
      import('../../tacit-test/src/index.css'),
    ])
    return module.App
  },
  'cyber-fortune': async () => {
    const [module] = await Promise.all([
      import('../../cyber-fortune/src/app'),
      import('../../cyber-fortune/src/index.css'),
    ])
    return module.App
  },
  'refusal-generator': async () => {
    const [module] = await Promise.all([
      import('../../refusal-generator/src/app'),
      import('../../refusal-generator/src/index.css'),
    ])
    return module.App
  },
  'internet-age': async () => {
    const [module] = await Promise.all([
      import('../../internet-age/src/app'),
      import('../../internet-age/src/index.css'),
    ])
    return module.App
  },
} satisfies Record<ExperienceSlug, ExperienceLoader>
```

后续详细计划每接入一个新玩法，就在同一提交中向 `ExperienceSlug` union、`experienceLoaders`、`projects` 和 Vite MPA input 各增加该 slug；不得提前声明尚不存在的模块。

`experience-entry.tsx` 只负责解析 `window.location.pathname`、选择 loader、注入 `.portal-home-link` 和 mount；删除其中原有内联 `loaders`。

- [ ] **Step 4: 运行主站测试与类型检查**

```bash
pnpm --filter @viral/home test
pnpm --filter @viral/home typecheck
```

Expected：全部退出码为 0，六个现有玩法 key 完全一致。

- [ ] **Step 5: 提交**

```bash
git add sites/home/src/experience-entry.tsx sites/home/src/experience-loaders.ts sites/home/src/experience-loaders.test.ts sites/home/src/projects.test.ts
git commit -m "refactor(home): formalize the integrated experience registry"
```

---

### Task 2: 建立唯一主站 Worker 与静态资源路由

**Files:**
- Create: `sites/home/wrangler.jsonc`
- Create: `sites/home/vitest.worker.config.ts`
- Create: `sites/home/worker/env.ts`
- Create: `sites/home/worker/routes.ts`
- Create: `sites/home/worker/routes.test.ts`
- Create: `sites/home/worker/response.ts`
- Create: `sites/home/worker/index.ts`
- Modify: `sites/home/package.json`
- Modify: `sites/home/tsconfig.json`

**Interfaces:**

```ts
export interface PortalEnv { ASSETS: Fetcher }
export type PortalRoute =
  | { kind: 'umami' }
  | { kind: 'ai-judge' }
  | { kind: 'hold-button' }
  | { kind: 'rewrite'; pathname: '/tacit-test/' }
  | { kind: 'asset' }
  | { kind: 'api-not-found' }
export function classifyPortalRoute(url: URL): PortalRoute
```

- [ ] **Step 1: 写失败的路由判定测试**

覆盖 `/api/send`、`/api/ai-judge/verdict`、`/api/hold-button/session`、未知 `/api/x`、`/tacit-test/c?d=...` 和普通静态路径；断言未知 API 不回退首页。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/home test -- worker/routes.test.ts`

Expected：FAIL，路由模块不存在。

- [ ] **Step 3: 实现基础 Worker 配置**

`sites/home/wrangler.jsonc` 初始只配置静态资产，不虚构后续资源 id：

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "guaihaowan",
  "main": "worker/index.ts",
  "compatibility_date": "2026-08-08",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "none",
    "run_worker_first": ["/api/*", "/tacit-test/c*"]
  },
  "observability": { "enabled": true }
}
```

`worker/index.ts` 的顺序固定为：公共 API → 玩法 API → 深链接改写 → 未知 API JSON 404 → `env.ASSETS.fetch(request)`。当前 AI/hold handler 尚未落地时，对应命名空间返回 `503 {code:'feature_unavailable'}`，不能误回首页 HTML。

- [ ] **Step 4: 增加唯一 build/deploy scripts**

`@viral/home` scripts 固定包含：

```json
{
  "build": "tsc --noEmit && vitest run && vite build",
  "test:worker": "vitest run --config vitest.worker.config.ts",
  "cf:typegen": "wrangler types",
  "deploy:dry": "pnpm build && wrangler deploy --dry-run",
  "deploy": "pnpm build && wrangler deploy"
}
```

安装 `wrangler`、`@cloudflare/workers-types` 与 Worker Vitest 所需依赖；不在任何玩法 package 增加 `deploy`。

- [ ] **Step 5: 运行本地验证**

```bash
pnpm --filter @viral/home test
pnpm --filter @viral/home test:worker
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home deploy:dry
```

Expected：全部退出码为 0；dry-run 只验证 bundle，不创建或修改生产资源。

- [ ] **Step 6: 提交**

```bash
git add sites/home/package.json sites/home/tsconfig.json sites/home/wrangler.jsonc sites/home/vitest.worker.config.ts sites/home/worker pnpm-lock.yaml
git commit -m "feat(home): add the single portal worker entry"
```

---

### Task 3: 统一 Umami 代理并修复默契测试深链接

**Files:**
- Create: `sites/home/worker/umami.ts`
- Create: `sites/home/worker/umami.test.ts`
- Create: `sites/home/public/u.js`
- Modify: `sites/home/.env.example`
- Modify: `sites/home/index.html`
- Modify: `sites/home/life-grid/index.html`
- Modify: `sites/home/mental-state/index.html`
- Modify: `sites/home/tacit-test/index.html`
- Modify: `sites/home/cyber-fortune/index.html`
- Modify: `sites/home/refusal-generator/index.html`
- Modify: `sites/home/internet-age/index.html`
- Modify: `sites/home/worker/index.ts`
- Modify: `sites/tacit-test/src/lib/challenge-codec.ts`
- Modify: `sites/tacit-test/src/lib/challenge-codec.test.ts`
- Modify: `sites/tacit-test/src/app.tsx`
- Test: `sites/home/worker/routes.test.ts`

**Interfaces:**

```ts
export function buildChallengeUrl(origin: string, data: string): string
// 返回 `${origin}/tacit-test/c?d=${encodeURIComponent(data)}`

export function proxyUmami(request: Request): Promise<Response>
```

- [ ] **Step 1: 写失败的同站分享链接与代理测试**

断言 `buildChallengeUrl('https://guaihaowan.example','abc')` 返回 `https://guaihaowan.example/tacit-test/c?d=abc`；Worker 收到该深链接时把 pathname 改写为 `/tacit-test/` 且保留 query。代理只接受 POST、只转发既有白名单 headers，上游失败返回 202 空响应且不阻断玩法。

- [ ] **Step 2: 运行并确认失败**

```bash
pnpm --filter @viral/tacit-test test -- src/lib/challenge-codec.test.ts
pnpm --filter @viral/home test:worker
```

Expected：旧链接仍指向 `/c`，Worker 代理模块不存在。

- [ ] **Step 3: 实现深链接和单一代理**

从现有各玩法 `public/_worker.js` 提取已经验证的 Umami header 白名单到 `sites/home/worker/umami.ts`，并把一份审核过的 `u.js` 放到 home public。`.env.example` 只保留 `VITE_UMAMI_WEBSITE_ID=`；首页和六个玩法 HTML 的 `</head>` 前统一加入：

```html
<script
  defer
  src="/u.js"
  data-website-id="%VITE_UMAMI_WEBSITE_ID%"
  data-host-url="/"
  data-exclude-search="true"
  data-exclude-hash="true"
></script>
```

生产构建若 website id 为空则 build 门禁失败，测试环境可以注入固定假 UUID。`experience-entry` 仍按首段 `tacit-test` 加载应用；`App` 继续从 search 读取 `d`，不把挑战数据写入统计事件。

- [ ] **Step 4: 完整验证并提交**

```bash
pnpm --filter @viral/tacit-test test
pnpm --filter @viral/home test
pnpm --filter @viral/home test:worker
pnpm --filter @viral/home build
git add sites/home/.env.example sites/home/index.html sites/home/*/index.html sites/home/public/u.js sites/home/worker sites/tacit-test/src/lib/challenge-codec* sites/tacit-test/src/app.tsx
git commit -m "fix(home): keep shared challenges inside the portal"
```

---

### Task 4: 建立新玩法接入门禁

**Files:**
- Create: `sites/home/scripts/verify-integrated-build.mjs`
- Create: `sites/home/scripts/verify-integrated-build.test.mjs`
- Modify: `sites/home/package.json`
- Modify: `sites/home/vite.config.ts`
- Modify: `sites/home/src/projects.ts`
- Modify: `sites/home/.env.example`
- Modify: `docs/00-factory-design.md`
- Modify: `README.md`

**Interfaces:**

```ts
export function verifyIntegratedBuild(input: {
  rootDir: string
  slugs: readonly string[]
}): readonly string[] // 返回错误列表；空数组表示通过
```

- [ ] **Step 1: 写失败的产物校验测试**

fixture 覆盖：缺少 `dist/<slug>/index.html`、HTML 引用外部玩法域名、缺少 `/assets/` chunk、首页存在 `VITE_*_URL` 外跳配置；成功 fixture 返回空数组。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/home test -- scripts/verify-integrated-build.test.mjs`

Expected：FAIL，校验器不存在。

- [ ] **Step 3: 由 Vite 构建生成 manifest**

`vite.config.ts` 直接 import `projects`，MPA inputs 与 manifest 都从同一数组推导；loader 仍保持 literal imports。加入以下 plugin，manifest 只含 slug/title/path：

```ts
const experienceManifest = {
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
```

Vite input 使用 `Object.fromEntries(projects.map(({slug}) => [slug, page(`./${slug}/index.html`)]))` 与 `home` 合并。测试断言重复 slug、非 `/${slug}/` path 或缺少页面 HTML 时配置生成失败。

- [ ] **Step 4: 实现校验器并接入 build**

`verify-integrated-build.mjs` 读取 `dist/experience-manifest.json`，逐个 `access(dist/<slug>/index.html)`，读取 HTML 并拒绝 `pages.dev`、`VITE_*_URL`、非 `/assets/` 的玩法脚本 URL；错误逐行写 stderr 并设置 `process.exitCode = 1`。导出纯函数供 fixture 测试，同时只在 `import.meta.url === pathToFileURL(process.argv[1]).href` 时执行 CLI。

把 home build 更新为：

```json
{
  "build": "tsc --noEmit && vitest run && vite build && node scripts/verify-integrated-build.mjs"
}
```

- [ ] **Step 5: 更新工厂文档**

把“每站一个 Cloudflare Pages project”改为：玩法源码独立、`sites/home` 统一 MPA 构建、统一 Worker Static Assets 部署。README 的“已上线”链接使用主域名路径；确认 `sites/home/.env.example` 只保留统一统计配置，不再含外站 URL 变量。

- [ ] **Step 6: 运行并提交**

```bash
pnpm --filter @viral/home build
git add sites/home/scripts sites/home/package.json sites/home/vite.config.ts sites/home/src sites/home/.env.example docs/00-factory-design.md README.md
git commit -m "test(home): enforce single-deployment experience builds"
```

---

### Task 5: 单服务发布演练与回归基线

**Files:**
- Create: `docs/plans/evidence/unified-home-local-verification.md`
- Modify: `sites/home/design-qa.md`

- [ ] **Step 1: 运行全部自动验证**

```bash
pnpm test
pnpm typecheck
pnpm --filter @viral/home build
pnpm --filter @viral/home deploy:dry
```

Expected：全部退出码为 0；`sites/home/dist` 同时包含首页和所有登记玩法；dry-run 只有一个 Worker bundle 和一个静态资源目录。

- [ ] **Step 2: 本地浏览器逐路由验收**

启动 `pnpm --filter @viral/home dev --host 0.0.0.0`，逐个检查 `/`、六个现有 `/<slug>/`、`/tacit-test/c?d=<fixture>`、未知 `/api/x` 和未知页面。每个玩法需验证首屏、一次核心流程、返回首页、刷新直达和移动端 320px；未知 API 必须 JSON 404，未知页面不得伪装成首页 200。

- [ ] **Step 3: 记录证据**

`unified-home-local-verification.md` 写入执行时间、commit、命令退出码、逐路由结果和已知非阻塞问题，不写 Cookie、secret、IP、挑战 payload 或用户输入。

- [ ] **Step 4: 生产部署前人工授权**

只有用户明确授权后才运行：

```bash
pnpm --filter @viral/home deploy
```

部署后在唯一主域名重复首页、所有玩法、深链接、`/api/send` 和 404 验收；不得再发布任何 `sites/<slug>/dist`。

- [ ] **Step 5: 提交本地验收记录**

```bash
git add docs/plans/evidence/unified-home-local-verification.md sites/home/design-qa.md
git commit -m "docs(home): record the single-service verification baseline"
```

---

## 新玩法接入完成定义

每个新玩法详细计划的最后一个 Task 必须逐项满足：

- [ ] `sites/<slug>/src/app.tsx` 导出 `App`，模块测试和类型检查通过。
- [ ] `sites/home/<slug>/index.html` 有唯一 title、description、theme-color 与站内 favicon。
- [ ] `sites/home/vite.config.ts` 有 `/<slug>/index.html` MPA input。
- [ ] `sites/home/src/experience-loaders.ts` 扩展 `ExperienceSlug` 并使用 literal dynamic import 加载该玩法 App/CSS。
- [ ] `sites/home/src/projects.ts` 只有 `href: '/<slug>/'`，不存在外部 URL 环境变量。
- [ ] 首页预览资源已提供，`projects.test.ts` 与 registry parity test 通过。
- [ ] `pnpm --filter @viral/home build` 后存在 `sites/home/dist/<slug>/index.html`。
- [ ] 浏览器直达、首页进入、刷新、返回首页、320px 和 reduced-motion 验收通过。
- [ ] 若有 API，只调用 `/api/<slug>/*`；统一 Worker 测试覆盖成功、校验失败、限流、上游失败和未知子路由。
- [ ] 生产发布命令只有 `pnpm --filter @viral/home deploy`，且必须等待用户明确授权。
