# 下一问（20）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成一个无登录的六人问题接力：发起者提出 Q1，第 2～6 席依次回答上一问并留下下一问，第 6 席把 Q6 问回发起者；系统用一次性 capability token、强一致状态推进和可保存结果卡完成传播闭环。

**Architecture:** `sites/next-question` 保存 React 玩法、纯业务模型、分享卡和命名空间 API handler；生产入口仍是 `sites/home` 的唯一 Worker。每条随机 slug 映射到一个 SQLite-backed Durable Object `NextQuestionChain`，所有状态转换通过类型化 RPC 完成；主站 Worker 负责 `/api/next-question/*`、链条 HTML shell、Static Assets、创建限流和公共响应头。

**Tech Stack:** pnpm workspace · Vite 8 MPA · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 · Testing Library · Cloudflare Workers Static Assets · Durable Objects SQLite · Workers Rate Limiting binding · Web Crypto · Canvas 2D · QR Code · `@viral/shared`

## Global Constraints

- 依据 `docs/20-next-question.md`；产品名固定“下一问”，slug 固定 `next-question`。
- 一条链固定 6 个席位，发起者是第 1 席；第 6 席的问题只能问回发起者。不得增加人数选择或无限接力。
- 生产页面固定 `/next-question/`，链页固定 `/next-question/c/<slug>`，API 固定 `/api/next-question/*`。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)：只允许 `sites/home/wrangler.jsonc` 和一个生产 Worker；玩法包不得拥有 deploy script。
- 开始 Task 1 前，统一主站计划的 Worker Static Assets、`PortalEnv`、路由、Worker 测试池和构建门禁必须已经完成；若 `sites/home/wrangler.jsonc` 或 `sites/home/worker/index.ts` 不存在，先执行该计划，不在本计划内建立第二套基础设施。
- Cloudflare 当前配置使用 declarative `exports` 声明 SQLite-backed Durable Object；不得为新 namespace 使用 KV-backed Durable Object。若实施时官方配置 schema 已变化，以实施当天官方文档和已安装 Wrangler schema 为准，并把差异记录进验证证据。
- 昵称 1～8、问题 1～60、回答 1～200，均按 NFC 归一化后的 Unicode code points 计数；前后端执行同一约束。
- 链条默认 unlisted、全站 `noindex`；不建立广场、排行榜、搜索、评论、关注、私信或陌生人匹配。
- capability token 只放 URL fragment 或 `Authorization`；禁止 query token、Cookie、localStorage 全局账号和 token 埋点。
- API、Worker 日志和 Umami 事件不得记录 slug、token、昵称、问题或回答；错误响应不得回显 capability token。
- 当前棒只能成功提交一次；并发提交必须一个成功、其余得到 `409 chain_advanced`。每个写请求必须支持 `requestId` 幂等重试。
- 未完成链最后一次动作后 7 天过期；完成链 90 天过期。过期使用 Durable Object alarm，不使用 `setTimeout`。
- 发起者可删除整条链；每席可用本机保存的席位 token 撤回自己的内容。删除和撤回是公开验证前的硬门槛。
- 创建端使用 Workers Rate Limiting binding；接棒端同时受 capability token 与当前状态约束。Rate Limiting 是防滥用层，不承担精确业务状态。
- v1 不使用 D1、KV、R2、Queues、Workflows、WebSocket、AI、邮件、推送和付费。
- 所有实现采用 TDD；每个 Task 运行新鲜验证。任何 deploy、远程资源变更或生产 secret 写入都需要用户另行明确授权。

## Execution Prerequisite

执行前运行：

```bash
test -f sites/home/wrangler.jsonc
test -f sites/home/worker/index.ts
test -f sites/home/worker/env.ts
test -f sites/home/vitest.worker.config.ts
pnpm --filter @viral/home test
pnpm --filter @viral/home test:worker
```

Expected：全部退出码为 0。当前仓库在 2026-08-09 已有玩法 loader 和 Worker route 测试，但统一 Worker 文件尚未全部落地；因此首次执行本计划前预计需要先完成统一主站计划。

## File Map

```text
sites/next-question/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts
  index.html
  test/setup.ts  test/canvas-stub.ts
  worker/
    env.ts
    types.ts
    validation.ts (+test)
    tokens.ts (+test)
    question-chain.ts (+test)
    api.ts (+test)
    router.ts (+test)
  src/
    main.tsx  index.css
    app.tsx (+test)
    lib/api-client.ts (+test)
    lib/token-vault.ts (+test)
    lib/chain-url.ts (+test)
    lib/share.ts (+test)
    components/landing-screen.tsx (+test)
    components/baton-screen.tsx (+test)
    components/handoff-screen.tsx (+test)
    components/progress-screen.tsx (+test)
    components/result-screen.tsx (+test)
    components/error-screen.tsx
    components/save-card-button.tsx (+test)
    components/long-press-overlay.tsx
    card/qr-matrix.ts (+test)
    card/draw-baton-card.ts (+test)
    card/draw-result-card.ts (+test)

sites/home/
  next-question/index.html
  public/previews/next-question.png
  package.json
  vite.config.ts
  wrangler.jsonc
  worker/index.ts
  worker/env.ts
  worker/routes.ts (+test)
  worker/next-question-shell.ts (+test)
  src/projects.ts (+test)
  src/experience-loaders.ts (+test)
```

## Shared Interfaces

```ts
export type ChainStatus =
  | 'waiting'
  | 'returned'
  | 'completed'
  | 'expired'
  | 'deleted'
  | 'cancelled'
export type Slot = 1 | 2 | 3 | 4 | 5 | 6

export interface ChainEntry {
  slot: Slot
  nickname: string
  answer: string | null
  question: string
  submittedAt: number
  redacted: boolean
}

export interface PublicChain {
  slug: string
  status: ChainStatus
  nextSlot: Slot | null
  entries: readonly ChainEntry[]
  createdAt: number
  updatedAt: number
  expiresAt: number
}

export interface CreateChainInput {
  requestId: string
  installationId: string
  nickname: string
  question: string
}

export interface SubmitBatonInput {
  requestId: string
  nickname: string
  answer: string
  question: string
}

export interface CloseChainInput {
  requestId: string
  answer: string
}

export interface CreateChainResult {
  chain: PublicChain
  ownerToken: string
  batonToken: string
}

export interface SubmitBatonResult {
  chain: PublicChain
  participantToken: string
  nextBatonToken: string | null
}

export interface NextQuestionEnv {
  NEXT_QUESTION_CHAINS: DurableObjectNamespace<NextQuestionChain>
  NEXT_QUESTION_CREATE_LIMITER: RateLimit
}

export function handleNextQuestionApi(
  request: Request,
  env: NextQuestionEnv,
  ctx: ExecutionContext,
): Promise<Response>
```

---

### Task 1: 建立玩法包、领域类型与输入验证

**Files:**
- Create: `sites/next-question/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `test/setup.ts`, `test/canvas-stub.ts`
- Create: `sites/next-question/worker/env.ts`, `worker/types.ts`, `worker/validation.ts`, `worker/validation.test.ts`
- Create: `sites/next-question/src/main.tsx`, `src/index.css`, `src/app.tsx`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: 本计划 `Shared Interfaces` 中的所有数据类型。
- Produces: `normalizeNickname`, `normalizeQuestion`, `normalizeAnswer`, `parseCreateChainInput`, `parseSubmitBatonInput`, `parseCloseChainInput`。
- Consumes: `@viral/shared` 的 `track` 与分享卡能力。

- [ ] **Step 1: 创建 workspace 包并安装依赖**

先用 `apply_patch` 创建 `sites/next-question/package.json`：

```json
{
  "name": "@viral/next-question",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@viral/shared": "workspace:*",
    "qrcode": "^1.5.4",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^5.20260808.1",
    "@tailwindcss/vite": "^4.3.3",
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/qrcode": "^1.5.6",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^6.0.5",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4.3.3",
    "typescript": "^7.0.2",
    "vite": "^8.2.0",
    "vitest": "^3.2.7"
  }
}
```

然后同步 lockfile：

```bash
pnpm install
```

不增加 `deploy`。`vite.config.ts` 沿用现有 React + Tailwind 配置；`src/main.tsx` 只用于玩法包独立本地调试，生产由 home loader 挂载 `App`。

- [ ] **Step 2: 写输入验证失败测试**

覆盖：NFC 归一、首尾空白、中文与 emoji code point 计数、空昵称、9 字昵称、61 字问题、201 字回答、CRLF 归一、C0 控制字符、`http://`、`https://`、`www.`、邮箱和连续 11 位手机号。

```ts
expect(normalizeNickname('  阿杰  ')).toBe('阿杰')
expect(() => normalizeQuestion('https://example.com')).toThrow('contact_not_allowed')
expect(() => normalizeAnswer('13800138000')).toThrow('contact_not_allowed')
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @viral/next-question test -- worker/validation.test.ts`

Expected：FAIL，验证函数不存在。

- [ ] **Step 4: 实现共享验证与类型**

所有文本执行 `normalize('NFC')`、CRLF→LF、trim；昵称不允许换行，问题不允许换行，回答最多保留 3 行。只返回稳定错误 code，不把原文写入 `Error.message`。

```ts
export class InputError extends Error {
  constructor(public readonly code: 'required' | 'too_long' | 'invalid_character' | 'contact_not_allowed') {
    super(code)
  }
}
```

- [ ] **Step 5: 运行并提交**

```bash
pnpm --filter @viral/next-question test
pnpm --filter @viral/next-question typecheck
git add sites/next-question pnpm-lock.yaml
git commit -m "chore(next-question): scaffold the relay experience"
```

---

### Task 2: 实现 capability token 与 Durable Object 六席状态机

**Files:**
- Create: `sites/next-question/worker/tokens.ts`
- Create: `sites/next-question/worker/tokens.test.ts`
- Create: `sites/next-question/worker/question-chain.ts`
- Create: `sites/next-question/worker/question-chain.test.ts`
- Modify: `sites/home/wrangler.jsonc`
- Modify: `sites/home/worker/env.ts`
- Modify: `sites/home/worker/index.ts`
- Modify: `sites/home/vitest.worker.config.ts`

**Interfaces:**

```ts
export function randomSecret(): string
export function deriveCapability(chainSecret: string, purpose: string): Promise<string>
export function equalCapability(actual: string, expected: string): boolean

export class NextQuestionChain extends DurableObject<NextQuestionEnv> {
  create(slug: string, input: Omit<CreateChainInput, 'installationId'>, now: number): Promise<CreateChainResult>
  getPublic(now: number): Promise<PublicChain | null>
  submitBaton(token: string, input: SubmitBatonInput, now: number): Promise<SubmitBatonResult>
  close(token: string, input: CloseChainInput, now: number): Promise<PublicChain>
  redact(token: string, slot: Slot, requestId: string, now: number): Promise<PublicChain>
  deleteChain(token: string, requestId: string, now: number): Promise<void>
  alarm(): Promise<void>
}
```

- [ ] **Step 1: 配置 SQLite-backed DO binding**

在唯一 `sites/home/wrangler.jsonc` 合并：

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "NEXT_QUESTION_CHAINS", "class_name": "NextQuestionChain" }
    ]
  },
  "exports": {
    "NextQuestionChain": { "type": "durable-object", "storage": "sqlite" }
  }
}
```

如果文件已有其他 bindings/exports，只追加对应项，不覆盖。`sites/home/worker/index.ts` 必须具名 re-export：

```ts
export { NextQuestionChain } from '../../next-question/worker/question-chain'
```

运行 `pnpm --filter @viral/home cf:typegen`，让 `PortalEnv` 使用生成 binding 类型；不要手写与生成类型冲突的全局声明。

- [ ] **Step 2: 写 token 失败测试**

覆盖 32-byte 随机 secret、同 secret+purpose 稳定、purpose 不同结果不同、错误长度/字符拒绝、常量时间 XOR 比较逻辑和 token 不含 `+`、`/`、`=`。

- [ ] **Step 3: 写 DO 状态失败测试**

使用 `cloudflare:test` 的 `env` 与 `runInDurableObject` 覆盖：

- 首次 create 生成 slot1/Q1，状态 `waiting nextSlot=2`。
- create 同 `requestId` 返回同 owner/baton token；不同内容同 requestId 不覆盖首次内容。
- slot2～5 每次插入一行并推进下一席。
- slot6 提交后状态 `returned nextSlot=1`，`nextBatonToken=null`。
- owner close 补写 slot1.answer 并进入 `completed`。
- 当前 token 重放返回原幂等结果；不同 requestId 重放得到 409。
- 两个不同 requestId 并发提交同一席，恰好一个成功。
- 错误 token 403、过期 410、状态非法 409。
- alarm 在未完成 7 天和完成 90 天时清空内容并留下 `expired` tombstone。
- 席位撤回会清空幂等响应；撤回当前未回答问题时进入 `cancelled` 并让当前 baton 失效，撤回历史内容时链条继续。
- owner 删除会清空 entries/submissions/chain secret，只留下不含用户内容的 `deleted` tombstone。

- [ ] **Step 4: 实现 SQLite schema 与原子推进**

构造函数只执行 `CREATE TABLE IF NOT EXISTS`。表结构按设计文档的 `chain / entries / submissions`；所有状态读取与写入使用同步 SQLite SQL API，token HMAC 的 `await` 完成后必须重新读取当前状态再写。连续 SQL 写入保持在同一个 RPC turn 中，不在中间调用外部 fetch。`redact` 必须同步更新 entry、清空 submissions，并在被撤回问题仍是当前待答问题时把状态写为 `cancelled`；`deleteChain` 必须同步清空 entries/submissions、置空 chain secret 并写入 `deleted`。

席位推进规则固定：

```ts
const nextSlot = currentSlot === 6 ? 1 : ((currentSlot + 1) as Slot)
const status: ChainStatus = currentSlot === 6 ? 'returned' : 'waiting'
```

写入完成后设置 alarm：未完成 `now + 7 * 86400_000`，完成 `now + 90 * 86400_000`。状态变化、entry 插入、submission 幂等响应和过期时间必须在同一批同步 SQL 写入中完成。

- [ ] **Step 5: 运行 Worker 测试与提交**

```bash
pnpm --filter @viral/home test:worker -- ../../next-question/worker/question-chain.test.ts
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home deploy:dry
git add sites/next-question/worker sites/home/wrangler.jsonc sites/home/worker sites/home/vitest.worker.config.ts
git commit -m "feat(next-question): add durable six-seat relay state"
```

`deploy:dry` 只验证 bundle/config；不得运行真实 deploy。

---

### Task 3: 实现命名空间 API、创建幂等与防滥用

**Files:**
- Create: `sites/next-question/worker/api.ts`
- Create: `sites/next-question/worker/api.test.ts`
- Create: `sites/next-question/worker/router.ts`
- Create: `sites/next-question/worker/router.test.ts`
- Modify: `sites/home/wrangler.jsonc`
- Modify: `sites/home/worker/env.ts`
- Modify: `sites/home/worker/routes.ts`
- Modify: `sites/home/worker/routes.test.ts`
- Modify: `sites/home/worker/index.ts`

**Interfaces:**

```ts
export function slugForRequestId(requestId: string): Promise<string>
export function bearerToken(request: Request): string | null
export function handleNextQuestionApi(
  request: Request,
  env: NextQuestionEnv,
  ctx: ExecutionContext,
): Promise<Response>
```

- [ ] **Step 1: 配置创建限流**

在 `sites/home/wrangler.jsonc` 合并 GA Rate Limiting binding：

```jsonc
{
  "ratelimits": [
    {
      "name": "NEXT_QUESTION_CREATE_LIMITER",
      "namespace_id": "1003",
      "simple": { "limit": 10, "period": 60 }
    }
  ]
}
```

`1003` 是本仓库为下一问保留的正整数 namespace；生产前确认 Cloudflare 账户内未被其他 Worker 使用。创建 key 使用 `SHA-256(cf-connecting-ip + ':' + installationId)` 的 base64url，不把原 IP 写入存储或日志。限流按 Cloudflare location 工作，只作为基础防滥用层。

- [ ] **Step 2: 写 API 失败测试**

覆盖全部 method/path、无效 JSON、超过 16KB body、缺 token、错误 Bearer、未知 slug、限流 429、404/409/410 映射、所有响应 `cache-control:no-store`、内容类型 JSON、未知 API 不回退 HTML。

创建幂等规则：

```ts
slug = base64url(SHA256(`next-question:${requestId}`)).slice(0, 16)
```

同一随机 UUID `requestId` 永远命中同一 DO；重复请求返回首次创建结果，不创建第二条链。服务端拒绝非 RFC 4122 UUID 格式。

- [ ] **Step 3: 实现 REST → DO RPC 路由**

固定路由：

```text
POST   /api/next-question/chains
GET    /api/next-question/chains/:slug
POST   /api/next-question/chains/:slug/baton
POST   /api/next-question/chains/:slug/close
POST   /api/next-question/chains/:slug/redact
DELETE /api/next-question/chains/:slug
```

`GET` 不接受 capability。其余链操作从 `Authorization: Bearer <token>` 读取；不接受 query/body token。API handler 只返回 `PublicChain` 和调用方确实需要的下一枚 token。

- [ ] **Step 4: 接入唯一主站 Worker**

`classifyPortalRoute` 增加：

```ts
| { kind: 'next-question-api' }
| { kind: 'next-question-shell'; slug: string }
```

`/api/next-question/*` 分派 `handleNextQuestionApi`；`/next-question/c/<16-char-slug>` 交给 Task 7 的 shell handler。其他玩法 API、Umami、默契测试 rewrite 和静态资产行为保持不变。

- [ ] **Step 5: 运行并提交**

```bash
pnpm --filter @viral/home test:worker
pnpm --filter @viral/next-question test
pnpm --filter @viral/home typecheck
git add sites/next-question/worker sites/home/wrangler.jsonc sites/home/worker
git commit -m "feat(next-question): expose guarded relay APIs"
```

---

### Task 4: 实现 fragment token vault、API client 与页面恢复

**Files:**
- Create: `sites/next-question/src/lib/token-vault.ts`
- Create: `sites/next-question/src/lib/token-vault.test.ts`
- Create: `sites/next-question/src/lib/chain-url.ts`
- Create: `sites/next-question/src/lib/chain-url.test.ts`
- Create: `sites/next-question/src/lib/api-client.ts`
- Create: `sites/next-question/src/lib/api-client.test.ts`

**Interfaces:**

```ts
export interface ChainCapabilities {
  ownerToken?: string
  batonToken?: string
  participantTokens: Partial<Record<Slot, string>>
  nextBatonToken?: string
}

export function ingestFragment(slug: string, hash: string, storage: Storage): ChainCapabilities
export function loadCapabilities(slug: string, storage: Storage): ChainCapabilities
export function clearCapabilityFragment(history: History, pathname: string): void
export function buildPublicChainUrl(origin: string, slug: string): string
export function buildBatonUrl(origin: string, slug: string, token: string): string
export function createChain(input: CreateChainInput): Promise<CreateChainResult>
export function getChain(slug: string): Promise<PublicChain>
export function submitBaton(slug: string, token: string, input: SubmitBatonInput): Promise<SubmitBatonResult>
export function closeChain(slug: string, token: string, input: CloseChainInput): Promise<PublicChain>
```

- [ ] **Step 1: 写 fragment 与 URL 失败测试**

断言：

```ts
buildBatonUrl('https://guaihaowan.example', 'abc', 'secret')
// https://guaihaowan.example/next-question/c/abc#b=secret
```

覆盖 `#b=`、`#o=`、未知 fragment、空 token、同时出现 b/o、localStorage 抛错、token ingest 后调用 `replaceState` 清除地址栏 fragment；任何日志/错误文本不得含 token。

- [ ] **Step 2: 写 API client 失败测试**

mock fetch 覆盖成功、400/403/404/409/410/429、非 JSON、超时、断网；写请求必须带 JSON、`requestId` 与 Bearer header，GET 不带 token，所有 fetch 使用同源相对路径。

- [ ] **Step 3: 实现 token vault**

localStorage key 固定：

```text
next-question:owner:<slug>
next-question:baton:<slug>
next-question:participant:<slug>:<slot>
next-question:next:<slug>
next-question:installation-id
```

installation id 使用 `crypto.randomUUID()`；storage 不可用时降级为当前内存 session，页面提示不要刷新。成功 ingest 后立即移除 URL fragment。

- [ ] **Step 4: 实现 API client 与稳定错误类型**

```ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) { super(code) }
}
```

网络超时 10 秒，只允许 UI 用同一个 `requestId` 手动重试；client 不在后台自动生成新 requestId。

- [ ] **Step 5: 运行并提交**

```bash
pnpm --filter @viral/next-question test -- src/lib
pnpm --filter @viral/next-question typecheck
git add sites/next-question/src/lib
git commit -m "feat(next-question): preserve private relay capabilities"
```

---

### Task 5: 完成发起、接棒、传棒、回环与只读进度 UI

**Files:**
- Modify: `sites/next-question/src/app.tsx`
- Create: `sites/next-question/src/app.test.tsx`
- Create: `sites/next-question/src/components/landing-screen.tsx`, `landing-screen.test.tsx`
- Create: `sites/next-question/src/components/baton-screen.tsx`, `baton-screen.test.tsx`
- Create: `sites/next-question/src/components/handoff-screen.tsx`, `handoff-screen.test.tsx`
- Create: `sites/next-question/src/components/progress-screen.tsx`, `progress-screen.test.tsx`
- Create: `sites/next-question/src/components/result-screen.tsx`, `result-screen.test.tsx`
- Create: `sites/next-question/src/components/error-screen.tsx`
- Modify: `sites/next-question/src/index.css`

**Interfaces:**

```ts
export type AppState =
  | { screen: 'landing' }
  | { screen: 'loading'; slug: string }
  | { screen: 'baton'; chain: PublicChain; token: string }
  | { screen: 'handoff'; chain: PublicChain; nextToken: string }
  | { screen: 'progress'; chain: PublicChain; ownerToken?: string }
  | { screen: 'result'; chain: PublicChain; ownerToken?: string }
  | { screen: 'error'; code: string; slug?: string }
```

- [ ] **Step 1: 写主流程失败测试**

Testing Library 覆盖：

- 首页只有昵称、第一问和创建按钮，没有年龄/人数/模板入口。
- 创建成功保存 owner + baton token，并进入第 2 棒传棒页。
- 带 baton fragment 打开时 ingest、清理地址栏、加载当前问题。
- 接棒提交前只显示当前问题，不显示全部历史；提交后才展示进度。
- slot2～5 提交后进入下一棒分享页。
- slot6 提交后显示“问题已经回到起点”，不再要求找第 7 人。
- owner 在 returned 状态看到 Q6 回答框；普通访客看不到。
- completed 进入结果页；expired/deleted/cancelled/404/409 有不同文案。
- 409 `chain_advanced` 自动重新 GET，显示谁已接走而不是丢失草稿前白屏。

- [ ] **Step 2: 实现 App 状态装配**

路由判定：`/next-question/` 进入 landing；`/next-question/c/<slug>` 先 ingest fragment，再 GET chain，根据 status/capability 选择页面。页面刷新必须从 URL + token vault 恢复，不依赖 React 内存保活。

- [ ] **Step 3: 实现五个主页面**

文案和字段严格依据设计文档。提交时按钮进入 disabled/loading；失败保留输入；成功才清空草稿。昵称、回答、下一问均有字数计数和服务端错误映射。

六席进度使用语义化有序列表；环形路线仅作视觉增强，屏幕阅读器读出“第 N 棒，已完成/等待中/已撤回”。

- [ ] **Step 4: 完成移动端与可访问性样式**

支持 320px 宽度、44px 最小触控区域、键盘 focus-visible、`prefers-reduced-motion`、文本 200% 放大。页面不使用横向滚动，不把颜色作为唯一状态提示。

- [ ] **Step 5: 运行并提交**

```bash
pnpm --filter @viral/next-question test
pnpm --filter @viral/next-question typecheck
pnpm --filter @viral/next-question build
git add sites/next-question/src sites/next-question/index.html sites/next-question/test
git commit -m "feat(next-question): complete the six-person relay flow"
```

---

### Task 6: 分享链接、二维码邀请卡与闭环结果卡

**Files:**
- Create: `sites/next-question/src/lib/share.ts`
- Create: `sites/next-question/src/lib/share.test.ts`
- Create: `sites/next-question/src/card/qr-matrix.ts`, `qr-matrix.test.ts`
- Create: `sites/next-question/src/card/draw-baton-card.ts`, `draw-baton-card.test.ts`
- Create: `sites/next-question/src/card/draw-result-card.ts`, `draw-result-card.test.ts`
- Create: `sites/next-question/src/components/save-card-button.tsx`, `save-card-button.test.tsx`
- Create: `sites/next-question/src/components/long-press-overlay.tsx`
- Modify: `sites/next-question/src/components/handoff-screen.tsx`
- Modify: `sites/next-question/src/components/progress-screen.tsx`
- Modify: `sites/next-question/src/components/result-screen.tsx`

**Interfaces:**

```ts
export function shareOrCopy(input: { title: string; text: string; url: string }): Promise<'share' | 'copy'>
export function resultExcerpts(chain: PublicChain): readonly string[]
export function makeBatonCardDraw(slot: Slot, url: string): DrawFn
export function makeResultCardDraw(chain: PublicChain, publicUrl: string): DrawFn
```

- [ ] **Step 1: 写分享行为失败测试**

覆盖 Web Share 成功、用户取消、Web Share 不可用时 clipboard fallback、clipboard 失败的手工复制提示。只把 baton token 放在接棒分享 URL；进度卡和结果卡必须使用无 fragment 的 public URL。

- [ ] **Step 2: 写 Canvas 卡片失败测试**

复用 `@viral/shared` 的 1080×1440 卡片管线和现有 canvas stub。断言：

- 邀请卡包含 `第 N / 6 棒`、二维码、品牌名，但不含问题正文。
- 结果卡最多显示 6 条、每条摘录最多 24 code points。
- redacted entry 显示“该内容已撤回”。
- 二维码值分别是一次性 baton URL 或无 token public URL。
- 空白/超长/emoji 文本不越出安全区域。

- [ ] **Step 3: 实现两类卡片**

邀请卡文案固定：

```text
第 N / 6 棒
上一棒给你留了一个问题
回答它，再把下一问交给一个人
```

结果卡使用六枚编号章组成闭环，底部显示开始/闭环日期和 QR。完整问答不塞进图片。

- [ ] **Step 4: 接入保存、复制和埋点**

事件只传 `slot`、`method` 和 status：`next_question_baton_shared`、`next_question_result_saved`。不传 URL，因为 URL 可能包含 token。

- [ ] **Step 5: 运行并提交**

```bash
pnpm --filter @viral/next-question test
pnpm --filter @viral/next-question typecheck
git add sites/next-question/src
git commit -m "feat(next-question): add relay and closure share cards"
```

---

### Task 7: 接入统一首页、链条 HTML shell 与安全 metadata

**Files:**
- Create: `sites/home/next-question/index.html`
- Create: `sites/home/worker/next-question-shell.ts`
- Create: `sites/home/worker/next-question-shell.test.ts`
- Create: `sites/home/public/previews/next-question.png`
- Modify: `sites/home/vite.config.ts`
- Modify: `sites/home/src/projects.ts`
- Modify: `sites/home/src/projects.test.ts`
- Modify: `sites/home/src/experience-loaders.ts`
- Modify: `sites/home/src/experience-loaders.test.ts`
- Modify: `sites/home/worker/index.ts`
- Modify: `sites/home/worker/routes.ts`
- Modify: `sites/home/worker/routes.test.ts`
- Modify: `sites/home/wrangler.jsonc`

**Interfaces:**

```ts
export function nextQuestionMeta(chain: PublicChain | null): {
  title: string
  description: string
}

export function serveNextQuestionShell(
  request: Request,
  env: PortalEnv,
  slug: string,
): Promise<Response>
```

- [ ] **Step 1: 写注册表和深链接失败测试**

断言 `next-question` 同时存在于 projects、ExperienceSlug、literal loader、Vite MPA input 和 `sites/home/next-question/index.html`。`/next-question/c/<valid-slug>` 分类为 shell；非法 slug 不访问 DO，返回玩法静态 shell或明确 404，未知 `/api/*` 仍为 JSON 404。

- [ ] **Step 2: 写 metadata 隐私测试**

metadata 只根据状态与 nextSlot 生成：

```text
waiting:   一个问题已经走到第 N / 6 棒
returned:  问题已经回到起点
completed: 一个问题走过六个人，又回到了起点
missing:   下一问 · 六人问题接力
```

标题、description、日志和响应头不得包含昵称、问题、回答或 capability token。

- [ ] **Step 3: 实现 HTMLRewriter shell**

Worker 获取 public chain，随后用 `env.ASSETS.fetch()` 读取 `/next-question/` HTML，通过 `HTMLRewriter` 替换 `<title>`、description 和 OG 文案。所有链 shell 响应增加：

```text
Cache-Control: no-store
X-Robots-Tag: noindex, nofollow
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
```

`wrangler.jsonc.assets.run_worker_first` 加入 `/next-question/c/*`，API 规则继续保留。

- [ ] **Step 4: 接入首页和生成预览图**

首页项目：

```ts
{
  slug: 'next-question',
  title: '下一问',
  shortTitle: '下一问',
  description: '回答上一棒，再把下一问交给一个人。六个人后，问题回到起点。',
  href: '/next-question/',
  preview: '/previews/next-question.png',
  flavor: '六人接力',
  accent: '#e63b2e',
}
```

本地启动后截取已验收首页视觉：

```bash
pnpm --filter @viral/home dev --host 0.0.0.0
pnpm exec playwright screenshot --device="Desktop Chrome" http://127.0.0.1:5173/next-question/ output/next-question-preview.png
sips -c 900 1200 output/next-question-preview.png --out sites/home/public/previews/next-question.png
```

- [ ] **Step 5: 运行统一构建并提交**

```bash
pnpm --filter @viral/home test
pnpm --filter @viral/home test:worker
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
pnpm --filter @viral/home deploy:dry
git add sites/home sites/next-question
git commit -m "feat(home): integrate the next-question relay"
```

---

### Task 8: 撤回删除、过期、并发与六人全链验收

**Files:**
- Modify: `sites/next-question/worker/question-chain.ts`
- Modify: `sites/next-question/worker/question-chain.test.ts`
- Modify: `sites/next-question/worker/api.ts`
- Modify: `sites/next-question/worker/api.test.ts`
- Modify: `sites/next-question/src/app.test.tsx`
- Modify: `sites/next-question/src/components/progress-screen.tsx`
- Create: `docs/plans/evidence/next-question-local-verification.md`
- Modify: `sites/home/design-qa.md`

- [ ] **Step 1: 完成隐私控制测试**

覆盖：owner 删除后 GET 不返回任何 entry；席位 token 只能撤回自己的 slot；撤回幂等；错误 slot/token 403；撤回清空旧 submission response；当前问题被撤回时进入 `cancelled`，历史问题被撤回时状态不变；撤回后结果页与卡片显示统一的“该内容已撤回”；API body/token 不出现在错误字符串；链页带 `noindex` 和 `no-referrer`。

- [ ] **Step 2: 完成并发和恢复测试**

对同一 slot 并发两个不同提交：

```ts
const results = await Promise.allSettled([
  submitBaton(token, firstInput),
  submitBaton(token, secondInput),
])
```

断言一个 200、一个 409，SQLite 只增加一行，nextSlot 只推进一次。再模拟 200 响应丢失，用相同 requestId 重试，必须返回相同 `nextBatonToken`。

- [ ] **Step 3: 运行六人 API 全链**

用 Worker 测试从创建开始，依次提交 slot2～6，再用 owner close。断言最终恰好 6 entries、6 questions、6 answers，Q6 的 responder 是 slot1，旧 baton 全部失效，public response 不含任何 capability。

- [ ] **Step 4: 运行浏览器验收**

启动统一主站本地服务，使用六个独立浏览器 context 或六个无痕窗口完成：

```text
创建 → 第2棒 → 第3棒 → 第4棒 → 第5棒 → 第6棒 → 发起者收尾
```

逐步验证刷新恢复、复制/系统分享 fallback、二维码、320/390/768/1440px、键盘操作、减少动态效果、断网重试、第二人抢同一棒、撤回、删除、过期 fixture 和长文本边界。守环页在 slot6 后无需推送也能看到最终问题。

- [ ] **Step 5: 记录新鲜验证证据**

```bash
pnpm --filter @viral/next-question test
pnpm --filter @viral/next-question typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home test:worker
pnpm --filter @viral/home build
pnpm --filter @viral/home deploy:dry
```

在 `docs/plans/evidence/next-question-local-verification.md` 记录日期、commit、命令退出码、全链结果、浏览器/viewport、截图路径和已知非阻塞问题；不记录 slug、token、昵称或问答正文。

- [ ] **Step 6: 提交本地验收记录**

```bash
git add sites/next-question sites/home/design-qa.md docs/plans/evidence/next-question-local-verification.md
git commit -m "test(next-question): verify the complete relay loop"
```

生产部署必须另获用户授权。授权后只允许从 `@viral/home` 执行唯一 deploy，并在生产域名重复创建、六棒、收尾、删除、限流、深链接 metadata 与静态资源回归。

---

## Definition of Done

- [ ] 首页能创建固定六席接力，未出现年龄或人数设置。
- [ ] 第 2～6 席各自只能成功提交一次，并获得正确下一步。
- [ ] 第 6 席不会产生第 7 棒，而是进入 `returned`。
- [ ] 发起者能靠本机 owner token 回答 Q6 并完成闭环。
- [ ] 同 requestId 网络重试不会重复推进；并发抢棒恰好一人成功。
- [ ] API/public HTML/埋点/日志均不泄露 capability 或 UGC。
- [ ] 未完成 7 天、完成 90 天的 alarm 清理测试通过。
- [ ] 发起者删除、席位撤回、过期和失效 token 都有可理解页面。
- [ ] 当前待答问题被撤回时链条停止为 `cancelled`；历史内容撤回不会错误推进或倒退席位。
- [ ] 邀请卡含一次性二维码但不含问题；结果卡含 public QR 但不含 token。
- [ ] `/next-question/`、链深链接、API 与其他已有玩法在统一主站构建中同时通过。
- [ ] `pnpm test`、`pnpm typecheck`、home build、Worker tests 和 deploy dry-run 全部退出码为 0。
- [ ] 没有执行未经授权的生产 deploy、远程资源变更或 secret 写入。
