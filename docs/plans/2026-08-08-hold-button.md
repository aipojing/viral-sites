# 按住不放挑战（15）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成移动端优先的按住挑战：可靠计时、中断即结束、20 分钟封顶、本地最好成绩、同源匿名成绩提交、今日可信百分位、挑战链接与像素街机分享卡。

**Architecture:** `sites/hold-button` 保存主站 `/hold-button/` 玩法源码以及可独立测试的成绩 API handler，但不拥有部署入口；`sites/home` 懒加载前端，并由唯一主站 Worker 将 `/api/hold-button/*` 分发给该 handler。handler 使用 HMAC 签名短会话、D1 唯一约束和 trigger 保证一次提交只计数一次；预聚合直方图计算百分位，Rate Limiting binding 只做宽松防滥用。静态资源、Umami、未知 API、scheduled 入口和部署均由主站 Worker 负责。

**Tech Stack:** Vite 8 · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 · Cloudflare Workers Static Assets · D1 · Workers Rate Limiting binding · `@cloudflare/vitest-pool-workers` · Canvas 2D

## Global Constraints

- 依据 `docs/15-hold-button.md`；执行前必须有 25 个已审核时长节点、移动端中断原型、匿名数据方案和日预算。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；生产页面固定 `/hold-button/`，API 固定 `/api/hold-button/*`，不得创建第二个 `wrangler.jsonc`、Worker 服务或 deploy script。
- 官方计时上限固定 `20 * 60 * 1000ms`；5 分钟后常驻舒适提示；不增加震动轰炸、闪烁或惩罚音效。
- 计时事实使用 `performance.now()`；rAF 仅显示。`pointerup`、`pointercancel`、`visibilitychange:hidden`、`blur`、锁屏和达到上限结束。
- 触屏和桌面分布分开；键盘空格可体验但归入 desktop。
- 先显示本地时长，再提交服务端；服务端失败时保留本地最好成绩并显示明确降级文案。
- Worker 不保存 IP、UA、昵称或设备指纹。D1 只保留匿名 nonce、UTC+8 日期、时长秒桶、设备大类、可信状态和时间戳。
- 百分位只统计可信成绩；不展示绝对榜一。Rate Limiting binding 是宽松且最终一致的防滥用层，精确单次提交由 D1 `PRIMARY KEY` 保证。
- `HOLD_SESSION_SECRET` 只通过主站 Worker secret 注入，禁止进入仓库或前端 bundle。
- API 与静态站同源；不开放通配 CORS。
- 首屏 gzip `<100KB`；像素感只用于数字、图标和边框，中文正文用系统字体。
- 一周判断：落地到开始≥35%、有效完成≥80%、中位时长≥20 秒、卡片保存率≥8%、挑战链接访问占比≥10%；挑战回流低于 5% 时不扩排行榜。

## File Map

```text
sites/hold-button/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts
  index.html
  test/setup.ts  test/canvas-stub.ts
  worker/
    router.ts (+test)  env.ts  response.ts
    auth.ts (+test)  time.ts (+test)  api.ts (+test)
  migrations/0001_init.sql
  src/
    main.tsx  index.css  app.tsx (+test)
    content/milestones.ts  content/milestones.test.ts
    lib/timer-machine.ts (+test)
    lib/storage.ts (+test)
    lib/api-client.ts (+test)
    lib/challenge.ts (+test)
    components/landing-screen.tsx (+test)
    components/hold-screen.tsx (+test)
    components/result-screen.tsx (+test)
    components/save-card-button.tsx (+test)
    components/long-press-overlay.tsx
    card/draw-score-card.ts (+test)

sites/home/
  hold-button/index.html
  public/previews/hold-button.avif
  vite.config.ts
  wrangler.jsonc
  worker/index.ts
  worker/routes.ts (+test)
  src/projects.ts (+test)
  src/experience-loaders.ts (+test)
```

---

### Task 1: 玩法模块、API handler 与测试脚手架

**Files:**
- Create: `sites/hold-button/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/index.css`, `src/app.tsx`, `test/setup.ts`, `worker/router.ts`, `worker/env.ts`
- Copy: `sites/life-grid/test/canvas-stub.ts` → `sites/hold-button/test/canvas-stub.ts`

**Interfaces:**

```ts
export interface HoldButtonEnv {
  HOLD_DB: D1Database
  HOLD_SUBMIT_LIMITER: RateLimit
  HOLD_SESSION_SECRET: string
  HOLD_SCORES_ENABLED: string
}

export function handleHoldButtonApi(
  request: Request,
  env: HoldButtonEnv,
  ctx: ExecutionContext,
): Promise<Response>
```

- [ ] **Step 1: 创建包并安装依赖**

```bash
pnpm --filter @viral/hold-button add react@^19 react-dom@^19 '@viral/shared@workspace:*'
pnpm --filter @viral/hold-button add -D typescript@^7 vite@^8 @vitejs/plugin-react tailwindcss@^4 @tailwindcss/vite@^4 vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/react @types/react-dom @cloudflare/workers-types
```

`package.json` scripts 固定为：

```json
{
  "dev": "vite",
  "build": "tsc --noEmit && vitest run && vite build",
  "test": "pnpm test:ui && pnpm test:worker",
  "test:ui": "vitest run --config vitest.config.ts",
  "test:worker": "pnpm --filter @viral/home test:worker -- ../hold-button/worker",
  "typecheck": "tsc --noEmit && tsc --noEmit -p worker/tsconfig.json"
}
```

- [ ] **Step 2: 接入统一 Worker 测试配置**

UI 配置沿用 life-grid。需要 D1/Rate Limiting binding 的测试由 `sites/home/vitest.worker.config.ts` 读取唯一 `sites/home/wrangler.jsonc`；纯 auth/time/response 测试仍可在模块 Vitest 内运行。执行时若已安装版本的 config schema 与官方文档不同，先依据 Cloudflare 官方文档调整配置并把差异记录进计划执行日志，不绕过 Worker 测试。

- [ ] **Step 3: 配置命名空间 API handler**

`worker/router.ts` 只接受 `/api/hold-button/*`：`POST session`、`POST finish`、`GET today` 进入业务 API，其他 method 返回 405，其他子路径返回 JSON 404。它不处理静态资源、Umami 或其他玩法；D1/rate limiter bindings 直到 Task 8 才写入 `sites/home/wrangler.jsonc`，database id 必须来自真实创建命令。

- [ ] **Step 4: 写最小 Worker 路由测试与实现**

```ts
export async function handleHoldButtonApi(
  request: Request,
  env: HoldButtonEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  const pathname = new URL(request.url).pathname
  if (!pathname.startsWith('/api/hold-button/')) return Response.json({ code: 'not_found' }, { status: 404 })
  return routeHoldApi(request, env, ctx)
}
```

测试未知玩法子路由、错误 method、disabled 开关和三个合法 endpoint；Umami、未知全局 API 与 ASSETS 由 home Worker 的测试覆盖。

- [ ] **Step 5: 运行脚手架验证并提交**

```bash
pnpm --filter @viral/hold-button test
pnpm --filter @viral/hold-button typecheck
git add sites/hold-button pnpm-lock.yaml
git commit -m "chore(hold-button): scaffold the portal challenge module"
```

---

### Task 2: D1 数据模型与 UTC+8 工具

**Files:**
- Create: `sites/hold-button/migrations/0001_init.sql`
- Create: `sites/hold-button/worker/time.ts`
- Create: `sites/hold-button/worker/time.test.ts`

**Interfaces:**

```ts
export type DeviceType = 'touch' | 'desktop'
export function dateKeyUTC8(epochMs: number): string
export function durationBucket(durationMs: number): number // 整秒，0..1200
```

- [ ] **Step 1: 写 UTC+8 与桶失败测试**

覆盖 UTC 日期前后跨北京时间零点、负值拒绝、19999ms→19、20 分钟封顶→1200。

- [ ] **Step 2: 写迁移**

```sql
CREATE TABLE sessions (
  nonce TEXT PRIMARY KEY,
  started_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('touch', 'desktop'))
);

CREATE TABLE runs (
  nonce TEXT PRIMARY KEY,
  day_key TEXT NOT NULL,
  duration_bucket INTEGER NOT NULL CHECK (duration_bucket BETWEEN 0 AND 1200),
  device_type TEXT NOT NULL CHECK (device_type IN ('touch', 'desktop')),
  trusted INTEGER NOT NULL CHECK (trusted IN (0, 1)),
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE daily_histogram (
  day_key TEXT NOT NULL,
  device_type TEXT NOT NULL,
  duration_bucket INTEGER NOT NULL,
  run_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day_key, device_type, duration_bucket)
);

CREATE TRIGGER increment_trusted_histogram
AFTER INSERT ON runs WHEN NEW.trusted = 1
BEGIN
  INSERT INTO daily_histogram(day_key, device_type, duration_bucket, run_count)
  VALUES (NEW.day_key, NEW.device_type, NEW.duration_bucket, 1)
  ON CONFLICT(day_key, device_type, duration_bucket)
  DO UPDATE SET run_count = run_count + 1;
END;

CREATE INDEX sessions_expiry_idx ON sessions(expires_at_ms);
CREATE INDEX runs_created_idx ON runs(created_at_ms);
```

- [ ] **Step 3: 在 Worker 测试池应用 migration fixture 并测试唯一约束/trigger**

```bash
pnpm --filter @viral/hold-button test:worker
```

测试 setup 读取 `sites/hold-button/migrations/0001_init.sql` 并应用到本地 `HOLD_DB` binding，不创建远程数据库。Worker 集成测试插入同 nonce 两次，第二次失败且直方图只增加一次；插入 `trusted=0` 不增加直方图。真正的 Wrangler local/remote migration 等 Task 8 获得真实 database id 后再执行。

- [ ] **Step 4: 提交**

```bash
git add sites/hold-button/migrations sites/hold-button/worker
git commit -m "feat(hold-button): add anonymous score storage"
```

---

### Task 3: HMAC 短会话与单次提交 API

**Files:**
- Create: `sites/hold-button/worker/auth.ts`
- Create: `sites/hold-button/worker/auth.test.ts`
- Create: `sites/hold-button/worker/response.ts`
- Create: `sites/hold-button/worker/api.ts`
- Create: `sites/hold-button/worker/api.test.ts`
- Modify: `sites/hold-button/worker/router.ts`

**Interfaces:**

```ts
interface SessionPayload { nonce: string; startedAt: number; expiresAt: number; deviceType: DeviceType }
interface StartResponse { token: string; startedAt: number; expiresAt: number; todayCount: number }
interface FinishRequest { token: string; clientDurationMs: number }
interface FinishResponse {
  durationMs: number
  durationBucket: number
  percentile: number | null
  trusted: boolean
}

export function signSession(payload: SessionPayload, secret: string): Promise<string>
export function verifySession(token: string, secret: string, now: number): Promise<SessionPayload>
export function handleHoldButtonApi(
  request: Request,
  env: HoldButtonEnv,
  ctx: ExecutionContext,
): Promise<Response>
```

- [ ] **Step 1: 写 auth 失败测试**

覆盖 Web Crypto HMAC SHA-256、篡改 payload/signature、过期、非法 base64url、常量时间签名比较和不接受未知 device type。

- [ ] **Step 2: 实现签名 token**

token 格式固定为 `<base64url(UTF-8 JSON)>.<base64url(HMAC)>`。nonce 使用 `crypto.getRandomValues(new Uint8Array(16))`，不使用 `Math.random()`。

- [ ] **Step 3: 写 API 失败测试**

`POST /api/hold-button/session`：只接受 `{deviceType}`，通过 rate limiter 后创建 25 分钟过期 session。`POST /api/hold-button/finish`：验签、查 session、计算服务端 elapsed、校验上限、插入 run；同 token 第二次返回 409。`GET /api/hold-button/today?device=touch`：只返回总人数和各公开阈值人数，不返回 run。

可信规则固定为：

```ts
const serverDuration = Math.min(now - session.started_at_ms, 20 * 60_000)
const drift = Math.abs(serverDuration - body.clientDurationMs)
const trusted = drift <= 2_500 && body.clientDurationMs >= 0 && body.clientDurationMs <= 20 * 60_000
```

2.5 秒容差吸收开始响应和结束请求网络延迟；超过容差的成绩进入 `runs(trusted=0)` 隔离，不参与百分位。

成功插入 run 后删除对应 session；如果删除失败，`runs.nonce PRIMARY KEY` 仍保证重放不会再次进入 trigger。并发双提交中一个成功、另一个因唯一约束映射为 409。

- [ ] **Step 4: 实现百分位查询**

```sql
SELECT
  COALESCE(SUM(CASE WHEN duration_bucket < ?1 THEN run_count ELSE 0 END), 0) AS below,
  COALESCE(SUM(run_count), 0) AS total
FROM daily_histogram
WHERE day_key = ?2 AND device_type = ?3;
```

`percentile = total === 0 ? null : Math.round(below / total * 100)`；只表达“超过 X%”，不加半个同分桶。

- [ ] **Step 5: 实现宽松限流与隐私边界**

使用 `cf-connecting-ip` 作为 Rate Limiting binding 的瞬时 key；key 不写 D1/日志。限流响应 429；binding 异常时不破坏 D1 唯一约束。API JSON 响应统一 `cache-control:no-store`，错误不回显 token 或 SQL。

- [ ] **Step 6: 运行 Worker 验证并提交**

```bash
pnpm --filter @viral/hold-button test:worker
pnpm --filter @viral/hold-button typecheck
git add sites/hold-button/worker
git commit -m "feat(hold-button): add signed score sessions"
```

---

### Task 4: 计时状态机与中断规则

**Files:**
- Create: `sites/hold-button/src/lib/timer-machine.ts`
- Create: `sites/hold-button/src/lib/timer-machine.test.ts`

**Interfaces:**

```ts
export type FinishReason = 'released' | 'cancelled' | 'hidden' | 'blurred' | 'limit'
export type HoldState =
  | { phase: 'idle' }
  | { phase: 'preparing'; countdownStartedAt: number }
  | { phase: 'holding'; startedAt: number; shownMs: number }
  | { phase: 'finished'; durationMs: number; reason: FinishReason }

export function startPreparation(now: number): HoldState
export function beginHolding(now: number): HoldState
export function tickHold(state: HoldState, now: number): HoldState
export function finishHold(state: HoldState, now: number, reason: FinishReason): HoldState
```

- [ ] **Step 1: 写失败测试**

覆盖 3 秒准备、rAF 掉帧不影响最终值、所有中断原因、重复 finish 幂等、20 分钟封顶、系统时钟变化不影响（只传 monotonic 值）。

- [ ] **Step 2: 实现纯状态机**

最终时长只用 `Math.min(now - startedAt, MAX_HOLD_MS)`；`shownMs` 不能作为事实值。`finishHold` 只有 holding 可转 finished。

- [ ] **Step 3: 运行测试并提交**

```bash
pnpm --filter @viral/hold-button test:ui -- src/lib/timer-machine.test.ts
git add sites/hold-button/src/lib/timer-machine*
git commit -m "feat(hold-button): add monotonic hold timing"
```

---

### Task 5: 25 节点内容、本地最好成绩与挑战链接

**Files:**
- Create: `sites/hold-button/src/content/milestones.ts`
- Create: `sites/hold-button/src/content/milestones.test.ts`
- Create: `sites/hold-button/src/lib/storage.ts`
- Create: `sites/hold-button/src/lib/storage.test.ts`
- Create: `sites/hold-button/src/lib/challenge.ts`
- Create: `sites/hold-button/src/lib/challenge.test.ts`

**Interfaces:**

```ts
interface HoldMilestone { atMs: number; text: string }
interface HoldTitle { minMs: number; title: string }
export function milestoneAt(durationMs: number): HoldMilestone
export function titleAt(durationMs: number): HoldTitle
export function loadPersonalBest(storage: Storage): number
export function savePersonalBest(storage: Storage, durationMs: number): number
export function buildChallengeUrl(base: URL, durationMs: number): string
export function parseChallengeTarget(url: URL): number | null
```

- [ ] **Step 1: 写失败测试**

节点严格递增、至少 25 个、首个 ≤3 秒、最后覆盖 20 分钟、每条 ≤32 code points、禁用羞辱/身体能力词；称号阈值固定且覆盖“路过按了一下/有点耐心/按钮研究员/另一只手生活家/人类通关”；storage JSON 损坏降级；挑战值 clamp 0～20 分钟且不影响服务端成绩。

- [ ] **Step 2: 实现并完成人工文案审核**

节点固定按“前密后疏”配置，至少覆盖 3s、10s、30s、2m、5m、10m、20m。`milestoneAt` 返回 `atMs <= durationMs` 的最后一个节点。`buildChallengeUrl` 固定生成 `${base.origin}/hold-button/?beat=<durationMs>`，不得生成根路径 `/?beat=` 或外部域名。

- [ ] **Step 3: 运行测试并提交**

```bash
pnpm --filter @viral/hold-button test:ui -- src/content/milestones.test.ts src/lib/storage.test.ts src/lib/challenge.test.ts
git add sites/hold-button/src/content sites/hold-button/src/lib/storage* sites/hold-button/src/lib/challenge*
git commit -m "feat(hold-button): add milestones and local records"
```

---

### Task 6: API 客户端与三屏流程

**Files:**
- Create: `sites/hold-button/src/lib/api-client.ts`
- Create: `sites/hold-button/src/lib/api-client.test.ts`
- Create: `sites/hold-button/src/components/landing-screen.tsx`
- Create: `sites/hold-button/src/components/landing-screen.test.tsx`
- Create: `sites/hold-button/src/components/hold-screen.tsx`
- Create: `sites/hold-button/src/components/hold-screen.test.tsx`
- Create: `sites/hold-button/src/components/result-screen.tsx`
- Create: `sites/hold-button/src/components/result-screen.test.tsx`
- Modify: `sites/hold-button/src/app.tsx`
- Create: `sites/hold-button/src/app.test.tsx`

**Interfaces:**

```ts
export interface HoldApi {
  start(deviceType: DeviceType, signal?: AbortSignal): Promise<StartResponse>
  finish(token: string, durationMs: number, signal?: AbortSignal): Promise<FinishResponse>
}
```

- [ ] **Step 1: 写失败交互测试**

验证首页人数/最好成绩/挑战目标；打开带 `beat` 的链接记录一次 `challenge_opened`；3 秒倒计时；pointer capture；双指不重启；pointercancel/hidden/blur 结束；键盘长按空格；5 分钟提示；本地结果先出现；API 成功补百分位但不覆盖本地计时，失败显示保留本机；`challenge_started/finished/generate` 事件参数只有桶、原因、设备。

- [ ] **Step 2: 实现 API 客户端**

客户端只调用 `/api/hold-button/session` 与 `/api/hold-button/finish`。所有非 2xx 解析为稳定 `HoldApiError { status, code }`；响应必须经过手写类型守卫，不信任任意 JSON。请求超时由 App 的 AbortController 控制，组件卸载 abort。

- [ ] **Step 3: 实现 HoldScreen 事件绑定**

pointer 主键记录 `activePointerId`；只允许首个 pointer 控制。按压层使用 `touch-action:none` 和 pointer capture，允许区域内滑动但不触发页面滚动。空格键 `keydown` 忽略 repeat，`keyup` 结束。注册的 window/document 监听器在 effect cleanup 全部移除。

- [ ] **Step 4: 实现 App 编排**

App 状态为 `landing | preparing | holding | result`。点击首页只开始 3 秒准备；真正 pointerdown/空格按下进入 holding 的同一刻才启动本地 monotonic 计时并请求 session，避免把准备倒计时算进服务端成绩。若用户在 session 响应前松手，等待该 promise 后提交；请求失败则保持 `localOnly`。结束顺序：完成本地状态 → 更新 personal best → `track('generate')` → 异步 finish → 只补 percentile/trusted，不覆盖用户看到的本地 duration。

- [ ] **Step 5: 运行测试并提交**

```bash
pnpm --filter @viral/hold-button test:ui
git add sites/hold-button/src/lib/api-client* sites/hold-button/src/components sites/hold-button/src/app*
git commit -m "feat(hold-button): build the complete hold flow"
```

---

### Task 7: 像素成绩卡与分享

**Files:**
- Create: `sites/hold-button/src/card/draw-score-card.ts`
- Create: `sites/hold-button/src/card/draw-score-card.test.ts`
- Create: `sites/hold-button/src/components/save-card-button.tsx`
- Create: `sites/hold-button/src/components/save-card-button.test.tsx`
- Create: `sites/hold-button/src/components/long-press-overlay.tsx`
- Modify: `sites/hold-button/src/components/result-screen.tsx`

**Interfaces:**

```ts
interface ScoreCardData {
  durationMs: number
  percentile: number | null
  title: string
  challengeUrl: string
}
export function makeScoreCardDraw(data: ScoreCardData): DrawFn
```

- [ ] **Step 1: 写失败测试**

覆盖 0 秒、20 分钟、无网络百分位、最长称号、链接品牌条、1080×1440 边界；保存事件与挑战复制事件分开；卡片不得显示“全球第 N”。

- [ ] **Step 2: 实现卡片与挑战动作**

层级固定为时长大数字 → 百分位或本地提示 → 称号 → “你能按得比我久吗” → 可识别链接。复制挑战链接记录 `challenge_shared { channel:'copy' }`，不携带 token。

- [ ] **Step 3: 运行测试并提交**

```bash
pnpm --filter @viral/hold-button test:ui
git add sites/hold-button/src/card sites/hold-button/src/components
git commit -m "feat(hold-button): add score cards and challenges"
```

---

### Task 8: 主站接入、数据清理、预算退化与发布验证

**Files:**
- Create: `sites/home/hold-button/index.html`
- Create: `sites/home/public/previews/hold-button.avif`
- Modify: `sites/home/vite.config.ts`
- Modify: `sites/home/src/projects.ts`
- Modify: `sites/home/src/projects.test.ts`
- Modify: `sites/home/src/experience-loaders.ts`
- Modify: `sites/home/src/experience-loaders.test.ts`
- Modify: `sites/home/worker/index.ts`
- Modify: `sites/home/worker/routes.ts`
- Modify: `sites/home/worker/routes.test.ts`
- Modify: `sites/home/wrangler.jsonc`
- Modify: `sites/hold-button/src/index.css`
- Modify: `README.md`

- [ ] **Step 1: 增加 scheduled 清理测试与实现**

每天删除过期 sessions、保留 30 天 runs、保留 90 天 histogram；先删 runs 再删 histogram。`sites/hold-button/worker/api.ts` 导出 `cleanupHoldData(env, now)`，`sites/home/worker/index.ts` 的唯一 scheduled handler 调用它；失败只记录聚合错误，不输出数据行。

- [ ] **Step 2: 配置预算退化开关**

主站 Worker env var `HOLD_SCORES_ENABLED` 只有字符串 `'true'` 时开放 session/finish；否则 API 返回 `{code:'scores_disabled'}`，前端自动进入纯本地模式。这个开关是成本熔断，不阻止静态玩法运行。

- [ ] **Step 3: 写失败测试并接入主站**

首页测试先断言 `hold-button` 的 href 为 `/hold-button/` 且 loader key 一致；Worker 测试断言只有 `/api/hold-button/*` 进入 `handleHoldButtonApi`，未知子路由 JSON 404。创建主站页面 HTML、预览图、Vite MPA input、literal loader 和 projects metadata；主站 Worker 导入 feature handler，玩法代码不得反向 import home。

- [ ] **Step 4: 运行全量验证**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/hold-button test
pnpm --filter @viral/hold-button typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home test:worker
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
```

Expected：全部退出码 0；`sites/home/dist/hold-button/index.html` 存在；玩法懒加载首屏 gzip `<100KB`；未知 `/api/hold-button/x` 不回退 HTML。

- [ ] **Step 5: 安全与真机 gate**

从主站首页进入 `/hold-button/`，四环境验证刷新直达、返回首页、pointer/keyboard、切后台/锁屏/来电模拟、双指、20 分钟假时钟、断网、429、重复 token、篡改 token、预算关闭、卡片保存和 `/hold-button/?beat=` 挑战回流。检查 D1 确无 IP/UA/自由文本列；用并发双提交证明 histogram 只加一次。

- [ ] **Step 6: 创建生产资源并统一部署（人工授权）**

```bash
pnpm --filter @viral/home exec wrangler d1 create hold-button
pnpm --filter @viral/home exec wrangler d1 migrations apply hold-button --remote
pnpm --filter @viral/home exec wrangler secret put HOLD_SESSION_SECRET
pnpm --filter @viral/home deploy:dry
pnpm --filter @viral/home deploy
```

将第一条命令返回的真实 D1 id 写入 `sites/home/wrangler.jsonc` 的 `HOLD_DB` binding，并设置 `migrations_dir: "../hold-button/migrations"`、`HOLD_SUBMIT_LIMITER` 与 `HOLD_SCORES_ENABLED=true`。部署前由用户明确授权生产写入；不得发布 `sites/hold-button/dist`。

- [ ] **Step 7: 更新状态并提交**

```bash
git add sites/hold-button sites/home/hold-button sites/home/public/previews/hold-button.avif sites/home/vite.config.ts sites/home/src sites/home/worker sites/home/wrangler.jsonc README.md pnpm-lock.yaml
git commit -m "docs(hold-button): record release readiness"
```
