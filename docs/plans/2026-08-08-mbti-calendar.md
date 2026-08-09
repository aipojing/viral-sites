# MBTI 受难日历（19）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 16 型日更内容站：用户自选类型、同型同日同款、20 日不重复、温和 streak、临时查看朋友类型、孟菲斯图腾卡，并把 08 的通用 UTC+8 日期与连续访问能力安全抽到 `@viral/shared`。

**Architecture:** 先新增 `shared/daily` 并让 08 保持原 API 的薄包装回归，再创建主站内 `/mbti-calendar/` 的源码与测试模块 `sites/mbti-calendar`，由 `sites/home` 懒加载并统一构建。日更选择使用 `fnv1a + pickN` 对每型 20 条做固定排列，北京时间日序号取模；用户默认类型与 streak 本地保存，临时朋友类型不覆盖默认。内容、图腾和时令包均配置化且受构建期 lint。

**Tech Stack:** Vite 8 · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 · Canvas 2D · `@viral/shared` seeded/daily · localStorage

## Global Constraints

- 依据 `docs/19-mbti-calendar.md`；执行前确认 08 已运行至少两周且 D7 `>15%`，320 条文案完成人工精修，16 套原创图腾成立。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；生产路径固定 `/mbti-calendar/`，不得新建独立 Pages/Worker 服务。
- 产品只让用户自选类型，不提供测试，不判断“真正类型”；首屏写明“非官方、非心理测评，仅作类型梗娱乐”。
- 同一类型、同一北京时间日期、同一内容版本，全网同一条；每型 20 条在连续 20 日内不重复，第 21 日可循环。
- 文案不做能力、招聘、恋爱匹配、心理健康或人生决策结论，不使用伤害笑点和功能堆栈伪科学。
- 选择自己的类型写本地；查看朋友类型是临时态，不覆盖默认；中断 streak 后写“欢迎回来”，不惩罚。
- 不使用第三方 logo、角色、头像、测试题或暗示授权；16 图腾必须原创并通过颜色+形状+字母三重区分。
- 埋点允许四字母枚举、内容 id、日留存桶，不含设备 id 或跨站指纹。
- 页面与卡片日期固定 UTC+8；纯函数显式传 Date。
- 成功标准：D1≥25%、D7≥12%、卡片保存率≥10%，且至少 8 个类型分别有足够样本；不能让少数热门类型代表全部结果。

## File Map

```text
packages/shared/src/daily/
  date-utc8.ts (+test)
  streak.ts (+test)
packages/shared/src/index.ts
sites/cyber-fortune/src/lib/date-utils.ts     # 改为 shared 薄包装
sites/cyber-fortune/src/lib/streak.ts         # 改为 shared 薄包装

sites/mbti-calendar/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  test/setup.ts  test/canvas-stub.ts
  src/main.tsx  src/index.css  src/app.tsx (+test)
  src/content/types.ts
  src/content/entries.ts
  src/content/comfort-groups.ts
  src/content/seasonal-packs.ts
  src/content/content.lint.test.ts
  src/lib/content-lint.ts (+test)
  src/lib/daily-entry.ts (+test)
  src/lib/storage.ts (+test)
  src/lib/seasonal.ts (+test)
  src/lib/glyph.ts (+test)
  src/components/type-picker.tsx (+test)
  src/components/daily-card.tsx (+test)
  src/components/friend-type-picker.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-daily-card.ts (+test)

sites/home/
  mbti-calendar/index.html
  public/previews/mbti-calendar.avif
  vite.config.ts
  src/projects.ts (+test)
  src/experience-loaders.ts (+test)
```

---

### Task 1: 抽取 shared UTC+8 日期与 streak，保持 08 回归

**Files:**
- Create: `packages/shared/src/daily/date-utc8.ts`
- Create: `packages/shared/src/daily/date-utc8.test.ts`
- Create: `packages/shared/src/daily/streak.ts`
- Create: `packages/shared/src/daily/streak.test.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `sites/cyber-fortune/src/lib/date-utils.ts`
- Modify: `sites/cyber-fortune/src/lib/streak.ts`

**Interfaces:**

```ts
export function dateKeyUTC8(now: Date): string
export function yesterdayKeyUTC8(now: Date): string
export function dayNumberUTC8(now: Date): number

export interface DailyStreakState { lastDate: string; count: number }
export interface DailyStreakAdvance { state: DailyStreakState; isRepeat: boolean; returned: boolean }
export function advanceDailyStreak(prev: DailyStreakState | null, now: Date): DailyStreakAdvance
```

- [ ] **Step 1: 复制现有 08 用例到 shared 并扩展**

新增 dayNumber 跨北京时间零点、闰年、相同日稳定；streak 覆盖首次、同日、次日、断签，其中断签返回 `{count:1,returned:true}`。

- [ ] **Step 2: 运行失败测试**

Run: `pnpm --filter @viral/shared test -- src/daily`

Expected：FAIL，模块不存在。

- [ ] **Step 3: 实现 shared 并保留 08 API**

`date-utils.ts` 只 re-export shared；08 的 `advanceStreak` 包装 `advanceDailyStreak` 并返回现有 `{state,isRepeat}`，不把新增 returned 暴露给旧 UI：

```ts
export function advanceStreak(prev: StreakState | null, now: Date): StreakAdvance {
  const { state, isRepeat } = advanceDailyStreak(prev, now)
  return { state, isRepeat }
}
```

- [ ] **Step 4: 新鲜回归并提交**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/shared typecheck
pnpm --filter @viral/cyber-fortune test
pnpm --filter @viral/cyber-fortune typecheck
pnpm --filter @viral/cyber-fortune build
git add packages/shared/src/daily packages/shared/src/index.ts sites/cyber-fortune/src/lib/date-utils.ts sites/cyber-fortune/src/lib/streak.ts
git commit -m "refactor(shared): extract daily date and streak helpers"
```

---

### Task 2: 站点脚手架与 16 型基础资料

**Files:**
- Create: 标准 Vite 配置、`index.html`, `src/main.tsx`, `src/index.css`, `src/app.tsx`, `test/setup.ts`
- Copy: life-grid 的 `_worker.js`, `u.js`, `canvas-stub.ts`
- Create: `sites/mbti-calendar/src/content/types.ts`

**Interfaces:**

```ts
export const PERSONALITY_TYPES = [
  'ENFJ','ENFP','ENTJ','ENTP','ESFJ','ESFP','ESTJ','ESTP',
  'INFJ','INFP','INTJ','INTP','ISFJ','ISFP','ISTJ','ISTP',
] as const
export type PersonalityType = typeof PERSONALITY_TYPES[number]

export type GlyphPrimitive = 'circle' | 'triangle' | 'square' | 'arc' | 'zigzag'
export interface GlyphSpec { primitives: readonly GlyphPrimitive[]; rotation: number; mirror: boolean }

export interface TypeMeta {
  id: PersonalityType
  neutralDescription: string
  color: string
  glyph: GlyphSpec
}
```

- [ ] **Step 1: 创建 `@viral/mbti-calendar` 包**

依赖版本与现有站一致，build 后续接内容 lint。首页 title/description 使用“16 型人格标签梗”，不写“官方测试”“科学测评”。

- [ ] **Step 2: 写 16 型失败测试**

要求 16 型完整唯一、字母顺序稳定、每型中性说明 10～40 字、16 色对页面底色可读、16 glyph signature 唯一。

- [ ] **Step 3: 实现基础资料与孟菲斯 CSS**

每型一个主色，但文字不直接使用低对比主色；统一黑描边。`prefers-reduced-motion` 下禁用几何漂移动画。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/mbti-calendar test
git add sites/mbti-calendar pnpm-lock.yaml
git commit -m "chore(mbti-calendar): scaffold the daily type site"
```

---

### Task 3: 320 条内容、安慰组与构建期 lint

**Files:**
- Create: `sites/mbti-calendar/src/content/entries.ts`
- Create: `sites/mbti-calendar/src/content/comfort-groups.ts`
- Create: `sites/mbti-calendar/src/content/seasonal-packs.ts`
- Create: `sites/mbti-calendar/src/lib/content-lint.ts`
- Create: `sites/mbti-calendar/src/lib/content-lint.test.ts`
- Create: `sites/mbti-calendar/src/content/content.lint.test.ts`

**Interfaces:**

```ts
export interface SufferingEntry {
  id: string
  type: PersonalityType
  text: string
  intensity: 1 | 2 | 3 | 4 | 5
  comfortGroupIds: readonly string[]
  reviewedBy: string
}

export interface ComfortLine { id: string; groupId: string; text: string; reviewedBy: string }
export interface SeasonalPack { id: string; startsOn: string; endsOn: string; entries: readonly SufferingEntry[] }
```

- [ ] **Step 1: 写失败 lint 测试**

每型恰好 20 条常青内容，总计 320；id/正文唯一；事项 8～42 字；每条至少一个存在的安慰组；强度合法；审核标识存在；禁用伤害、疾病、歧视、能力/职业/恋爱结论和伪功能堆栈词；时令包日期合法且不污染基础计数。

- [ ] **Step 2: 完成内容与人工抽审**

每条具体落到会议、群聊、点单、回消息、计划等情境，以对应类型自嘲为主。每型至少找一位自认该类型的读者抽审 10 条；“被冒犯”条目必须回炉。`reviewedBy` 写审核角色标识，不写用户个人资料。

- [ ] **Step 3: 接入 build 门禁**

```json
"build": "tsc --noEmit && vitest run src/content/content.lint.test.ts && vite build"
```

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/mbti-calendar test -- src/lib/content-lint.test.ts src/content/content.lint.test.ts
git add sites/mbti-calendar/src/content sites/mbti-calendar/src/lib/content-lint* sites/mbti-calendar/package.json
git commit -m "feat(mbti-calendar): add the reviewed twenty-day library"
```

---

### Task 4: 20 日确定性排列与时令覆盖

**Files:**
- Create: `sites/mbti-calendar/src/lib/daily-entry.ts`
- Create: `sites/mbti-calendar/src/lib/daily-entry.test.ts`
- Create: `sites/mbti-calendar/src/lib/seasonal.ts`
- Create: `sites/mbti-calendar/src/lib/seasonal.test.ts`

**Interfaces:**

```ts
export const CONTENT_VERSION = 'mbti-v1'
export interface DailyTypeContent {
  dateKey: string
  type: PersonalityType
  entry: SufferingEntry
  comfort: ComfortLine
}

export function dailyContent(type: PersonalityType, now: Date): DailyTypeContent
export function activeSeasonalPack(now: Date, packs?: readonly SeasonalPack[]): SeasonalPack | null
```

- [ ] **Step 1: 写失败测试**

同型同日一致、跨设备时区一致、每型连续 20 天无重复、第 21 天可循环、不同类型分叉、comfort 只能来自 entry 允许组、时令包起止按 UTC+8 且到期自动退出。

- [ ] **Step 2: 实现固定排列**

```ts
const items = ENTRIES.filter((entry) => entry.type === type)
const permutation = pickN(seededSequence(fnv1a(`${type}|${CONTENT_VERSION}`)), items, items.length)
const entry = permutation[((dayNumberUTC8(now) % 20) + 20) % 20]
```

comfort 使用 `${entry.id}|${dateKey}|${CONTENT_VERSION}` 的独立 seed，从允许组的合并候选中 pickOne。时令包只有包含该 type 的 entry 时替换常青项。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/mbti-calendar test -- src/lib/daily-entry.test.ts src/lib/seasonal.test.ts
git add sites/mbti-calendar/src/lib/daily-entry* sites/mbti-calendar/src/lib/seasonal*
git commit -m "feat(mbti-calendar): add deterministic daily content"
```

---

### Task 5: 本地默认类型与温和 streak

**Files:**
- Create: `sites/mbti-calendar/src/lib/storage.ts`
- Create: `sites/mbti-calendar/src/lib/storage.test.ts`

**Interfaces:**

```ts
export interface MbtiLocalState {
  version: 1
  ownType: PersonalityType
  streak: DailyStreakState
  firstVisitDay: number
  viewedDateByType: Partial<Record<PersonalityType, string>>
  reportedReturnDays: readonly number[]
}
export function loadLocalState(storage: Storage): MbtiLocalState | null
export function selectOwnType(storage: Storage, type: PersonalityType, now: Date): MbtiLocalState
export function visitToday(storage: Storage, state: MbtiLocalState, now: Date):
  { state: MbtiLocalState; returned: boolean; isRepeat: boolean }
```

- [ ] **Step 1: 写失败测试**

首次、同日、次日、断签欢迎回来、坏 JSON、storage error、朋友类型不写 ownType、UTC+8 跨日、每型每日 view 去重，以及 D1/D3/D7 留存桶只上报一次。

- [ ] **Step 2: 实现版本化本地状态**

key 固定 `viral:mbti-calendar:state:v1`；所有 storage 异常静默降级为当前会话。`returned` 只控制欢迎文案，不显示“失去连续记录”。`firstVisitDay` 使用 `dayNumberUTC8`；`reportedReturnDays` 只允许 `[1,3,7]`，用于保证 `return_day` 每个桶最多上报一次。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/mbti-calendar test -- src/lib/storage.test.ts
git add sites/mbti-calendar/src/lib/storage*
git commit -m "feat(mbti-calendar): persist type and gentle streak"
```

---

### Task 6: 类型选择、今日卡与朋友临时查看

**Files:**
- Create: `sites/mbti-calendar/src/components/type-picker.tsx`
- Create: `sites/mbti-calendar/src/components/type-picker.test.tsx`
- Create: `sites/mbti-calendar/src/components/daily-card.tsx`
- Create: `sites/mbti-calendar/src/components/daily-card.test.tsx`
- Create: `sites/mbti-calendar/src/components/friend-type-picker.tsx`
- Create: `sites/mbti-calendar/src/components/friend-type-picker.test.tsx`
- Modify: `sites/mbti-calendar/src/app.tsx`
- Create: `sites/mbti-calendar/src/app.test.tsx`

**Interfaces:**

```ts
type ScreenState =
  | { screen: 'pick-own' }
  | { screen: 'today'; ownType: PersonalityType; viewingType: PersonalityType; isFriendView: boolean }
```

- [ ] **Step 1: 写失败流程测试**

首屏边界说明；16 型网格与中性说明；选择保存并进入今日卡；下次直达；朋友查看不覆盖 ownType；返回自己；同日刷新内容不变；断签显示欢迎回来；事件 `type_selected/daily_card_viewed/friend_type_viewed/generate/return_day` 参数合法。

- [ ] **Step 2: 实现组件与状态机**

`daily_card_viewed` 通过本地 `viewedDateByType[type]` 每型每日最多一次；own type 与 friend view 分开。当前 `dayNumberUTC8-firstVisitDay` 恰为 1/3/7 且未在 `reportedReturnDays` 时记录 `return_day { day:'D1'|'D3'|'D7' }` 并持久化。页面不显示类型排名、优劣或匹配建议。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/mbti-calendar test
git add sites/mbti-calendar/src/components sites/mbti-calendar/src/app*
git commit -m "feat(mbti-calendar): build daily and friend views"
```

---

### Task 7: 16 套原创图腾与孟菲斯分享卡

**Files:**
- Create: `sites/mbti-calendar/src/lib/glyph.ts`
- Create: `sites/mbti-calendar/src/lib/glyph.test.ts`
- Create: `sites/mbti-calendar/src/card/draw-daily-card.ts`
- Create: `sites/mbti-calendar/src/card/draw-daily-card.test.ts`
- Create: `sites/mbti-calendar/src/components/save-card-button.tsx`
- Create: `sites/mbti-calendar/src/components/save-card-button.test.tsx`
- Create: `sites/mbti-calendar/src/components/long-press-overlay.tsx`
- Modify: `sites/mbti-calendar/src/components/daily-card.tsx`

**Interfaces:**

```ts
export function glyphSignature(spec: GlyphSpec): string
export function makeMbtiDailyCardDraw(data: DailyTypeContent & { streak: number }): DrawFn
```

- [ ] **Step 1: 写失败图腾与卡片测试**

16 signature 唯一、每个至少两个 primitive、只用原创几何；卡片含四字母/日期/事项/强度/安慰/@同类/品牌；最长事项不溢出；类型和事项在缩略图第一层；不得出现官方 logo 或角色。

- [ ] **Step 2: 实现图腾绘制**

DOM 和 Canvas 使用同一 GlyphSpec；颜色只是辅助，四字母和几何形状始终存在。强度写“娱乐刻度”，不写心理指数。

- [ ] **Step 3: 实现保存**

保存记录 `save_image { type, content:entry.id }`；内容 id 允许用于下线与效果分析，不含用户身份。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/mbti-calendar test
git add sites/mbti-calendar/src/lib/glyph* sites/mbti-calendar/src/card sites/mbti-calendar/src/components
git commit -m "feat(mbti-calendar): add original daily type cards"
```

---

### Task 8: 主站接入、品牌、安全与发布 gate

- [ ] **Step 1: 写失败测试并接入主站**

创建 `sites/home/mbti-calendar/index.html` 与预览图；在 home Vite MPA input、literal loader 和 projects registry 登记 `/mbti-calendar/`。先让 home 测试断言同源 href 和 registry parity 并确认 FAIL，再完成最小接入。

- [ ] **Step 2: 新鲜自动验证**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/shared typecheck
pnpm --filter @viral/cyber-fortune test
pnpm --filter @viral/cyber-fortune build
pnpm --filter @viral/mbti-calendar test
pnpm --filter @viral/mbti-calendar typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
```

Expected：全部退出码 0；320 条内容 gate 和 16 图腾唯一性通过；`sites/home/dist/mbti-calendar/index.html` 存在；懒加载首屏 gzip `<100KB`。

- [ ] **Step 3: 内容与商标边界复核**

逐条确认无招聘/恋爱/心理/能力结论，无官方 logo/角色/题目/授权暗示；页面固定免责声明可见。建立按 entry id 下线的 `DISABLED_ENTRY_IDS` 配置，并测试被禁内容不会被 dailyContent 选中且每型仍保持 20 条可用内容；不足则构建失败。

- [ ] **Step 4: 四环境验收**

验证 UTC+8 跨日、20 日无重复、朋友查看、默认类型、断签、reduced-motion、16 色/形双编码、最长卡片和微信长按。

- [ ] **Step 5: 更新状态并提交**

```bash
git add sites/mbti-calendar packages/shared sites/cyber-fortune sites/home/mbti-calendar sites/home/public/previews/mbti-calendar.avif sites/home/vite.config.ts sites/home/src README.md
git commit -m "docs(mbti-calendar): record content and release review"
```

浏览器必须从首页进入并验证刷新、返回首页、UTC+8 跨日、320px 与 reduced-motion。生产只随 `@viral/home` 统一发布并等待用户明确授权。
