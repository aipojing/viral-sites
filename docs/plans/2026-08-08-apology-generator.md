# 道歉与请假模式（14）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `sites/refusal-generator` 内新增「道歉与请假」顶层模式，完成对象、事由、语气、三候选、可编辑复制和娱乐语气信纸卡，同时扩展 shared 的安全可选变量模板能力。

**Architecture:** 不创建新路径或新部署。`App` 顶层增加 `refusal | document` 模式路由，原拒绝流程封装为 `RefusalMode` 保持行为不变；`sites/home` 仍通过既有 `/refusal-generator/` loader 构建整个玩法。文书模式使用本地内容矩阵与 `@viral/shared` 新增的 `renderOptionalTemplate`，正式文案和娱乐文案用数据字段硬分区，只有娱乐文案开放分享卡。

**Tech Stack:** 现有 `@viral/refusal-generator` + `@viral/shared` · React 19 · TypeScript(strict) · Tailwind 4 · zod 4 · Vitest 3 · Canvas 2D

## Global Constraints

- 依据 `docs/14-apology-generator.md`；执行前确认 11 复制率 `>15%` 且许愿中道歉/请假进入前三。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；不增加 `apology-generator` 卡带或路径，生产验收固定在 `/refusal-generator/`。
- 首发内容至少 60 个经双人盲审的“场景 × 对象 × 语气”组合；每组 3 个候选。内容不足时缩小场景，不用模型临时补量。
- 产品名称固定使用“请假消息”，不得生成证明、公章、签名、诊断书、病假条图片或规避审核内容。
- 正式文案与玩梗文案不可混批；`kind: 'usable' | 'joke'` 是构建期强制字段。
- 自由输入最多 30 个 Unicode code points，只在内存处理；编辑后的正文不进 localStorage 和埋点。
- 埋点可含 `type/scene/audience/tone/kind` 枚举，不得含事由、称呼、正文、日期或补救动作。
- 正式语气主动作是复制，不显示保存卡；仅 `wenyan`、`fafeng` 等 `kind:'joke'` 候选显示信纸卡。
- 原有拒绝模式所有测试、120 条文案 lint 与卡片行为必须原样回归。
- 上线两周判断：整体复制率≥15%，正式档复制率应显著高于玩梗档，编辑后复制比例≤60%；否则先改内容，不扩场景。

## File Map

```text
packages/shared/src/phrase/
  interpolate.ts (+test)                      # 命名变量 + 可选块
packages/shared/src/index.ts                  # 导出新增 API

sites/refusal-generator/src/
  app.tsx (+test)                             # 顶层模式切换
  modes/refusal-mode.tsx (+test)              # 原 App 拆入，不改行为
  modes/document-mode.tsx (+test)             # 文书状态机
  configs/document-types.ts
  configs/document-scenes.ts
  configs/document-audiences.ts
  configs/document-tones.ts
  configs/document-templates.ts
  configs/document-templates.lint.test.ts
  lib/document-schema.ts (+test)
  lib/document-lint.ts (+test)
  lib/document-render.ts (+test)
  lib/document-safety.ts (+test)
  components/document-picker.tsx (+test)
  components/document-details-form.tsx (+test)
  components/document-results.tsx (+test)
  card/draw-letter-card.ts (+test)
  components/save-letter-button.tsx (+test)
```

---

### Task 1: shared 命名变量与可选块

**Files:**
- Create: `packages/shared/src/phrase/interpolate.ts`
- Create: `packages/shared/src/phrase/interpolate.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**

```ts
export type TemplateValues = Readonly<Record<string, string | undefined>>

// [[...]] 表示可选块：块中任一 {变量} 缺失则整块移除。
export function renderOptionalTemplate(template: string, values: TemplateValues): string
export function listTemplateVariables(template: string): readonly string[]
```

- [ ] **Step 1: 写失败测试**

```ts
it('removes an optional block when one of its variables is absent', () => {
  expect(renderOptionalTemplate(
    '{对象称呼}，我因{事由}需要请假。[[预计{日期}返回，并会{补救动作}。]]',
    { 对象称呼: '老师', 事由: '个人事务' },
  )).toBe('老师，我因个人事务需要请假。')
})
```

同时覆盖多处替换、Unicode、HTML 字符保持纯文本、未知变量抛错、嵌套 `[[` 拒绝、残余空格和重复标点清理。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/shared test -- src/phrase/interpolate.test.ts`

Expected：FAIL，模块不存在。

- [ ] **Step 3: 实现解析器**

实现顺序固定：拒绝嵌套可选块 → 展开/删除可选块 → 替换必选变量 → 若必选变量缺失则抛出带变量名的错误 → 只清理模板删除产生的空格和 `，。` 连写。不得使用 `innerHTML`。

```ts
const TOKEN = /\{([^{}]+)\}/gu
const OPTIONAL = /\[\[([^\[\]]*)\]\]/gu

function replaceTokens(text: string, values: TemplateValues): string {
  return text.replace(TOKEN, (_, key: string) => {
    const value = values[key]?.trim()
    if (!value) throw new Error(`missing template value: ${key}`)
    return value
  })
}
```

- [ ] **Step 4: 验证 shared 与拒绝模式回归**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/shared typecheck
pnpm --filter @viral/refusal-generator test
```

Expected：全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/shared/src/phrase/interpolate* packages/shared/src/index.ts
git commit -m "feat(shared): add optional named template rendering"
```

---

### Task 2: 文书 schema、矩阵 lint 与首发内容

**Files:**
- Create: `sites/refusal-generator/src/configs/document-types.ts`
- Create: `sites/refusal-generator/src/configs/document-scenes.ts`
- Create: `sites/refusal-generator/src/configs/document-audiences.ts`
- Create: `sites/refusal-generator/src/configs/document-tones.ts`
- Create: `sites/refusal-generator/src/configs/document-templates.ts`
- Create: `sites/refusal-generator/src/configs/document-templates.lint.test.ts`
- Create: `sites/refusal-generator/src/lib/document-schema.ts`
- Create: `sites/refusal-generator/src/lib/document-schema.test.ts`
- Create: `sites/refusal-generator/src/lib/document-lint.ts`
- Create: `sites/refusal-generator/src/lib/document-lint.test.ts`

**Interfaces:**

```ts
export type DocumentType = 'apology' | 'leave'
export type DocumentKind = 'usable' | 'joke'

export interface DocumentTemplate {
  id: string
  type: DocumentType
  scene: string
  audience: string
  tone: string
  kind: DocumentKind
  text: string
  reviewedBy: readonly [string, string]
}

export interface DocumentLintIssue {
  code: 'duplicate-id' | 'missing-cell' | 'candidate-count' | 'length' | 'unknown-variable' |
    'kind-mismatch' | 'missing-review'
  id?: string
  message: string
}
```

- [ ] **Step 1: 写 schema/lint 失败测试**

验证 40～180 code points、允许变量仅为 `对象称呼/事由/日期/补救动作`、每个启用矩阵单元恰好 3 条、正式 tone 只能 `usable`、娱乐 tone 只能 `joke`、两个不同审核人标识必填、重复正文与 id 失败。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/refusal-generator test -- src/lib/document-schema.test.ts src/lib/document-lint.test.ts`

Expected：FAIL。

- [ ] **Step 3: 实现枚举与 lint**

首发枚举固定为：

```ts
export const DOCUMENT_TYPES = ['apology', 'leave'] as const
export const DOCUMENT_AUDIENCES = ['boss', 'teacher', 'client', 'colleague', 'partner', 'friend'] as const
export const DOCUMENT_TONES = [
  { id: 'sincere', kind: 'usable' },
  { id: 'brief', kind: 'usable' },
  { id: 'gentle', kind: 'usable' },
  { id: 'wenyan', kind: 'joke' },
  { id: 'fafeng', kind: 'joke' },
] as const
```

场景固定为道歉 6 类、请假 5 类；`document-templates.ts` 只登记实际完成并通过双人审核的启用组合，另导出 `ENABLED_DOCUMENT_CELLS`。lint 对启用组合要求 3 条，不要求用空内容凑满全部笛卡尔积；首发 `ENABLED_DOCUMENT_CELLS.length >= 60`。

- [ ] **Step 4: 编写并双人审核首发文案**

每个启用组合写 3 条完整模板并填两个审核人标识。正式文案必须承担影响、不捏造事实、有需要时给补救动作；娱乐文案不得以疾病、死亡、灾难和弱势群体为笑点。完成后运行：

```bash
pnpm --filter @viral/refusal-generator test -- src/configs/document-templates.lint.test.ts
```

Expected：PASS，输出启用组合数 ≥60、模板数为组合数 ×3。

- [ ] **Step 5: 将内容 lint 接入 build 并提交**

把 build 改为：

```json
"build": "tsc --noEmit && vitest run src/configs/phrases.lint.test.ts src/configs/document-templates.lint.test.ts && vite build"
```

```bash
git add sites/refusal-generator/package.json sites/refusal-generator/src/configs/document-* sites/refusal-generator/src/lib/document-*
git commit -m "feat(refusal-generator): add reviewed document content matrix"
```

---

### Task 3: 文书渲染与三候选批次

**Files:**
- Create: `sites/refusal-generator/src/lib/document-render.ts`
- Create: `sites/refusal-generator/src/lib/document-render.test.ts`

**Interfaces:**

```ts
export interface DocumentValues {
  addressee?: string
  reason: string
  date?: string
  remedy?: string
}

export interface RenderedDocument {
  id: string
  kind: DocumentKind
  text: string
}

export function normalizeDocumentValues(raw: DocumentValues): DocumentValues
export function renderDocumentBatch(
  templates: readonly DocumentTemplate[],
  values: DocumentValues,
): readonly [RenderedDocument, RenderedDocument, RenderedDocument]
```

- [ ] **Step 1: 写失败测试**

覆盖称呼留空时使用中性词、事由最多 30 code points、可选日期/补救动作自然消失、特殊字符作为纯文本、同一批三条唯一、缺少事由拒绝生成。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/refusal-generator test -- src/lib/document-render.test.ts`

Expected：FAIL。

- [ ] **Step 3: 实现渲染**

```ts
const values = {
  对象称呼: normalized.addressee || '你好',
  事由: normalized.reason,
  日期: normalized.date,
  补救动作: normalized.remedy,
}
```

选择由 `type/scene/audience/tone` 完成，输入变化只重新渲染，不换候选 id；换一批只有在某单元超过 3 条时才出现。

- [ ] **Step 4: 运行测试并提交**

```bash
pnpm --filter @viral/refusal-generator test -- src/lib/document-render.test.ts
git add sites/refusal-generator/src/lib/document-render*
git commit -m "feat(refusal-generator): render document candidates"
```

---

### Task 4: 拆出原拒绝模式并增加顶层切换

**Files:**
- Create: `sites/refusal-generator/src/modes/refusal-mode.tsx`
- Create: `sites/refusal-generator/src/modes/refusal-mode.test.tsx`
- Modify: `sites/refusal-generator/src/app.tsx`
- Modify: `sites/refusal-generator/src/app.test.tsx`

**Interfaces:**

```ts
export type AppMode = 'refusal' | 'document'
export function RefusalMode(): JSX.Element
```

- [ ] **Step 1: 先锁定原行为测试**

把现有 `App` 的场景、语气、自定义场景、复制与保存断言保留，新增切换到文书再切回时拒绝模式重置的明确断言。

- [ ] **Step 2: 运行现有测试建立绿基线**

Run: `pnpm --filter @viral/refusal-generator test -- src/app.test.tsx`

Expected：PASS。

- [ ] **Step 3: 机械拆分并加双 tab**

`RefusalMode` 内容来自当前 `App`，不顺手重构。新 `App` 只持有：

```tsx
const [mode, setMode] = useState<AppMode>('refusal')
return <main>{/* 标题 + 两个 aria-pressed 按钮 + 对应 Mode */}</main>
```

点击记录 `mode_selected { mode }`，切换时通过 `key={mode}` 重建子树，避免不同模式残留称呼或正文。

- [ ] **Step 4: 运行全站回归并提交**

```bash
pnpm --filter @viral/refusal-generator test
git add sites/refusal-generator/src/app* sites/refusal-generator/src/modes/refusal-mode*
git commit -m "refactor(refusal-generator): separate the refusal mode"
```

---

### Task 5: 文书选择、详情与可编辑结果

**Files:**
- Create: `sites/refusal-generator/src/modes/document-mode.tsx`
- Create: `sites/refusal-generator/src/modes/document-mode.test.tsx`
- Create: `sites/refusal-generator/src/components/document-picker.tsx`
- Create: `sites/refusal-generator/src/components/document-picker.test.tsx`
- Create: `sites/refusal-generator/src/components/document-details-form.tsx`
- Create: `sites/refusal-generator/src/components/document-details-form.test.tsx`
- Create: `sites/refusal-generator/src/components/document-results.tsx`
- Create: `sites/refusal-generator/src/components/document-results.test.tsx`
- Modify: `sites/refusal-generator/src/app.tsx`

**Interfaces:**

```ts
type DocumentState =
  | { step: 'pick'; type: DocumentType | null; scene: string | null; audience: string | null; tone: string | null }
  | { step: 'details'; selection: DocumentSelection }
  | { step: 'results'; selection: DocumentSelection; values: DocumentValues; drafts: readonly string[] }
```

- [ ] **Step 1: 写失败交互测试**

验证顺序为类型→对象→事由→语气→详情→三候选；玩梗语气有警示；用户可编辑单条后复制；复制记录枚举和 `edited:true/false`；正文不出现在 track 参数；返回修改保留枚举但不持久化正文。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/refusal-generator test -- src/modes/document-mode.test.tsx src/components/document-*.test.tsx`

Expected：FAIL。

- [ ] **Step 3: 实现状态机与组件**

结果组件每条使用受控 `<textarea maxLength={220}>`；初始文本来自 `renderDocumentBatch`，比较当前值与初始值计算 `edited`。复制复用现有 `copyText`，事件固定为：

```ts
track('copy', {
  mode: 'document',
  type: selection.type,
  scene: selection.scene,
  audience: selection.audience,
  tone: selection.tone,
  kind: candidate.kind,
})
if (edited) track('edited_before_copy', { type: selection.type, tone: selection.tone })
```

- [ ] **Step 4: 运行测试并提交**

```bash
pnpm --filter @viral/refusal-generator test
git add sites/refusal-generator/src/modes/document-mode* sites/refusal-generator/src/components/document-*
git commit -m "feat(refusal-generator): add apology and leave flow"
```

---

### Task 6: 娱乐文书信纸卡

**Files:**
- Create: `sites/refusal-generator/src/card/draw-letter-card.ts`
- Create: `sites/refusal-generator/src/card/draw-letter-card.test.ts`
- Create: `sites/refusal-generator/src/components/save-letter-button.tsx`
- Create: `sites/refusal-generator/src/components/save-letter-button.test.tsx`
- Modify: `sites/refusal-generator/src/components/document-results.tsx`

**Interfaces:**

```ts
export interface LetterCardData {
  typeLabel: string
  tone: 'wenyan' | 'fafeng'
  text: string
  includeAddressee: boolean
}
export function makeLetterCardDraw(data: LetterCardData): DrawFn
```

- [ ] **Step 1: 写失败测试**

断言 usable 不渲染保存按钮；joke 才渲染；默认卡片移除用户填写的真实称呼，用户明确勾选后才保留；最长 220 字换行不越界；卡片不出现公章、签名和“证明”字样。

- [ ] **Step 2: 运行并确认失败**

Run: `pnpm --filter @viral/refusal-generator test -- src/card/draw-letter-card.test.ts src/components/save-letter-button.test.tsx`

Expected：FAIL。

- [ ] **Step 3: 实现信纸卡**

卡片使用折痕、抬头和场景色，正文用 `wrapByLength`；保存调用 shared，并记录 `save_image { mode:'document', type, tone }`。默认传入的 `text` 必须是重新以中性称呼渲染的版本，而非用户编辑稿；只有 `includeAddressee` 明确勾选才使用当前编辑稿。

- [ ] **Step 4: 运行测试并提交**

```bash
pnpm --filter @viral/refusal-generator test
git add sites/refusal-generator/src/card/draw-letter-card* sites/refusal-generator/src/components/save-letter-button* sites/refusal-generator/src/components/document-results.tsx
git commit -m "feat(refusal-generator): add joke document cards"
```

---

### Task 7: 安全、构建与真机验收

**Files:**
- Create: `sites/refusal-generator/src/lib/document-safety.ts`
- Create: `sites/refusal-generator/src/lib/document-safety.test.ts`
- Modify: `sites/refusal-generator/src/modes/document-mode.tsx`
- Modify: `sites/refusal-generator/src/index.css`
- Modify: `README.md`

- [ ] **Step 1: 增加安全回归测试**

使用包含自伤、暴力威胁和严重医疗状况的输入 fixture，确保不会套玩梗模板，而显示中性提示并只提供正式语气；测试只在内存使用 fixture，不将输入写进快照或日志。

```ts
export type DocumentSafety = 'normal' | 'sensitive'
export function classifyDocumentInput(values: DocumentValues): DocumentSafety
```

实现保守的本地关键词/短语表，只用于关闭娱乐语气，不用于诊断或阻止正式文案。命中时不记录命中词，只记录 `safety_mode { mode:'formal-only' }`；组件把 tone 限制为 usable，并显示“这件事更适合直接、认真地联系对方或可信任的人”。

- [ ] **Step 2: 运行新鲜验证**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/shared typecheck
pnpm --filter @viral/refusal-generator test
pnpm --filter @viral/refusal-generator typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
```

Expected：全部退出码 0；两套内容 lint 均为 PASS；`sites/home/dist/refusal-generator/index.html` 存在；refusal-generator 懒加载 chunk 首屏 gzip `<100KB`。

- [ ] **Step 3: 手工验收**

从主站首页进入 `/refusal-generator/`，四环境验证刷新直达、返回首页、模式切换、30 字输入、可选字段删除后的标点、编辑复制、微信复制降级、usable 无分享、joke 分享、称呼默认剔除、返回流程和键盘操作。抽查全部启用组合的三候选，确认双人审核记录真实存在。

- [ ] **Step 4: 更新状态并提交**

```bash
git add sites/refusal-generator/src/index.css README.md
git commit -m "docs(refusal-generator): record document-mode readiness"
```

生产部署只能随 `@viral/home` 统一进行，并等待用户明确授权。
