# 年度报告生成器（18）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成一套本地优先的年度回顾：10 问分章填写、草稿恢复、答案复核、6～8 页报告、字段级隐私选择、总结卡和可选 URL fragment 完整报告链接。

**Architecture:** `sites/year-report` 是主站内 `/year-report/` 玩法的源码与测试模块，由 `sites/home` 懒加载并统一构建。问题、答案、报告页和公开字段都有版本化类型；草稿只写 localStorage，分享链接只编码用户明确选择的字段到 fragment。报告生成是纯函数，不推断人格或心理状态；生产 HTML 的 fragment 隔离脚本位于 `sites/home/year-report/index.html`，保证统计脚本接触不到答案。

**Tech Stack:** Vite 8 · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 · Canvas 2D · localStorage · URL fragment · `@viral/shared`

## Global Constraints

- 依据 `docs/18-year-report.md`；执行前完成至少 5 人问题可用性测试，确认能唤起具体回忆且不诱导“标准人生”。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；生产路径固定 `/year-report/`，不得新建独立 Pages/Worker 服务。
- 10 问可跳过；“最难熬的一刻”不追问；产品不得据答案生成诊断、人格、关系质量或虚构数据。
- 自由文本统一按 Unicode code points 截断；各题上限在问题配置中明确，最长 60。
- 草稿默认只在当前设备；提供“不保存草稿”和“一键清除”；storage 失败不阻断流程。
- 默认分享只选关键词、小胜利、年度感受评分和明年留言；地点、重要的人和艰难时刻默认关闭。
- 完整报告链接默认关闭，只编码用户逐项选择的字段，必须先显示接收者同款预览并确认不可撤回。
- payload 使用 URL fragment `#report=`，不得放 query；版本、年份、字段 id 和 checksum 必须校验，过长回退图片。
- Umami 不接收答案、地点、人名、歌曲、留言或 fragment；只记录题号、跳过、版本和字段数量。
- 视觉是深底紫青极光；减少动态效果时光斑静止、翻页直接切换。
- 成功标准：开始到完成≥55%、中位完成时间 2～5 分钟、总结卡保存率≥15%、已分享报告打开回流≥15%；完整链接开启率不设增长目标。

## File Map

```text
sites/year-report/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  test/setup.ts  test/canvas-stub.ts
  src/main.tsx  src/index.css  src/app.tsx (+test)
  src/content/questions.ts (+test)
  src/content/transitions.ts
  src/lib/report-types.ts
  src/lib/answers.ts (+test)
  src/lib/draft-storage.ts (+test)
  src/lib/report-model.ts (+test)
  src/lib/public-fields.ts (+test)
  src/lib/report-codec.ts (+test)
  src/components/landing-screen.tsx (+test)
  src/components/question-flow.tsx (+test)
  src/components/chapter-break.tsx (+test)
  src/components/review-screen.tsx (+test)
  src/components/report-viewer.tsx (+test)
  src/components/share-privacy-screen.tsx (+test)
  src/components/public-report.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-summary-card.ts (+test)

sites/home/
  year-report/index.html              # 含 fragment 隔离 bootstrap
  public/previews/year-report.avif
  vite.config.ts
  src/projects.ts (+test)
  src/experience-loaders.ts (+test)
```

---

### Task 0: 建立可运行的站点测试骨架

**Files:**
- Create: `sites/year-report/package.json`
- Create: `sites/year-report/tsconfig.json`
- Create: `sites/year-report/vite.config.ts`
- Create: `sites/year-report/vitest.config.ts`
- Create: `sites/year-report/test/setup.ts`

- [ ] **Step 1: 创建 package 并安装依赖**

先写包名 `@viral/year-report` 和 `test/typecheck/build/dev` scripts，再执行：

```bash
pnpm --filter @viral/year-report add react@^19 react-dom@^19 '@viral/shared@workspace:*'
pnpm --filter @viral/year-report add -D typescript@^7 vite@^8 @vitejs/plugin-react tailwindcss@^4 @tailwindcss/vite@^4 vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/react @types/react-dom
```

- [ ] **Step 2: 配置严格类型与 jsdom 测试环境**

配置与 life-grid 对齐，Vitest 使用 globals 和 `./test/setup.ts`。

- [ ] **Step 3: 验证并提交**

```bash
pnpm --filter @viral/year-report typecheck
git add sites/year-report/package.json sites/year-report/tsconfig.json sites/year-report/vite.config.ts sites/year-report/vitest.config.ts sites/year-report/test/setup.ts pnpm-lock.yaml
git commit -m "chore(year-report): add the testable package skeleton"
```

---

### Task 1: 10 问内容、小样本测试与答案契约

**Files:**
- Create: `sites/year-report/src/content/questions.ts`
- Create: `sites/year-report/src/content/questions.test.ts`
- Create: `sites/year-report/src/content/transitions.ts`
- Create: `sites/year-report/src/lib/report-types.ts`
- Create: `sites/year-report/src/lib/answers.ts`
- Create: `sites/year-report/src/lib/answers.test.ts`

**Interfaces:**

```ts
export type QuestionId =
  | 'keyword' | 'place' | 'song' | 'comfort-food' | 'important-person'
  | 'small-win' | 'hard-moment' | 'feeling-scale' | 'goal-and-release' | 'next-year-message'

export type ChapterId = 'opening' | 'life' | 'feeling' | 'forward'

export interface Question {
  id: QuestionId
  chapter: ChapterId
  prompt: string
  example: string
  maxLength?: number
  optional: boolean
  kind: 'text' | 'keyword' | 'scale' | 'goal'
}

export type AnswerValue = string | number | { completion: number; release: string }
export type ReportAnswers = Partial<Record<QuestionId, AnswerValue>>

export function normalizeAnswer(question: Question, raw: AnswerValue | undefined): AnswerValue | undefined
export function validateAnswers(answers: ReportAnswers): readonly string[]
```

- [ ] **Step 1: 写内容与答案失败测试**

要求恰好 10 问、id 唯一、4 章顺序固定、hard-moment optional、示例非空、所有 text 有明确 maxLength≤60；Unicode 截断、scale 1～5、goal completion 0～100、空白归一为 skip。

- [ ] **Step 2: 写正式十问配置**

题目语义严格对应产品文档；示例只提供具体格式，不给价值判断。关键词 max 8，地点/歌曲/食物/称呼 max 24，小胜利/艰难时刻/放下的事 max 50，明年留言 max 30。

- [ ] **Step 3: 完成 5 人小样本**

每人独立完成后记录题号级的卡顿/跳过/歧义，不保存其答案原文。通过条件：至少 4 人能在 2～5 分钟完成；没有题被多数人理解成要求“成功人生”；hard-moment 的跳过入口被发现。依据结果修订问题配置，并重新运行内容测试。

- [ ] **Step 4: 提交**

```bash
git add sites/year-report/src/content sites/year-report/src/lib/report-types.ts sites/year-report/src/lib/answers*
git commit -m "feat(year-report): define the reviewed ten-question flow"
```

---

### Task 2: 页面入口与年度配置

**Files:**
- Modify: `sites/year-report/package.json`, `sites/year-report/vite.config.ts`
- Create: `sites/year-report/index.html`, `src/main.tsx`, `src/index.css`, `src/app.tsx`
- Copy: life-grid 的 `canvas-stub.ts`

- [ ] **Step 1: 完成页面入口与年度配置**

沿用 Task 0 的包和依赖，build 固定为 `tsc --noEmit && vitest run && vite build`。年份不在文案各处硬编码；由 App 传 `reportYear`，默认 `new Date().getFullYear()` 且只在组装层读取一次。

- [ ] **Step 2: 写最小页面与 SEO 测试**

首屏展示约 3 分钟、本地保存、最终卡片预览与“不保存草稿”入口。title/description 带动态发布年份的构建常量 `VITE_REPORT_YEAR`；缺失时使用当前年。

- [ ] **Step 3: 实现极光基础样式**

CSS 光斑使用伪元素和 transform/opacity；`prefers-reduced-motion: reduce` 下 `animation:none`。正文对比 ≥4.5:1，最小字号 14px。

- [ ] **Step 4: 验证并提交**

```bash
pnpm --filter @viral/year-report test
pnpm --filter @viral/year-report typecheck
git add sites/year-report pnpm-lock.yaml
git commit -m "chore(year-report): scaffold the annual story"
```

---

### Task 3: 本地草稿存储与恢复

**Files:**
- Create: `sites/year-report/src/lib/draft-storage.ts`
- Create: `sites/year-report/src/lib/draft-storage.test.ts`

**Interfaces:**

```ts
export interface DraftV1 {
  version: 1
  reportYear: number
  currentQuestion: number
  answers: ReportAnswers
  updatedAt: number
}

export type DraftLoadResult =
  | { status: 'found'; draft: DraftV1 }
  | { status: 'missing' | 'invalid' | 'disabled' }

export function loadDraft(storage: Storage, reportYear: number): DraftLoadResult
export function saveDraft(storage: Storage, draft: DraftV1): boolean
export function clearDraft(storage: Storage): boolean
```

- [ ] **Step 1: 写失败测试**

覆盖正常恢复、跨年不恢复、坏 JSON、未知版本、非法答案、quota/security error、清除幂等和 disabled 模式完全不调用 storage。

- [ ] **Step 2: 实现版本化存储**

key 固定 `viral:year-report:draft:v1`；load 后调用 `validateAnswers`，非法时返回 invalid 但不抛给 UI。App 只有用户选择保存草稿时才在每题完成后写入。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/year-report test -- src/lib/draft-storage.test.ts
git add sites/year-report/src/lib/draft-storage*
git commit -m "feat(year-report): add local-only draft recovery"
```

---

### Task 4: 分章答题、草稿恢复与答案复核

**Files:**
- Create: `sites/year-report/src/components/landing-screen.tsx`
- Create: `sites/year-report/src/components/landing-screen.test.tsx`
- Create: `sites/year-report/src/components/question-flow.tsx`
- Create: `sites/year-report/src/components/question-flow.test.tsx`
- Create: `sites/year-report/src/components/chapter-break.tsx`
- Create: `sites/year-report/src/components/review-screen.tsx`
- Create: `sites/year-report/src/components/review-screen.test.tsx`
- Modify: `sites/year-report/src/app.tsx`
- Create: `sites/year-report/src/app.test.tsx`

**Interfaces:**

```ts
type AppState =
  | { screen: 'landing'; resume: DraftV1 | null }
  | { screen: 'questions'; index: number; answers: ReportAnswers; saveDraft: boolean }
  | { screen: 'review'; answers: ReportAnswers }
  | { screen: 'report'; answers: ReportAnswers }
  | { screen: 'share'; answers: ReportAnswers }
  | { screen: 'public'; payload: PublicReportPayload }
```

- [ ] **Step 1: 写失败流程测试**

覆盖新建/恢复/清除/不保存；4 个章节过渡；每题继续与跳过；进度；返回修改；复核页可隐藏或重新编辑任一题；生成时清除草稿；恢复/清除分别记录 `draft_resumed` / `draft_cleared`；题目事件只记录 `question_completed { question, skipped }`。

- [ ] **Step 2: 实现答题与复核**

每一题提交先 normalize，再不可变更新 answers。章节结束显示过渡而非额外写 storage。`generate` 只在用户从复核页确认生成报告时记录。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/year-report test
git add sites/year-report/src/components sites/year-report/src/app*
git commit -m "feat(year-report): build the review questionnaire"
```

---

### Task 5: 报告模型与 6～8 页阅读器

**Files:**
- Create: `sites/year-report/src/lib/report-model.ts`
- Create: `sites/year-report/src/lib/report-model.test.ts`
- Create: `sites/year-report/src/components/report-viewer.tsx`
- Create: `sites/year-report/src/components/report-viewer.test.tsx`

**Interfaces:**

```ts
export type ReportSlideKind = 'cover' | 'place' | 'senses' | 'person' | 'weather' | 'growth' | 'ending'
export interface ReportSlide { id: string; kind: ReportSlideKind; title: string; lines: readonly string[] }
export function buildReportSlides(year: number, answers: ReportAnswers): readonly ReportSlide[]
```

- [ ] **Step 1: 写失败测试**

满答案生成 7 页；跳过敏感题时自然缩短到 6 页；无 `暂无数据`；所有主句可追溯到答案；不出现诊断/人格/关系推断；极短和最长文本稳定。

- [ ] **Step 2: 实现纯报告模型**

固定页型为封面、地方、声音与味道、重要的人、情绪天气、成长账单、结尾；没有人/艰难时刻时合并或省略对应内容。过渡句只能来自 `transitions.ts` 的中性集合，不生成答案外事实。

- [ ] **Step 3: 实现阅读器**

使用 scroll-snap，同时提供明确上/下一页按钮和 `aria-live` 页码；reduced-motion 使用 `scrollIntoView({behavior:'auto'})`。不自动播放声音。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/year-report test -- src/lib/report-model.test.ts src/components/report-viewer.test.tsx
git add sites/year-report/src/lib/report-model* sites/year-report/src/components/report-viewer*
git commit -m "feat(year-report): generate the annual report slides"
```

---

### Task 6: 字段级隐私选择与公开模型

**Files:**
- Create: `sites/year-report/src/lib/public-fields.ts`
- Create: `sites/year-report/src/lib/public-fields.test.ts`
- Create: `sites/year-report/src/components/share-privacy-screen.tsx`
- Create: `sites/year-report/src/components/share-privacy-screen.test.tsx`

**Interfaces:**

```ts
export type PublicFieldId = QuestionId
export const DEFAULT_PUBLIC_FIELDS: readonly PublicFieldId[]
export interface PublicReportPayload { version: 1; year: number; answers: ReportAnswers }
export function selectPublicAnswers(answers: ReportAnswers, fields: readonly PublicFieldId[]): ReportAnswers
```

- [ ] **Step 1: 写失败测试**

默认字段严格为 keyword/small-win/feeling-scale/next-year-message；未作答字段不显示；place/important-person/hard-moment 默认关闭；预览只用 selected answers；切换字段立即同步预览。

- [ ] **Step 2: 实现隐私屏**

图片和完整链接共用同一个字段选择 state；敏感字段旁加明确说明。完整链接区默认折叠，展开后仍需二次确认“任何拿到链接的人都能查看，转发后无法撤回”。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/year-report test -- src/lib/public-fields.test.ts src/components/share-privacy-screen.test.tsx
git add sites/year-report/src/lib/public-fields* sites/year-report/src/components/share-privacy-screen*
git commit -m "feat(year-report): add field-level privacy controls"
```

---

### Task 7: Fragment 编解码与接收者视图

**Files:**
- Create: `sites/year-report/src/lib/report-codec.ts`
- Create: `sites/year-report/src/lib/report-codec.test.ts`
- Create: `sites/year-report/src/components/public-report.tsx`
- Create: `sites/year-report/src/components/public-report.test.tsx`
- Modify: `sites/year-report/src/app.tsx`

**Interfaces:**

```ts
export const MAX_REPORT_FRAGMENT_LENGTH = 1800
export function encodePublicReport(payload: PublicReportPayload): string
export function decodePublicReport(raw: string): PublicReportPayload
export function buildPublicReportUrl(base: URL, payload: PublicReportPayload): string | null
```

- [ ] **Step 1: 写失败测试**

UTF-8 base64url roundtrip、版本、年份范围、字段白名单、maxLength、checksum、坏 JSON、未知字段、query 不含答案、超 1800 返回 null。checksum 使用 `fnv1a` 对 canonical JSON 计算，仅检错不宣称加密。

- [ ] **Step 2: 实现最小 payload**

canonical payload 为 `{v:1,y,fields:[[id,value],...],c}`，fields 按 QuestionId 固定顺序；URL 固定 `${origin}${pathname}#report=${encoded}`。解码再次运行 answer validation。

- [ ] **Step 3: 在统计脚本运行前隔离 fragment**

生产入口 `sites/home/year-report/index.html` 必须在 `/u.js` 之前放置同步内联脚本；本地调试入口 `sites/year-report/index.html` 保持同样顺序：

```html
<script>
  window.__YEAR_REPORT_FRAGMENT__ = window.location.hash;
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
</script>
```

App 读取后立即 `delete window.__YEAR_REPORT_FRAGMENT__`。测试断言 Umami 脚本加载时 `location.hash === ''`，从而保证即便统计工具默认采集完整页面地址，也收不到答案 fragment。

- [ ] **Step 4: 实现接收者视图**

App 启动最先检查 bootstrap 保存的 fragment；合法则只渲染 public report，不写草稿，并记录 `share_report_opened { version, field_count }`；非法显示“这份报告链接无法读取”并提供回首页。创建链接记录 `share_link_created { version, field_count }`。接收者与分享预览都调用 `buildReportSlides(payload.year,payload.answers)`。

- [ ] **Step 5: 运行并提交**

```bash
pnpm --filter @viral/year-report test -- src/lib/report-codec.test.ts src/components/public-report.test.tsx src/app.test.tsx
git add sites/year-report/index.html sites/home/year-report/index.html sites/year-report/src/lib/report-codec* sites/year-report/src/components/public-report* sites/year-report/src/app.tsx
git commit -m "feat(year-report): add private fragment sharing"
```

---

### Task 8: 总结卡与保存

**Files:**
- Create: `sites/year-report/src/card/draw-summary-card.ts`
- Create: `sites/year-report/src/card/draw-summary-card.test.ts`
- Create: `sites/year-report/src/components/save-card-button.tsx`
- Create: `sites/year-report/src/components/save-card-button.test.tsx`
- Create: `sites/year-report/src/components/long-press-overlay.tsx`
- Modify: `sites/year-report/src/components/share-privacy-screen.tsx`

**Interfaces:**

```ts
interface SummaryCardData { year: number; answers: ReportAnswers }
export function makeSummaryCardDraw(data: SummaryCardData): DrawFn
```

- [ ] **Step 1: 写失败测试**

三种答案长度、默认四字段、敏感字段关闭、最长留言、九宫格层级、1080×1440 不越界；图片预览与实际卡片使用相同 selected answers。

- [ ] **Step 2: 实现极光总结卡**

年份和关键词第一层，小胜利与明年留言第二层，评分为娱乐量表且不伪装精确统计。保存记录 `save_image { field_count }`，不含 field ids 或内容。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/year-report test
git add sites/year-report/src/card sites/year-report/src/components
git commit -m "feat(year-report): add private summary cards"
```

---

### Task 9: 主站接入、隐私、视觉与发布 gate

- [ ] **Step 1: 写失败测试并接入主站**

创建 `sites/home/year-report/index.html` 与预览图；在 home Vite MPA input、literal loader 和 projects registry 登记 `/year-report/`。测试必须断言 href 同源、loader key 一致，并读取生产 HTML 确认 fragment bootstrap 位于 `/u.js` 之前。

- [ ] **Step 2: 新鲜自动验证**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/year-report test
pnpm --filter @viral/year-report typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
```

Expected：全部退出码 0；`sites/home/dist/year-report/index.html` 存在且保留 bootstrap 顺序；懒加载首屏 gzip `<100KB`。

- [ ] **Step 3: 隐私路径复核**

用包含敏感地点、人名代号和艰难时刻的测试答案确认：默认卡不含敏感字段；fragment 只含勾选字段；网络请求/Umami payload/console 不含答案；关闭 fragment 后服务端无法恢复内容；公共设备模式不写草稿。

- [ ] **Step 4: 视觉与真机验收**

320px 和桌面验证 6～8 页、按钮与 scroll-snap、reduced-motion、恢复/清除草稿、三种文本长度卡片、微信长按和 fragment 分享接收者视图。若 12 月 10 日仍未达到视觉标准，顺延一年。

- [ ] **Step 5: 更新状态并提交**

```bash
git add sites/year-report sites/home/year-report sites/home/public/previews/year-report.avif sites/home/vite.config.ts sites/home/src README.md
git commit -m "docs(year-report): record privacy and release review"
```

浏览器必须从首页进入并验证刷新、返回首页、fragment 接收者视图、320px 与 reduced-motion。生产只随 `@viral/home` 统一发布并等待用户明确授权。
