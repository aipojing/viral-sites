# 睡眠银行（13）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `sites/life-grid` 结果页第一张人生卡之后新增「时间都去哪了」模块，用互斥的一周时间账本和可重叠的屏幕注意力旁账投影余生，并生成第二张分享卡。

**Architecture:** 不创建新路径或新部署；计算层新增纯函数 `time-ledger.ts`，把当前一周固定事项与退休前/后的剩余周数分开计算；屏幕时间永远只进入旁账。React 由一个自持状态的 `TimeLedgerSection` 挂在 `ResultScreen` 底部，`sites/home` 仍通过既有 `/life-grid/` loader 构建整个玩法，宿主 `App` 的首轮结果与第一张卡逻辑不变。

**Tech Stack:** 现有 `@viral/life-grid` · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 · Testing Library · Canvas 2D · `@viral/shared`

## Global Constraints

- 依据 `docs/13-sleep-bank.md`；执行前确认 01 已稳定运行两周、结果页存在深度浏览需求，且第一张卡链路稳定。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；不增加 `sleep-bank` 卡带或路径，生产验收固定在 `/life-grid/`。
- 模块位于主结果和现有 `SaveCardButton` 之后；默认折叠，不增加首轮输入，不改变 `generate` 的既有语义。
- 时间账本五类严格互斥并合计每周 168 小时：睡眠、工作/上课、通勤、家务与必要事务、自由时间。
- 屏幕时间是允许与其他类别重叠的旁账，绝不从自由时间再次扣除。
- 每日通勤输入指往返合计；工作和通勤在退休后停止，睡眠与必要事务投影到全部剩余时间。
- 所有计算显式传 `today`，不在纯函数中读取系统时间；展示四舍五入，内部保留浮点精度。
- 固定事项超过 168 小时时返回字段级错误，不生成负自由时间。
- 不上传生日、作息、屏幕时间；事件只携带是否生成、是否调整和卡片类型。
- 视觉沿用 01 方格作业本：纸白、格线青蓝、铅笔灰、批改朱红；颜色不是唯一编码。
- 上线判断：模块打开率≥20%、打开后完成率≥60%、第一张卡保存率下降不超过 2 个百分点、第二张卡保存率≥8%。

## File Map

```text
sites/life-grid/src/
  lib/time-ledger.ts (+test)                   # 输入校验、周账本、余生投影、格式化模型
  components/time-ledger-section.tsx (+test)   # 折叠入口与 edit/result 状态
  components/time-ledger-form.tsx (+test)      # 习惯输入
  components/time-ledger-result.tsx (+test)    # 周账本、旁账、即时调整
  components/time-ledger-chart.tsx (+test)     # 168 格语义化图表
  components/save-time-ledger-button.tsx (+test)
  card/draw-time-ledger-card.ts (+test)
  components/result-screen.tsx                 # 接入点
  app.test.tsx                                 # 首轮流程回归
```

---

### Task 1: 时间账本纯函数与边界

**Files:**
- Create: `sites/life-grid/src/lib/time-ledger.ts`
- Create: `sites/life-grid/src/lib/time-ledger.test.ts`

**Interfaces:**

```ts
export interface HabitInput {
  sleepHoursPerDay: number
  workHoursPerWeek: number
  commuteHoursPerWorkday: number
  workdaysPerWeek: number
  necessaryHoursPerWeek: number
  screenHoursPerDay?: number
  retirementAge: number
}

export type LedgerCategory = 'sleep' | 'work' | 'commute' | 'necessary' | 'free'

export interface TimeLedgerResult {
  weekly: Record<LedgerCategory, number>
  remainingWeeks: number
  workingWeeks: number
  remainingYears: Record<LedgerCategory, number>
  screenYears: number | null
}

export type HabitValidation =
  | { ok: true }
  | { ok: false; field: keyof HabitInput | 'weeklyTotal'; reason: string }

export function validateHabits(input: HabitInput): HabitValidation
export function computeTimeLedger(life: LifeInput, habits: HabitInput): TimeLedgerResult
export function roundDisplayYears(years: number): number
```

- [ ] **Step 1: 写失败测试**

覆盖默认习惯合计 168、小数输入、退休前后拆分、已经退休、超过预期寿命、屏幕旁账不扣自由时间、零通勤、固定事项超过 168、负数/NaN/超范围输入。

```ts
it('keeps screen time outside the mutually exclusive ledger', () => {
  const result = computeTimeLedger(LIFE, { ...DEFAULT_HABITS, screenHoursPerDay: 8 })
  expect(Object.values(result.weekly).reduce((a, b) => a + b, 0)).toBeCloseTo(168)
  expect(result.screenYears).toBeGreaterThan(0)
  expect(result.weekly.free).toBe(
    168 - result.weekly.sleep - result.weekly.work - result.weekly.commute - result.weekly.necessary,
  )
})
```

- [ ] **Step 2: 验证测试按预期失败**

Run: `pnpm --filter @viral/life-grid test -- src/lib/time-ledger.test.ts`

Expected：FAIL，提示 `time-ledger` 模块不存在。

- [ ] **Step 3: 实现最小计算模型**

实现口径固定如下：

```ts
const HOURS_PER_WEEK = 168
const WEEKS_PER_YEAR = 52

const weekly = {
  sleep: habits.sleepHoursPerDay * 7,
  work: habits.workHoursPerWeek,
  commute: habits.commuteHoursPerWorkday * habits.workdaysPerWeek,
  necessary: habits.necessaryHoursPerWeek,
  free: 0,
}
weekly.free = HOURS_PER_WEEK - weekly.sleep - weekly.work - weekly.commute - weekly.necessary

const remainingWeeks = Math.max(0, totalWeeks(expectancy) - weeksLived(life.birth, life.today))
const workingWeeks = Math.min(
  remainingWeeks,
  Math.max(0, (habits.retirementAge - ageInYears(life.birth, life.today)) * WEEKS_PER_YEAR),
)
```

`remainingYears.work/commute` 使用 `workingWeeks`；`sleep/necessary` 使用 `remainingWeeks`；`free` 用剩余总小时减去前四类，确保总量一致；`screenYears` 单独按全部 `remainingWeeks` 计算。输入范围：睡眠 0～24、工作 0～112、通勤 0～8、工作日 0～7、必要事务 0～112、屏幕 0～24、退休年龄为当前年龄～100。

- [ ] **Step 4: 运行纯函数测试**

Run: `pnpm --filter @viral/life-grid test -- src/lib/time-ledger.test.ts`

Expected：PASS。

- [ ] **Step 5: 提交**

```bash
git add sites/life-grid/src/lib/time-ledger.ts sites/life-grid/src/lib/time-ledger.test.ts
git commit -m "feat(life-grid): add remaining-time ledger math"
```

---

### Task 2: 习惯输入与模块状态机

**Files:**
- Create: `sites/life-grid/src/components/time-ledger-form.tsx`
- Create: `sites/life-grid/src/components/time-ledger-form.test.tsx`
- Create: `sites/life-grid/src/components/time-ledger-section.tsx`
- Create: `sites/life-grid/src/components/time-ledger-section.test.tsx`
- Modify: `sites/life-grid/src/components/result-screen.tsx`
- Modify: `sites/life-grid/src/components/result-screen.test.tsx`

**Interfaces:**

```ts
interface TimeLedgerFormProps {
  currentAge: number
  initial: HabitInput
  onSubmit: (habits: HabitInput) => void
}

interface TimeLedgerSectionProps {
  life: LifeInput
}
```

- [ ] **Step 1: 写失败组件测试**

验证默认只出现入口；点击后首轮只出现睡眠、每周工作/上课、每日往返通勤、可选屏幕时间 4 个输入；非法总量显示明确错误且不触发生成；合法提交进入结果；事件 `time_ledger_opened` 和 `time_ledger_generated` 各只触发一次；第一张保存按钮仍位于入口之前。

```tsx
render(<TimeLedgerSection life={LIFE} />)
await user.click(screen.getByRole('button', { name: '再看看，你的时间都去哪了' }))
expect(screen.getByLabelText('平均每天睡眠')).toHaveValue(7.5)
expect(track).toHaveBeenCalledWith('time_ledger_opened')
```

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/life-grid test -- src/components/time-ledger-form.test.tsx src/components/time-ledger-section.test.tsx src/components/result-screen.test.tsx`

Expected：FAIL，新组件不存在。

- [ ] **Step 3: 实现表单与三态模块**

状态只能是 `closed | editing | result`，默认值固定且在界面标注“常见值，可修改”：

```ts
export const DEFAULT_HABITS: HabitInput = {
  sleepHoursPerDay: 7.5,
  workHoursPerWeek: 40,
  commuteHoursPerWorkday: 1.5,
  workdaysPerWeek: 5,
  necessaryHoursPerWeek: 14,
  screenHoursPerDay: 6,
  retirementAge: 60,
}
```

首轮 4 个输入使用 `inputMode="decimal"`，label 中写清“小时/天”“小时/周”；`workdaysPerWeek=5`、`necessaryHoursPerWeek=14`、`retirementAge=60` 作为明确展示的可调整口径，不在首轮增加负担。用户进入结果后的“调整口径”再显示这 3 项高级输入。每次提交前调用 `validateHabits`。`ResultScreen` 在现有 `children`（第一张卡）之后渲染 `<TimeLedgerSection life={input} />`；正常用户应能在 45 秒内完成模块。

- [ ] **Step 4: 运行组件回归**

Run: `pnpm --filter @viral/life-grid test -- src/components/time-ledger-form.test.tsx src/components/time-ledger-section.test.tsx src/components/result-screen.test.tsx src/app.test.tsx`

Expected：PASS，原有首轮流程不变。

- [ ] **Step 5: 提交**

```bash
git add sites/life-grid/src/components/time-ledger-* sites/life-grid/src/components/result-screen* sites/life-grid/src/app.test.tsx
git commit -m "feat(life-grid): add time-ledger entry and form"
```

---

### Task 3: 168 格周历与结果编辑

**Files:**
- Create: `sites/life-grid/src/components/time-ledger-chart.tsx`
- Create: `sites/life-grid/src/components/time-ledger-chart.test.tsx`
- Create: `sites/life-grid/src/components/time-ledger-result.tsx`
- Create: `sites/life-grid/src/components/time-ledger-result.test.tsx`
- Modify: `sites/life-grid/src/components/time-ledger-section.tsx`

**Interfaces:**

```ts
interface TimeLedgerChartProps {
  weekly: TimeLedgerResult['weekly']
  screenHoursPerWeek: number | null
}

interface TimeLedgerResultProps {
  life: LifeInput
  habits: HabitInput
  onEdit: () => void
}
```

- [ ] **Step 1: 写失败测试**

断言图表始终渲染 168 个格子；每一类同时有文字图例和数值；screen 使用 `data-overlay` 而非新增格子；结果显示自由时间第一层、五类年数、注意力旁账和口径说明；点击调整返回原值表单并记录 `habit_adjusted`。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/life-grid test -- src/components/time-ledger-chart.test.tsx src/components/time-ledger-result.test.tsx`

Expected：FAIL。

- [ ] **Step 3: 实现语义化图表与结果**

格子分配使用最大余数法，保证四舍五入后仍恰好 168 格：

```ts
export function allocateWeekCells(weekly: Record<LedgerCategory, number>): Record<LedgerCategory, number> {
  const entries = Object.entries(weekly) as [LedgerCategory, number][]
  const floors = entries.map(([id, hours]) => ({ id, value: Math.floor(hours), rem: hours % 1 }))
  let left = 168 - floors.reduce((sum, item) => sum + item.value, 0)
  for (const item of [...floors].sort((a, b) => b.rem - a.rem)) {
    if (left-- <= 0) break
    item.value += 1
  }
  return Object.fromEntries(floors.map(({ id, value }) => [id, value])) as Record<LedgerCategory, number>
}
```

每个格子带 `aria-label`，图表下方提供完整文字列表。屏幕时间用图表容器上的半透明斜线背景和独立文字说明表达，不把若干格错误标成互斥时间。

- [ ] **Step 4: 运行测试**

Run: `pnpm --filter @viral/life-grid test -- src/components/time-ledger-chart.test.tsx src/components/time-ledger-result.test.tsx src/components/time-ledger-section.test.tsx`

Expected：PASS。

- [ ] **Step 5: 提交**

```bash
git add sites/life-grid/src/components/time-ledger-*
git commit -m "feat(life-grid): render the 168-hour ledger"
```

---

### Task 4: 第二张分享卡与保存链路

**Files:**
- Create: `sites/life-grid/src/card/draw-time-ledger-card.ts`
- Create: `sites/life-grid/src/card/draw-time-ledger-card.test.ts`
- Create: `sites/life-grid/src/components/save-time-ledger-button.tsx`
- Create: `sites/life-grid/src/components/save-time-ledger-button.test.tsx`
- Modify: `sites/life-grid/src/components/time-ledger-result.tsx`

**Interfaces:**

```ts
export interface TimeLedgerCardData {
  freeYears: number
  weekly: TimeLedgerResult['weekly']
  remainingYears: TimeLedgerResult['remainingYears']
  screenYears: number | null
}

export function makeTimeLedgerCardDraw(data: TimeLedgerCardData): DrawFn
```

- [ ] **Step 1: 写失败测试**

Canvas smoke test 覆盖五类、自由时间大数字、最长数值、screen 旁账说明、“按当前习惯估算”和品牌条；保存测试覆盖下载、长按、异常降级以及 `save_image { card: 'time-ledger' }`。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/life-grid test -- src/card/draw-time-ledger-card.test.ts src/components/save-time-ledger-button.test.tsx`

Expected：FAIL。

- [ ] **Step 3: 实现 1080×1440 卡片**

卡片固定层级：标题 → 自由时间大数字 → 五类账本 → 屏幕旁账（可选）→ 口径 → 品牌条。调用方式固定为：

```ts
const canvas = renderCard(makeTimeLedgerCardDraw(data))
saveCard(canvas, {
  filename: 'my-time-ledger.png',
  onLongPress: setOverlayUrl,
})
track('save_image', { card: 'time-ledger' })
```

绘制复用系统字体，不把屏幕时间绘制进五类堆叠条；长按层复用现有 `LongPressOverlay`。

- [ ] **Step 4: 运行卡片测试与全站测试**

Run: `pnpm --filter @viral/life-grid test`

Expected：PASS。

- [ ] **Step 5: 提交**

```bash
git add sites/life-grid/src/card/draw-time-ledger-card* sites/life-grid/src/components/save-time-ledger-button* sites/life-grid/src/components/time-ledger-result.tsx
git commit -m "feat(life-grid): add the time-ledger share card"
```

---

### Task 5: 视觉、可访问性、构建与人工 gate

**Files:**
- Modify: `sites/life-grid/src/index.css`
- Modify: `README.md`

- [ ] **Step 1: 增加集成验收测试**

覆盖 320px 文案不溢出、键盘可完成表单、错误与输入关联、`prefers-reduced-motion` 下无新增持续动画、模块不改变第一张卡的顺序。

- [ ] **Step 2: 运行完整自动验证**

```bash
pnpm --filter @viral/life-grid test
pnpm --filter @viral/life-grid typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
```

Expected：全部退出码 0；`sites/home/dist/life-grid/index.html` 存在；记录 life-grid 懒加载 chunk gzip，新增模块后仍 `<100KB`。

- [ ] **Step 3: 执行手工 gate**

从主站首页进入 `/life-grid/`，在 iPhone 微信、安卓微信、iOS Safari、桌面 Chrome 验证：刷新直达与返回首页；入口位于第一张卡后；合法/溢出输入；168 格与图例；即时调整；第二张卡保存；关闭长按层；第一张卡保存率链路无回归。确认所有文字没有“浪费、毁掉、不自律”等评判词。

- [ ] **Step 4: 更新状态并提交**

```bash
git add sites/life-grid/src/index.css README.md
git commit -m "docs(life-grid): record time-ledger release readiness"
```

部署只能随 `@viral/home` 统一进行并等待用户明确授权；只有观测到第一张卡保存率下降不超过 2 个百分点后，才把模块默认入口保留在结果页。
