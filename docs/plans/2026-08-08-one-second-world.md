# 一秒钟世界（16）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成一条从个人尺度走向宇宙尺度的数据叙事：只累计用户实际看着页面的时间，透明展示来源与换算过程，并允许定格三条跨章节数据生成快照卡。

**Architecture:** `sites/one-second-world` 是主站内 `/one-second-world/` 玩法的源码与测试模块，由 `sites/home` 懒加载并统一构建，不单独部署。事实资产以结构化 TypeScript 数据保存，构建期 lint 检查来源、口径、复核日期和可信度；计时、单位换算、格式化、快照选择均为纯函数。页面只更新视口内的条目，Visibility API 驱动有效停留时间，后台不补跳。

**Tech Stack:** Vite 8 · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 · IntersectionObserver · Page Visibility API · Canvas 2D · `@viral/shared`

## Global Constraints

- 依据 `docs/16-one-second-world.md`；代码开工前先完成至少 20 个候选事实的来源台账，其中 ≥12 个 A 级、≥8 个有明确中文生活语境，并用静态稿验证四章叙事。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；生产路径固定 `/one-second-world/`，不得新建独立 Pages/Worker 服务。
- 主叙事只使用 A 级来源；B 级事实必须显示“估算”，不得混入默认三条快照。
- 不采用库存量、强季节性、突发事件、无法合理线性均摊或找不到一手来源的数字。
- 页面隐藏时有效时间停止，恢复后继续；刷新归零，不拼接历史时间。
- 小于一次的事件显示“平均还需 X 秒”，不显示分数个人或不可能精度。
- 每个事实必须能从原始统计值和周期复算 rate；运行时不请求第三方 API。
- 每屏一个主数字；默认无声音；减少动态效果时每秒离散更新。
- 埋点不上传滚动轨迹或精确停留秒数，只上传章节 id、source id 和预定义时长桶。
- 品牌成功标准：中位有效停留≥45 秒、第三章到达率≥40%、来源打开率≥3%、快照保存率≥8%；外部引用与自然外链按月人工记录。

## File Map

```text
sites/one-second-world/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  test/setup.ts  test/canvas-stub.ts
  src/main.tsx  src/index.css  src/app.tsx (+test)
  src/data/fact-types.ts
  src/data/facts.ts
  src/data/facts.lint.test.ts
  src/lib/fact-lint.ts (+test)
  src/lib/rate.ts (+test)
  src/lib/visible-clock.ts (+test)
  src/lib/format-value.ts (+test)
  src/lib/snapshot.ts (+test)
  src/hooks/use-visible-elapsed.ts (+test)
  src/components/intro-screen.tsx (+test)
  src/components/fact-section.tsx (+test)
  src/components/fact-card.tsx (+test)
  src/components/source-panel.tsx (+test)
  src/components/snapshot-builder.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-snapshot-card.ts (+test)

sites/home/
  one-second-world/index.html
  public/previews/one-second-world.avif
  vite.config.ts
  src/projects.ts (+test)
  src/experience-loaders.ts (+test)
```

---

### Task 0: 建立可运行的站点测试骨架

**Files:**
- Create: `sites/one-second-world/package.json`
- Create: `sites/one-second-world/tsconfig.json`
- Create: `sites/one-second-world/vite.config.ts`
- Create: `sites/one-second-world/vitest.config.ts`
- Create: `sites/one-second-world/test/setup.ts`

- [ ] **Step 1: 创建 package 后安装依赖**

先写包名 `@viral/one-second-world` 和 `test/typecheck/build/dev` 四个 scripts，再执行：

```bash
pnpm --filter @viral/one-second-world add react@^19 react-dom@^19 '@viral/shared@workspace:*'
pnpm --filter @viral/one-second-world add -D typescript@^7 vite@^8 @vitejs/plugin-react tailwindcss@^4 @tailwindcss/vite@^4 vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/react @types/react-dom
```

- [ ] **Step 2: 配置 TypeScript 与 Vitest**

配置与 `sites/life-grid` 对齐：extends 根 `tsconfig.base.json`，Vitest 使用 jsdom、globals 和 `./test/setup.ts`。

- [ ] **Step 3: 验证空测试骨架并提交**

```bash
pnpm --filter @viral/one-second-world typecheck
git add sites/one-second-world/package.json sites/one-second-world/tsconfig.json sites/one-second-world/vite.config.ts sites/one-second-world/vitest.config.ts sites/one-second-world/test/setup.ts pnpm-lock.yaml
git commit -m "chore(one-second-world): add the testable package skeleton"
```

---

### Task 1: 来源台账、事实 schema 与构建期 lint

**Files:**
- Create: `sites/one-second-world/src/data/fact-types.ts`
- Create: `sites/one-second-world/src/data/facts.ts`
- Create: `sites/one-second-world/src/lib/fact-lint.ts`
- Create: `sites/one-second-world/src/lib/fact-lint.test.ts`
- Create: `sites/one-second-world/src/data/facts.lint.test.ts`

**Interfaces:**

```ts
export type WorldChapter = 'self' | 'daily' | 'human' | 'planet'
export type Confidence = 'A' | 'B'
export type PeriodUnit = 'day' | 'month' | 'year' | 'custom-seconds'

export interface WorldFact {
  id: string
  chapter: WorldChapter
  title: string
  explanation: string
  value: number
  period: { unit: PeriodUnit; seconds?: number; referenceYear?: number }
  outputUnit: string
  region: string
  decimals: 0 | 1 | 2
  snapshotPriority: number
  source: {
    title: string
    publisher: string
    url: string
    publishedAt: string
    reviewedAt: string
    confidence: Confidence
  }
}

export interface FactLintIssue { factId?: string; code: string; message: string }
export function lintFacts(facts: readonly WorldFact[], now: Date): readonly FactLintIssue[]
```

- [ ] **Step 1: 写失败 lint 测试**

覆盖重复 id、缺 URL/publisher、非 https、负值/NaN、custom 缺 seconds、year 缺 referenceYear、未来发布日期、复核超过一季度、章节配额、A/B 标记和 12A/8中文语境硬门槛。

- [ ] **Step 2: 实现 lint**

季度到期以 `reviewedAt + 100 天` 作为构建失败；超过一年且没有更新的数据必须在 `explanation` 明写“历史口径”，否则构建失败。纯函数的单元测试显式传固定 `now`，真实数据 `facts.lint.test.ts` 传 `new Date()`，让过期来源在未来构建时自动阻止发布；Task 8 完成人工复核后更新 `reviewedAt`。

- [ ] **Step 3: 建立候选来源台账并人工复核**

为每条候选保存一手来源、原始值、周期、地区和手算结果；未完成复核的条目不得进入 `FACTS`。首版 `FACTS` 最多 20 条，主叙事至少每章 2 条，且 A 级 ≥12、中文语境 ≥8。非作者随机抽 5 条，从页面字段反查来源并手算。

- [ ] **Step 4: 运行真实内容 lint**

Run: `pnpm --filter @viral/one-second-world test -- src/data/facts.lint.test.ts`

Expected：PASS，并输出 A/B/章节计数。

- [ ] **Step 5: 提交**

```bash
git add sites/one-second-world/src/data sites/one-second-world/src/lib/fact-lint*
git commit -m "feat(one-second-world): add verified source facts"
```

---

### Task 2: 完成页面壳与内容 lint 门禁

**Files:**
- Modify: `sites/one-second-world/package.json`, `vite.config.ts`
- Create: `sites/one-second-world/index.html`, `src/main.tsx`, `src/app.tsx`, `src/index.css`
- Copy: life-grid 的 `test/canvas-stub.ts`

- [ ] **Step 1: 完成页面入口与 build 门禁**

沿用 Task 0 的包和依赖，补齐页面入口。build 脚本固定为：

```json
"build": "tsc --noEmit && vitest run src/data/facts.lint.test.ts && vite build"
```

- [ ] **Step 2: 写最小 App 测试与页面元信息**

title/description 包含“一秒钟世界、数据来源、实时换算”；首屏明确“只计算你看着页面的时间”；Umami id 在部署 gate 使用真实值替换。

- [ ] **Step 3: 实现深空瑞士风基础层**

色板仅使用 `#07090d`、`#f4f7fb`、`#4c8dff` 与白色透明度；数字启用 `font-variant-numeric: tabular-nums`；不加载 webfont。

- [ ] **Step 4: 验证并提交**

```bash
pnpm --filter @viral/one-second-world test
pnpm --filter @viral/one-second-world typecheck
git add sites/one-second-world pnpm-lock.yaml
git commit -m "chore(one-second-world): scaffold the data story"
```

---

### Task 3: 速率换算与数值格式

**Files:**
- Create: `sites/one-second-world/src/lib/rate.ts`
- Create: `sites/one-second-world/src/lib/rate.test.ts`
- Create: `sites/one-second-world/src/lib/format-value.ts`
- Create: `sites/one-second-world/src/lib/format-value.test.ts`

**Interfaces:**

```ts
export function periodSeconds(period: WorldFact['period']): number
export function ratePerSecond(fact: WorldFact): number
export function accumulatedValue(fact: WorldFact, elapsedMs: number): number

export type DisplayValue =
  | { kind: 'count'; text: string; raw: number }
  | { kind: 'waiting'; text: string; secondsRemaining: number }

export function formatFactValue(fact: WorldFact, elapsedMs: number): DisplayValue
```

- [ ] **Step 1: 写失败测试**

覆盖日/月/平年/闰年/custom 周期、超大数中文单位、0 和负 elapsed、rate<1 的 waiting 语义、decimals 上限、禁止 NaN/Infinity。

- [ ] **Step 2: 实现周期规则**

day=86400；month 必须带 referenceYear 且使用该年 `365/366 ÷12` 的平均月；year 使用 referenceYear 实际天数；custom 使用显式 seconds。事实值始终从原始 `value/periodSeconds` 计算，不在数据里另存 rate。

- [ ] **Step 3: 实现格式规则**

累计值 `<1` 时返回 `waiting`，`ceil((1-value)/rate)`；否则按个、万、亿、万亿选择单位，保留 fact.decimals 指定精度并删除末尾无意义 0。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/one-second-world test -- src/lib/rate.test.ts src/lib/format-value.test.ts
git add sites/one-second-world/src/lib/rate* sites/one-second-world/src/lib/format-value*
git commit -m "feat(one-second-world): add auditable rate math"
```

---

### Task 4: 前台有效时间时钟

**Files:**
- Create: `sites/one-second-world/src/lib/visible-clock.ts`
- Create: `sites/one-second-world/src/lib/visible-clock.test.ts`
- Create: `sites/one-second-world/src/hooks/use-visible-elapsed.ts`
- Create: `sites/one-second-world/src/hooks/use-visible-elapsed.test.ts`

**Interfaces:**

```ts
export interface VisibleClockState { accumulatedMs: number; visibleSince: number | null }
export function setClockVisible(state: VisibleClockState, visible: boolean, now: number): VisibleClockState
export function readElapsed(state: VisibleClockState, now: number): number
export function useVisibleElapsed(options?: { reducedMotion?: boolean }): number
```

- [ ] **Step 1: 写纯函数失败测试**

覆盖初始可见、隐藏冻结、恢复续算、不补跳、重复 visibility 事件幂等、monotonic 值倒退时不产生负数。

- [ ] **Step 2: 实现纯时钟**

隐藏时把 `now-visibleSince` 累加并设 `visibleSince:null`；恢复时只设新的 visibleSince。所有返回新对象，不原地修改。

- [ ] **Step 3: 写 hook 假时钟测试并实现**

正常模式可用 rAF 刷新显示，reduced-motion 每秒刷新一次；事实时间每次由 `readElapsed(performance.now())` 读取。effect cleanup 移除 visibility listener、cancel rAF/timeout。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/one-second-world test -- src/lib/visible-clock.test.ts src/hooks/use-visible-elapsed.test.ts
git add sites/one-second-world/src/lib/visible-clock* sites/one-second-world/src/hooks
git commit -m "feat(one-second-world): track visible session time"
```

---

### Task 5: 四章页面、可见条目更新与来源面板

**Files:**
- Create: `sites/one-second-world/src/components/intro-screen.tsx`
- Create: `sites/one-second-world/src/components/intro-screen.test.tsx`
- Create: `sites/one-second-world/src/components/fact-section.tsx`
- Create: `sites/one-second-world/src/components/fact-section.test.tsx`
- Create: `sites/one-second-world/src/components/fact-card.tsx`
- Create: `sites/one-second-world/src/components/fact-card.test.tsx`
- Create: `sites/one-second-world/src/components/source-panel.tsx`
- Create: `sites/one-second-world/src/components/source-panel.test.tsx`
- Modify: `sites/one-second-world/src/app.tsx`

**Interfaces:**

```ts
interface FactCardProps { fact: WorldFact; elapsedMs: number; active: boolean }
interface SourcePanelProps { fact: WorldFact; onClose: () => void }
```

- [ ] **Step 1: 写失败交互测试**

验证四章顺序；每屏一个主数字；未进入视口的卡片不连续重渲染；首次进入章节只记一次 `chapter_viewed`；来源面板展示 publisher/date/region/原始值/换算式/外链；点击来源记录 `source_opened { source:fact.id }`；页面隐藏或卸载时最多记录一次 `engaged_time_bucket`，只使用预定义时长桶。

- [ ] **Step 2: 实现 IntersectionObserver 边界**

每个 `FactSection` 只维护自己是否 active；测试环境注入 observer stub。inactive 卡片显示最后一次值，不启动独立 timer。全站只有 App 的一个 visible elapsed 时钟。

- [ ] **Step 3: 实现来源面板**

换算式明确显示 `原始值 ÷ 周期秒数 × 本次有效秒数`；B 级 badge 必须含“估算”，不能只靠颜色。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/one-second-world test
git add sites/one-second-world/src/components sites/one-second-world/src/app.tsx
git commit -m "feat(one-second-world): build the four-chapter story"
```

---

### Task 6: 定格快照选择与编辑

**Files:**
- Create: `sites/one-second-world/src/lib/snapshot.ts`
- Create: `sites/one-second-world/src/lib/snapshot.test.ts`
- Create: `sites/one-second-world/src/components/snapshot-builder.tsx`
- Create: `sites/one-second-world/src/components/snapshot-builder.test.tsx`
- Modify: `sites/one-second-world/src/app.tsx`

**Interfaces:**

```ts
export interface SnapshotItem { fact: WorldFact; display: DisplayValue }
export function selectSnapshotFacts(facts: readonly WorldFact[], elapsedMs: number):
  readonly [WorldFact, WorldFact, WorldFact]
export function replaceSnapshotFact(
  current: readonly WorldFact[],
  slot: number,
  replacement: WorldFact,
): readonly WorldFact[]
```

- [ ] **Step 1: 写失败测试**

默认三条来自三个不同章节、只选 A 级、优先 count 而非 waiting、按 snapshotPriority 决胜；替换不得产生重复 id，至少保留两个章节；点击定格冻结 elapsed 值，不随背景时钟继续变。

- [ ] **Step 2: 实现确定性选择**

候选排序键为 `waiting(后) → snapshotPriority(降序) → id(升序)`；依次选择尚未出现章节，第三条不足时才允许重复章节。快照 builder 持有 `frozenElapsedMs`。

- [ ] **Step 3: 实现交互与事件**

生成同时记录工厂标准事件 `generate { kind:'snapshot' }` 和产品事件 `snapshot_generated { duration_bucket }`，桶固定 `lt15/15_44/45_119/gte120`；用户只能替换事实，不能编辑数字。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/one-second-world test -- src/lib/snapshot.test.ts src/components/snapshot-builder.test.tsx
git add sites/one-second-world/src/lib/snapshot* sites/one-second-world/src/components/snapshot-builder* sites/one-second-world/src/app.tsx
git commit -m "feat(one-second-world): add frozen session snapshots"
```

---

### Task 7: 快照卡与保存

**Files:**
- Create: `sites/one-second-world/src/card/draw-snapshot-card.ts`
- Create: `sites/one-second-world/src/card/draw-snapshot-card.test.ts`
- Create: `sites/one-second-world/src/components/save-card-button.tsx`
- Create: `sites/one-second-world/src/components/save-card-button.test.tsx`
- Create: `sites/one-second-world/src/components/long-press-overlay.tsx`
- Modify: `sites/one-second-world/src/components/snapshot-builder.tsx`

**Interfaces:**

```ts
interface WorldSnapshotCardData {
  elapsedMs: number
  localTimeLabel: string
  items: readonly [SnapshotItem, SnapshotItem, SnapshotItem]
}
export function makeWorldSnapshotCardDraw(data: WorldSnapshotCardData): DrawFn
```

- [ ] **Step 1: 写失败测试**

卡片必须有“约”、单位、三条事实、会话时长、本地时刻、品牌条和“查看数据来源”；最长中英文来源标题不进卡片正文；小于 1 的事实不允许出现在默认卡片。

- [ ] **Step 2: 实现 1080×1440 深空网格卡**

卡片不放完整 URL 清单，只放回站提示；来源详情保留在页面。保存走 shared，记录 `save_image { card:'world-snapshot' }`。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/one-second-world test
git add sites/one-second-world/src/card sites/one-second-world/src/components
git commit -m "feat(one-second-world): add snapshot share cards"
```

---

### Task 8: 主站接入、可信度、性能与发布 gate

**Files:**
- Modify: `sites/one-second-world/src/index.css`
- Create: `sites/home/one-second-world/index.html`
- Create: `sites/home/public/previews/one-second-world.avif`
- Modify: `sites/home/vite.config.ts`
- Modify: `sites/home/src/projects.ts`
- Modify: `sites/home/src/projects.test.ts`
- Modify: `sites/home/src/experience-loaders.ts`
- Modify: `sites/home/src/experience-loaders.test.ts`
- Modify: `README.md`

- [ ] **Step 1: 写失败测试并接入主站**

先让 home 测试断言 `one-second-world` 的 href 为 `/one-second-world/` 且 registry keys 一致，运行确认 FAIL。随后创建页面 HTML，向 Vite MPA input、literal loader、projects metadata 和预览图逐项登记；不得配置外部 URL 或复制子站 Worker。

- [ ] **Step 2: 新鲜自动验证**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/one-second-world test
pnpm --filter @viral/one-second-world typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
```

Expected：全部退出码 0；内容 lint 通过；`sites/home/dist/one-second-world/index.html` 存在；懒加载首屏 gzip `<100KB`。

- [ ] **Step 3: 人工来源复核**

非作者随机抽 5 条，逐条打开一手来源、核对发布日期/地区/周期并手算页面值。更新每条 `reviewedAt` 和页面数据版本；任何一条无法复核则下线该条并重新跑配额 lint。

- [ ] **Step 4: 体验与性能验收**

四环境验证隐藏/恢复、低端机滚动、reduced-motion、来源展开、快照替换、卡片保存。用 Performance 面板确认不可见章节不持续触发独立动画；5 人静态/可用性测试中每人能复述至少两条事实和一个来源口径。

- [ ] **Step 5: 更新状态并提交**

```bash
git add sites/one-second-world sites/home/one-second-world sites/home/public/previews/one-second-world.avif sites/home/vite.config.ts sites/home/src README.md
git commit -m "docs(one-second-world): record source and release review"
```

浏览器必须从首页进入并验证刷新、返回首页、320px 与 reduced-motion。生产只随 `@viral/home` 统一发布并等待用户明确授权。
