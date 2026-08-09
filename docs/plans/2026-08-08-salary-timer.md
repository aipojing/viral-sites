# 上班回本计算器（04）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成一个本地优先的工作日复访工具：设置工资与带薪作息，准确展示当前工资等值与下班倒计时，为会议等片段计价，提供隐私模式、今日小结和默认不暴露月薪的小票卡。

**Architecture:** `sites/salary-timer` 是主站内 `/salary-timer/` 玩法的源码与测试模块，由 `sites/home` 懒加载并统一构建，不单独部署。设置、班次、带薪区间、金额和片段均由显式传 `now` 的纯函数计算；页面只有一个低频时钟负责刷新，后台停止重绘但恢复后按时间戳补算。用户选择 sessionStorage 或 localStorage，片段结果保存创建时的费率与口径快照，修改工资后不重算历史。

**Tech Stack:** Vite 8 · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 · Page Visibility API · localStorage/sessionStorage · Canvas 2D · `@viral/shared`

## Global Constraints

- 依据 `docs/04-salary-timer.md`；启动前复核同类产品与冷启动办公室受众，确认片段计价和隐私卡片仍有真实差异。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；生产路径固定 `/salary-timer/`，不得添加外站 URL、独立 Pages 项目或 deploy script。
- 全程称“工资等值”，页面固定注明“不是真实工资单、税务或劳动报酬结算”；税前/到手只作标签，不做税务换算。
- 月薪、作息、自定义场景与片段记录只存用户选择的浏览器存储；埋点不得带金额、时薪、上下班时间或自定义文本。
- 小时等值口径固定：`月薪 ÷ (52/12 × 每周工作天数 × 每日带薪小时)`；展示两位小数，内部保留精度。
- 今日金额只累计带薪区间；午休按设置决定；跨午夜班次按班次起始日归属；非工作日默认不累计，临时班次只影响当天。
- 同时只能有一个片段。片段等值等于片段与带薪区间的交集 × 创建时费率，属于今日金额切片，不额外加总。
- 隐私模式立即模糊页面全部金额；恢复金额需要主动操作。分享卡默认永不包含月薪和时薪。
- 页面隐藏时不重绘，恢复后从时间事实补算；金额不能由 rAF/interval 累加。
- 自定义场景最多 12 Unicode code points；只在本地展示和保存，不进埋点。
- 视觉使用热敏小票：小票白、热敏灰、数字黑；打印动效只在片段结束出现，reduced-motion 直接展示。
- 成功标准固定为 D1≥25%、D7≥10%、回访用户每周打开≥2 天、完成设置者中片段计价使用率≥30%、片段小票保存率≥8%；本站以复访为一级指标。

## File Map

```text
sites/salary-timer/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  test/setup.ts  test/canvas-stub.ts
  src/main.tsx  src/index.css  src/app.tsx (+test)
  src/lib/settings.ts (+test)
  src/lib/time-local.ts (+test)
  src/lib/pay-math.ts (+test)
  src/lib/work-schedule.ts (+test)
  src/lib/fragment.ts (+test)
  src/lib/storage.ts (+test)
  src/lib/return-days.ts (+test)
  src/hooks/use-visible-now.ts (+test)
  src/components/setup-screen.tsx (+test)
  src/components/today-dashboard.tsx (+test)
  src/components/privacy-toggle.tsx (+test)
  src/components/scene-timer.tsx (+test)
  src/components/fragment-receipt.tsx (+test)
  src/components/daily-summary.tsx (+test)
  src/components/settings-panel.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-fragment-receipt.ts (+test)
  src/card/draw-daily-receipt.ts (+test)

sites/home/
  salary-timer/index.html
  public/previews/salary-timer.avif
  vite.config.ts
  src/projects.ts (+test)
  src/experience-loaders.ts (+test)
```

---

### Task 0: 建立可运行站点骨架

**Files:**
- Create: 标准 package/tsconfig/Vite/Vitest 配置、`index.html`, `src/main.tsx`, `src/app.tsx`, `src/index.css`, `test/setup.ts`
- Copy: life-grid 的 `canvas-stub.ts`

- [ ] **Step 1: 创建 `@viral/salary-timer` 并安装依赖**

```bash
pnpm --filter @viral/salary-timer add react@^19 react-dom@^19 '@viral/shared@workspace:*'
pnpm --filter @viral/salary-timer add -D typescript@^7 vite@^8 @vitejs/plugin-react tailwindcss@^4 @tailwindcss/vite@^4 vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/react @types/react-dom
```

- [ ] **Step 2: 写首屏失败测试与元信息**

未设置时只出现 30 秒设置流程和“工资不会上传”；title/description 覆盖“工资计时器、上班回本、会议计价”，不使用“真实收入计算”误导词。

- [ ] **Step 3: 实现小票基础样式并提交**

```bash
pnpm --filter @viral/salary-timer test
pnpm --filter @viral/salary-timer typecheck
git add sites/salary-timer pnpm-lock.yaml
git commit -m "chore(salary-timer): scaffold the local work timer"
```

---

### Task 1: 设置契约、时间解析与工资等值

**Files:**
- Create: `sites/salary-timer/src/lib/settings.ts`
- Create: `sites/salary-timer/src/lib/settings.test.ts`
- Create: `sites/salary-timer/src/lib/time-local.ts`
- Create: `sites/salary-timer/src/lib/time-local.test.ts`
- Create: `sites/salary-timer/src/lib/pay-math.ts`
- Create: `sites/salary-timer/src/lib/pay-math.test.ts`

**Interfaces:**

```ts
export type SalaryBasis = 'gross' | 'net'
export type PersistMode = 'session' | 'local'
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface SalarySettings {
  version: 1
  monthlySalary: number
  salaryBasis: SalaryBasis
  workdays: readonly Weekday[]
  paidHoursPerDay: number
  shiftStart: string
  shiftEnd: string
  lunchStart?: string
  lunchEnd?: string
  lunchPaid: boolean
  persistMode: PersistMode
  effectiveFrom: string
}

export function validateSettings(raw: unknown): SalarySettings
export function parseClock(value: string): number
export function hourlyEquivalent(settings: SalarySettings): number
export function dailyEquivalent(settings: SalarySettings): number
export function formatMoney(value: number): string
```

- [ ] **Step 1: 写失败测试**

覆盖月薪正数/上限、1～7 个唯一 workdays、paidHours 0.5～24、HH:mm、跨午夜、午休字段成对、午休付薪、配置的每日带薪小时与班次区间相差不超过 15 分钟、52/12 公式、小数精度、NaN/Infinity、税前/到手只影响标签。

- [ ] **Step 2: 实现设置验证与公式**

月薪上限仅用于防输入错误，固定 ¥10,000,000；不做税务推算。`formatMoney` 只负责两位展示，不参与后续计算。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/salary-timer test -- src/lib/settings.test.ts src/lib/time-local.test.ts src/lib/pay-math.test.ts
git add sites/salary-timer/src/lib/settings* sites/salary-timer/src/lib/time-local* sites/salary-timer/src/lib/pay-math*
git commit -m "feat(salary-timer): define pay settings and math"
```

---

### Task 2: 带薪区间、今日状态与跨午夜

**Files:**
- Create: `sites/salary-timer/src/lib/work-schedule.ts`
- Create: `sites/salary-timer/src/lib/work-schedule.test.ts`

**Interfaces:**

```ts
export interface TimeInterval { startMs: number; endMs: number }
export type WorkStatus = 'before' | 'working' | 'break' | 'after' | 'off'
export interface TodayPayState {
  shiftDateKey: string
  status: WorkStatus
  earnedMs: number
  remainingPaidMs: number
  nextBoundaryMs: number | null
  intervals: readonly TimeInterval[]
}

export function paidIntervalsForShift(settings: SalarySettings, shiftStartDate: Date): readonly TimeInterval[]
export function todayPayState(settings: SalarySettings, now: Date, forceWorkday?: boolean): TodayPayState
export function overlapMs(range: TimeInterval, intervals: readonly TimeInterval[]): number
```

- [ ] **Step 1: 写失败测试**

覆盖上班前、工作中、午休停/不停、下班后、周末、强制临时班次、跨午夜班次在次日凌晨仍归前一天、DST 浏览器时区变化、零剩余和边界分钟。

- [ ] **Step 2: 实现本地班次算法**

工作日使用用户浏览器本地日历，不强制 UTC+8；跨午夜时先检查当前日班次，再检查前一工作日起始且结束落在当前时刻的班次。午休只有在完整落入 shift 时拆 interval；否则 validation 拒绝。

- [ ] **Step 3: 实现事实金额**

今日已赚等值为 `earnedMs / 3_600_000 * hourlyEquivalent(settings)`；剩余同理。函数每次由 now 与 interval 交集推导，不持有递增金额。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/salary-timer test -- src/lib/work-schedule.test.ts
git add sites/salary-timer/src/lib/work-schedule*
git commit -m "feat(salary-timer): calculate paid work intervals"
```

---

### Task 3: 片段计价与费率快照

**Files:**
- Create: `sites/salary-timer/src/lib/fragment.ts`
- Create: `sites/salary-timer/src/lib/fragment.test.ts`

**Interfaces:**

```ts
export type SceneId = 'meeting' | 'toilet' | 'idle' | 'queue' | 'custom'
export interface ActiveFragment {
  id: string
  scene: SceneId
  customLabel?: string
  startedAtMs: number
  rateAtStart: number
  paidIntervalsAtStart: readonly TimeInterval[]
  settingsEffectiveFrom: string
}
export interface FragmentResult extends ActiveFragment {
  endedAtMs: number
  durationMs: number
  paidDurationMs: number
  equivalent: number
}

export function startFragment(scene: SceneId, now: Date, settings: SalarySettings, customLabel?: string): ActiveFragment
export function finishFragment(active: ActiveFragment, now: Date): FragmentResult
```

- [ ] **Step 1: 写失败测试**

同一时间一个片段、结束早于开始、跨午休只计带薪交集、跨下班截断、跨午夜、费率快照、设置修改不重算、custom 12 code points/NFC、duration 与 paidDuration 分开。

- [ ] **Step 2: 实现片段纯函数**

`durationMs=ended-started`；`paidDurationMs=overlapMs(fragmentRange,paidIntervalsAtStart)`；`equivalent=paidDurationMs/3600000*rateAtStart`。不把 equivalent 加到 today earned，它只用于片段小票和分布。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/salary-timer test -- src/lib/fragment.test.ts
git add sites/salary-timer/src/lib/fragment*
git commit -m "feat(salary-timer): add non-duplicating scene valuation"
```

---

### Task 4: 可选本地存储、历史快照与清除

**Files:**
- Create: `sites/salary-timer/src/lib/storage.ts`
- Create: `sites/salary-timer/src/lib/storage.test.ts`
- Create: `sites/salary-timer/src/lib/return-days.ts`
- Create: `sites/salary-timer/src/lib/return-days.test.ts`

**Interfaces:**

```ts
export interface SalaryLocalData {
  version: 1
  settings: SalarySettings
  fragments: readonly FragmentResult[]
  firstVisitDate: string
  activeDates: readonly string[]
  reportedReturnDays: readonly number[]
}

export function loadSalaryData(local: Storage, session: Storage): SalaryLocalData | null
export function saveSalaryData(data: SalaryLocalData, local: Storage, session: Storage): boolean
export function clearSalaryData(local: Storage, session: Storage): void
export function returnDayEvents(data: SalaryLocalData, now: Date): readonly ('D1'|'D7')[]
```

- [ ] **Step 1: 写失败测试**

session/local 二选一、迁移 mode 时从旧容器删除、坏 JSON、quota/security error、片段保留 rateAtStart、最多保留 31 个自然日、清除两个容器、D1/D7 各上报一次和每周活跃天数计算。

- [ ] **Step 2: 实现存储边界**

key 固定 `viral:salary-timer:data:v1`；所有写入返回新对象，不存 active fragment，刷新时明确结束当前片段以免伪造持续时间。`persistMode` 决定目标容器，“仅本次”使用 sessionStorage。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/salary-timer test -- src/lib/storage.test.ts src/lib/return-days.test.ts
git add sites/salary-timer/src/lib/storage* sites/salary-timer/src/lib/return-days*
git commit -m "feat(salary-timer): persist private work snapshots"
```

---

### Task 5: 可见时钟、首次设置与今日面板

**Files:**
- Create: `sites/salary-timer/src/hooks/use-visible-now.ts`
- Create: `sites/salary-timer/src/hooks/use-visible-now.test.ts`
- Create: `sites/salary-timer/src/components/setup-screen.tsx`
- Create: `sites/salary-timer/src/components/setup-screen.test.tsx`
- Create: `sites/salary-timer/src/components/today-dashboard.tsx`
- Create: `sites/salary-timer/src/components/today-dashboard.test.tsx`
- Create: `sites/salary-timer/src/components/privacy-toggle.tsx`
- Create: `sites/salary-timer/src/components/privacy-toggle.test.tsx`
- Modify: `sites/salary-timer/src/app.tsx`
- Create: `sites/salary-timer/src/app.test.tsx`

- [ ] **Step 1: 写失败交互测试**

设置在 30 秒内完成；口径预览；各 today status 文案；金额按 now 更新；隐藏时停止 interval、恢复立即补算；隐私模式模糊所有金额且主动点击才恢复；非工作日可开启一次性临时班次；`setup_completed` 同时记录工厂标准 `generate`，无金额参数。

- [ ] **Step 2: 实现单时钟 hook**

前台每 1000ms 更新一次 `new Date()`，隐藏时 clear interval，恢复立即 setNow；金额显示可用 CSS 数字过渡，不启动第二个 rAF。测试用 fake timers 和 visibility stub。

- [ ] **Step 3: 实现设置和面板**

工作日用 7 个 chip 明确选择；午休开关控制字段；口径预览实时显示由班次推导的带薪小时，与用户输入相差超过 15 分钟时要求确认修正。隐私 mode 写入 sessionStorage 的独立 UI key，不跨设备、不进入分享数据，且刷新后仍保持隐藏。页脚和设置页都显示本地隐私说明。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/salary-timer test
git add sites/salary-timer/src/hooks sites/salary-timer/src/components sites/salary-timer/src/app*
git commit -m "feat(salary-timer): build setup and live dashboard"
```

---

### Task 6: 快捷场景、片段结果和今日小结

**Files:**
- Create: `sites/salary-timer/src/components/scene-timer.tsx`
- Create: `sites/salary-timer/src/components/scene-timer.test.tsx`
- Create: `sites/salary-timer/src/components/fragment-receipt.tsx`
- Create: `sites/salary-timer/src/components/fragment-receipt.test.tsx`
- Create: `sites/salary-timer/src/components/daily-summary.tsx`
- Create: `sites/salary-timer/src/components/daily-summary.test.tsx`
- Create: `sites/salary-timer/src/components/settings-panel.tsx`
- Create: `sites/salary-timer/src/components/settings-panel.test.tsx`
- Modify: `sites/salary-timer/src/app.tsx`

- [ ] **Step 1: 写失败流程测试**

五个场景；custom 上限；第二片段禁用；页面隐藏后恢复按事实时长；结束出小票；今日小结按 scene 汇总 paidDuration 而不二次加金额；修改设置不改历史；一键清除；事件 scene 只带内置 id/custom 枚举和时长桶。

- [ ] **Step 2: 实现片段状态**

App 只持一个 `ActiveFragment | null`；开始记录 `scene_started`，结束立即产生不可变 `FragmentResult`、持久化并记录 `scene_finished { scene, duration_bucket }`。custom 的埋点 scene 固定 `'custom'`。

- [ ] **Step 3: 实现日报隐私选择**

日报默认只在页面显示；点击分享前先出现开关“隐藏总等值（默认开）/只显示时间分布”。记录 `daily_summary_viewed`，不记录数值。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/salary-timer test
git add sites/salary-timer/src/components sites/salary-timer/src/app.tsx
git commit -m "feat(salary-timer): add scene receipts and daily totals"
```

---

### Task 7: 片段小票、可选日报卡与保存

**Files:**
- Create: `sites/salary-timer/src/card/draw-fragment-receipt.ts`
- Create: `sites/salary-timer/src/card/draw-fragment-receipt.test.ts`
- Create: `sites/salary-timer/src/card/draw-daily-receipt.ts`
- Create: `sites/salary-timer/src/card/draw-daily-receipt.test.ts`
- Create: `sites/salary-timer/src/components/save-card-button.tsx`
- Create: `sites/salary-timer/src/components/save-card-button.test.tsx`
- Create: `sites/salary-timer/src/components/long-press-overlay.tsx`

**Interfaces:**

```ts
export interface FragmentReceiptData {
  sceneLabel: string
  durationMs: number
  equivalent: number
  includeDate: boolean
}
export interface DailyReceiptData {
  dateLabel: string
  sceneDurations: Readonly<Record<SceneId, number>>
  totalEquivalent?: number
}
export function makeFragmentReceiptDraw(data: FragmentReceiptData): DrawFn
export function makeDailyReceiptDraw(data: DailyReceiptData): DrawFn
```

- [ ] **Step 1: 写失败卡片测试**

片段卡含场景/时长/等值/克制锐评/可选日期，不含月薪时薪；日报默认 `totalEquivalent` undefined，只显示时间分布；超长 custom label、长数字、0 等值、九宫格缩略图和 1080×1440 边界。

- [ ] **Step 2: 实现热敏小票**

锯齿边、等宽数字和灰阶纸纹用 Canvas 原生图形实现；不引用真实奶茶/商品价格。打印动效只在 DOM 出单瞬间，Canvas 卡片静态。

- [ ] **Step 3: 实现保存事件**

片段记录 `save_image { card:'scene', scene }`；日报记录 `save_image { card:'daily', amount_visible:0|1 }`，不传 amount。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/salary-timer test
git add sites/salary-timer/src/card sites/salary-timer/src/components
git commit -m "feat(salary-timer): add privacy-safe receipt cards"
```

---

### Task 8: 主站接入、隐私、时间边界与发布 gate

- [ ] **Step 1: 写失败的主站接入测试**

在 `sites/home/src/projects.test.ts` 断言存在 `salary-timer` 且 `href === '/salary-timer/'`；在 registry parity test 断言 loader key 与项目 key 一致。先运行 `pnpm --filter @viral/home test`，Expected：FAIL，主站尚未登记该玩法。

- [ ] **Step 2: 接入主站构建**

创建 `sites/home/salary-timer/index.html`，title 为“上班回本计算器 — 怪好玩”，description 不宣称真实工资结算；在 `sites/home/vite.config.ts` 添加 `salary-timer` input，在 `experience-loaders.ts` 使用 literal dynamic import 加载 `../../salary-timer/src/app` 与 `../../salary-timer/src/index.css`，在 `projects.ts` 添加同源卡带和 `/previews/salary-timer.avif`。不得复制 `_worker.js` 或配置外部 URL。

- [ ] **Step 3: 新鲜自动验证**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/salary-timer test
pnpm --filter @viral/salary-timer typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
```

Expected：全部退出码 0；`sites/home/dist/salary-timer/index.html` 存在；该玩法懒加载 chunk 的首屏 gzip `<100KB`。

- [ ] **Step 4: 时间压力测试**

用 fake time 与手工设备覆盖上班前、午休、下班、非工作日、临时班次、跨午夜、后台数小时、修改系统时间和设置生效日。确认动画帧丢失不改变事实金额。

- [ ] **Step 5: 隐私与真机验收**

四环境验证 session/local、隐私模式、投屏恢复、清除、custom、片段小票、日报二次确认和微信长按。检查 network/Umami/console 不含月薪、时薪、作息和 custom 文本。

- [ ] **Step 6: 复访事件与状态提交**

验证 D1/D7 只上报一次、每周活跃天数本地计算；浏览器从首页进入 `/salary-timer/`，验证刷新直达、返回首页、320px 和 reduced-motion；更新 README 并单独提交。若原型用户普遍拒绝输入工资或没有办公室渠道，记录 gate 未过并停止接入正式首页列表。生产发布只能随主站执行，并等待用户明确授权。
