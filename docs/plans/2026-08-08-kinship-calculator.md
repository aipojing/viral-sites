# 亲戚称呼计算器（17）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成春节移动端称谓速查：逐级点选关系链、普通话常用称呼与解释、歧义反查、热门速查、可选地域包和族谱式分享卡。

**Architecture:** `sites/kinship-calculator` 是主站内 `/kinship-calculator/` 玩法的源码与测试模块，由 `sites/home` 懒加载并统一构建。v1 不尝试用一组危险的代数化规则推导无限亲缘，而使用经过人工审核的规范化路径 corpus；查询层做精确匹配、必要条件过滤与多候选排序，无法覆盖时明确返回 unresolved。地域词库与普通话 corpus 分层，静态脚本把高频称谓解释页生成到主站的 `/kinship-calculator/relations/*` 产物。

**Tech Stack:** Vite 8 · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 · Canvas 2D · 构建期 Node 脚本 · `@viral/shared`

## Global Constraints

- 依据 `docs/17-kinship-calculator.md`；执行窗口为春节前 35 天，前 10 天未达到准确性 gate 则顺延一年。
- 遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；生产路径固定 `/kinship-calculator/`，不得新建独立 Pages/Worker 服务。
- v1 只覆盖三代以内血亲、常见姻亲和堂/表关系；极远房、重组、收养及未审核少数民族称谓不强给唯一答案。
- 普通话高频关系至少 200 条人工回归样例全过；任何地域包需要可靠资料和两位对应地区母语者审核。
- 路径只由枚举 token 组成，不收集姓名；埋点最多记录单步枚举、resolved/unresolved 和 region id。
- 结果必须支持多答案与置信状态 `exact | regional | insufficient`；反查统一写“可能是”。
- 无词库时显示“暂未覆盖”，禁止运行时调用模型猜称谓。
- 关系链 ≥6 级可显示“稳妥方案：先叫您好”彩蛋，但仍必须呈现真实候选或未覆盖状态。
- 视觉为新春年画国潮，不写生肖；颜色与关系连线/文字双编码。
- 节令三日窗口目标：查询成功率≥90%、结果中位时长<20 秒、卡片保存率≥10%、分享回流≥8%；unresolved 高频项优先补 corpus。

## File Map

```text
sites/kinship-calculator/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  test/setup.ts  test/canvas-stub.ts
  scripts/generate-relation-pages.ts
  src/main.tsx  src/index.css  src/app.tsx (+test)
  src/data/relation-types.ts
  src/data/mandarin-relations.ts
  src/data/popular-relations.ts
  src/data/region-packs.ts
  src/data/relations.lint.test.ts
  src/data/manual-cases.ts
  src/data/manual-cases.test.ts
  src/lib/path.ts (+test)
  src/lib/relation-lint.ts (+test)
  src/lib/resolve-relation.ts (+test)
  src/lib/reverse-lookup.ts (+test)
  src/lib/correction.ts (+test)
  src/components/relation-builder.tsx (+test)
  src/components/relation-result.tsx (+test)
  src/components/reverse-search.tsx (+test)
  src/components/popular-grid.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-relation-card.ts (+test)

sites/home/
  kinship-calculator/index.html
  public/previews/kinship-calculator.avif
  public/kinship-calculator/relations/*/index.html  # 构建期生成
  vite.config.ts
  src/projects.ts (+test)
  src/experience-loaders.ts (+test)
```

---

### Task 0: 建立可运行的站点测试骨架

**Files:**
- Create: `sites/kinship-calculator/package.json`
- Create: `sites/kinship-calculator/tsconfig.json`
- Create: `sites/kinship-calculator/vite.config.ts`
- Create: `sites/kinship-calculator/vitest.config.ts`
- Create: `sites/kinship-calculator/test/setup.ts`

- [ ] **Step 1: 创建 package 并安装依赖**

先写包名 `@viral/kinship-calculator` 和 `test/typecheck/build/dev` scripts，再执行：

```bash
pnpm --filter @viral/kinship-calculator add react@^19 react-dom@^19 '@viral/shared@workspace:*'
pnpm --filter @viral/kinship-calculator add -D typescript@^7 vite@^8 @vitejs/plugin-react tailwindcss@^4 @tailwindcss/vite@^4 vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/react @types/react-dom tsx
```

- [ ] **Step 2: 配置测试环境**

配置与 life-grid 对齐：严格 TypeScript、Vitest jsdom/globals、`./test/setup.ts`。`tsx` 只用于构建期执行静态解释页生成脚本，不进入浏览器 bundle。

- [ ] **Step 3: 验证并提交**

```bash
pnpm --filter @viral/kinship-calculator typecheck
git add sites/kinship-calculator/package.json sites/kinship-calculator/tsconfig.json sites/kinship-calculator/vite.config.ts sites/kinship-calculator/vitest.config.ts sites/kinship-calculator/test/setup.ts pnpm-lock.yaml
git commit -m "chore(kinship-calculator): add the testable package skeleton"
```

---

### Task 1: 路径、称谓与地域数据契约

**Files:**
- Create: `sites/kinship-calculator/src/data/relation-types.ts`
- Create: `sites/kinship-calculator/src/lib/path.ts`
- Create: `sites/kinship-calculator/src/lib/path.test.ts`

**Interfaces:**

```ts
export type RelationToken =
  | 'father' | 'mother' | 'husband' | 'wife'
  | 'older-brother' | 'younger-brother' | 'older-sister' | 'younger-sister'
  | 'son' | 'daughter'

export type SubjectGender = 'male' | 'female' | 'unspecified'
export type Confidence = 'exact' | 'regional' | 'insufficient'

export interface RelationEntry {
  id: string
  paths: readonly RelationToken[][]
  labels: readonly string[]
  explanation: string
  lineage: 'paternal' | 'maternal' | 'spousal' | 'mixed'
  generation: number
  subjectGender?: Exclude<SubjectGender, 'unspecified'>
  confidence: Exclude<Confidence, 'insufficient'>
  aliases: readonly string[]
  sourceIds: readonly string[]
}

export function pathKey(path: readonly RelationToken[], gender: SubjectGender): string
export function appendRelation(path: readonly RelationToken[], token: RelationToken): readonly RelationToken[]
export function removeLastRelation(path: readonly RelationToken[]): readonly RelationToken[]
```

- [ ] **Step 1: 写失败测试**

验证 pathKey 稳定、gender 入 key、不可变追加/撤销、最多 8 级、非法重复配偶和不可能链路由 validator 拒绝而不是静默简化。

- [ ] **Step 2: 实现路径工具**

`pathKey` 格式固定为 `${gender}:${path.join('>')}`；空路径不查称谓。append 超过 8 级抛 `RangeError`，不做诸如“父亲的儿子=自己/兄弟”的自动约简，因为年龄与性别条件不足时这种约简会制造错误。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/kinship-calculator test -- src/lib/path.test.ts
git add sites/kinship-calculator/src/data/relation-types.ts sites/kinship-calculator/src/lib/path*
git commit -m "feat(kinship-calculator): define relation paths"
```

---

### Task 2: 普通话 corpus、来源和构建期 lint

**Files:**
- Create: `sites/kinship-calculator/src/data/mandarin-relations.ts`
- Create: `sites/kinship-calculator/src/data/region-packs.ts`
- Create: `sites/kinship-calculator/src/lib/relation-lint.ts`
- Create: `sites/kinship-calculator/src/lib/relation-lint.test.ts`
- Create: `sites/kinship-calculator/src/data/relations.lint.test.ts`

**Interfaces:**

```ts
export interface RelationSource {
  id: string
  title: string
  publisher: string
  url: string
  reviewedAt: string
}

export interface RegionalLabel {
  relationId: string
  label: string
  region: string
  pronunciation?: string
  sourceIds: readonly string[]
  reviewerRoles: readonly [string, string]
}

export interface RegionPack { id: string; label: string; entries: readonly RegionalLabel[] }
export function lintRelationData(entries: readonly RelationEntry[], packs: readonly RegionPack[]): readonly string[]
```

- [ ] **Step 1: 写失败 lint 测试**

覆盖重复 id/path、空 label/explanation/source、相同路径相互矛盾的 exact 结果、地区名过宽、地域项缺双审核、粤语项缺读音、未知 relationId、过长路径和未覆盖枚举。

- [ ] **Step 2: 实现 lint 与来源表**

普通话 entry 可有多个正确 labels；同一 path 的多个 entry 只有在 confidence/regional/gender 条件可区分时允许。首版允许 `REGION_PACKS=[]`，此时 UI 明确“地域包暂未上线”，不得填猜测数据。

- [ ] **Step 3: 编写并审核普通话 corpus**

至少覆盖三代内直系、舅/姨/姑/叔伯、堂表兄弟姐妹、配偶关系、妯娌/连襟及热门春节查询。每个 entry 记录来源；结果解释说明辈分和父系/母系。完成后运行真实数据 lint。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/kinship-calculator test -- src/lib/relation-lint.test.ts src/data/relations.lint.test.ts
git add sites/kinship-calculator/src/data sites/kinship-calculator/src/lib/relation-lint*
git commit -m "feat(kinship-calculator): add reviewed Mandarin terms"
```

---

### Task 3: 精确查询、必要追问与未覆盖结果

**Files:**
- Create: `sites/kinship-calculator/src/lib/resolve-relation.ts`
- Create: `sites/kinship-calculator/src/lib/resolve-relation.test.ts`

**Interfaces:**

```ts
export interface RelationQuery {
  path: readonly RelationToken[]
  subjectGender: SubjectGender
  regionPackId?: string
}

export type RelationResolution =
  | { status: 'resolved'; confidence: Confidence; entries: readonly ResolvedRelation[] }
  | { status: 'needs-gender'; candidates: readonly RelationEntry[] }
  | { status: 'unresolved'; reason: 'empty' | 'not-covered' | 'too-distant' }

export function resolveRelation(query: RelationQuery, corpus?: readonly RelationEntry[]): RelationResolution
```

- [ ] **Step 1: 写失败测试**

用真实路径覆盖“妈妈→哥哥→女儿”、堂/表、姻亲、多答案、需询问用户性别、未知六级链、八级上限和 regional label 合并；不允许 fuzzy 命中错误路径。

- [ ] **Step 2: 实现精确索引**

模块加载时创建 `Map<pathKey, RelationEntry[]>`；先查指定 gender，再查 unspecified 兼容项。地域包只向已解析 relationId 增加 label，不改变亲缘关系本身。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/kinship-calculator test -- src/lib/resolve-relation.test.ts
git add sites/kinship-calculator/src/lib/resolve-relation*
git commit -m "feat(kinship-calculator): resolve reviewed relation paths"
```

---

### Task 4: 反向查询与热门速查

**Files:**
- Create: `sites/kinship-calculator/src/lib/reverse-lookup.ts`
- Create: `sites/kinship-calculator/src/lib/reverse-lookup.test.ts`
- Create: `sites/kinship-calculator/src/data/popular-relations.ts`
- Create: `sites/kinship-calculator/src/components/reverse-search.tsx`
- Create: `sites/kinship-calculator/src/components/reverse-search.test.tsx`
- Create: `sites/kinship-calculator/src/components/popular-grid.tsx`
- Create: `sites/kinship-calculator/src/components/popular-grid.test.tsx`

**Interfaces:**

```ts
export interface ReverseMatch { entry: RelationEntry; matchedLabel: string; rank: number }
export function reverseLookup(raw: string, regionPackId?: string): readonly ReverseMatch[]
```

- [ ] **Step 1: 写失败测试**

覆盖 trim/NFC、标准称呼、alias、地域词、多条可能关系、无结果、最多 20 code points、结果全部带“可能是”；热门项必须指向存在的 relationId。

- [ ] **Step 2: 实现可解释排序**

完全匹配标准 label rank 0，alias rank 1，选中地域 label rank 2；不做拼音模糊猜测。相同 rank 按路径短、entry id 排序。

- [ ] **Step 3: 实现反查和热门组件**

反查结果展示一到多条完整路径并标“可能是”；热门点击直接打开对应结果，记录 `reverse_used` 或 `query_started`，不上传原始输入。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/kinship-calculator test -- src/lib/reverse-lookup.test.ts src/components/reverse-search.test.tsx src/components/popular-grid.test.tsx
git add sites/kinship-calculator/src/lib/reverse-* sites/kinship-calculator/src/data/popular-relations.ts sites/kinship-calculator/src/components
git commit -m "feat(kinship-calculator): add reverse and popular lookup"
```

---

### Task 5: 200 条人工回归样例 gate

**Files:**
- Create: `sites/kinship-calculator/src/data/manual-cases.ts`
- Create: `sites/kinship-calculator/src/data/manual-cases.test.ts`

**Interfaces:**

```ts
export interface ManualRelationCase {
  id: string
  query: RelationQuery
  expectedLabels: readonly string[]
  reviewedBy: readonly [string, string]
  reviewedAt: string
}
```

- [ ] **Step 1: 写 gate 测试**

测试要求样例数 ≥200、id 唯一、两个审核人不同、日期有效、每个 expected label 实际出现在 resolution 中；至少 30 条母系、30 条父系、30 条姻亲、20 条堂表、20 条多答案/歧义。

- [ ] **Step 2: 组织人工家谱样例盲测**

样例由审核者根据关系链独立填写 expected，再与引擎结果比对；发现 corpus 错误时修改数据和来源，不在测试中放宽期待。样例不得包含真实姓名。

- [ ] **Step 3: 接入 build 门禁**

```json
"build": "tsc --noEmit && vitest run src/data/relations.lint.test.ts src/data/manual-cases.test.ts && tsx scripts/generate-relation-pages.ts && vite build"
```

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/kinship-calculator test -- src/data/manual-cases.test.ts
git add sites/kinship-calculator/src/data/manual-cases* sites/kinship-calculator/package.json
git commit -m "test(kinship-calculator): add reviewed relation corpus"
```

---

### Task 6: 页面入口与关系链主流程

**Files:**
- Modify: `sites/kinship-calculator/package.json`, `sites/kinship-calculator/vite.config.ts`
- Create: `sites/kinship-calculator/index.html`, `src/main.tsx`, `src/index.css`, `src/app.tsx`, `src/app.test.tsx`
- Copy: life-grid 的 `_worker.js`, `u.js`, `canvas-stub.ts`
- Create: `sites/kinship-calculator/src/components/relation-builder.tsx`
- Create: `sites/kinship-calculator/src/components/relation-builder.test.tsx`
- Create: `sites/kinship-calculator/src/components/relation-result.tsx`
- Create: `sites/kinship-calculator/src/components/relation-result.test.tsx`

**Interfaces:**

```ts
interface RelationBuilderProps {
  path: readonly RelationToken[]
  onAdd: (token: RelationToken) => void
  onUndo: () => void
  onClear: () => void
}
```

- [ ] **Step 1: 写失败流程测试并完成页面入口**

首页三入口；单手关系按钮；可撤销面包屑；仅 needs-gender 时追问；resolved 实时展示；unresolved 明确提示；≥6 级彩蛋不覆盖结果；结果显示普通话/地域/家庭差异和置信状态。

- [ ] **Step 2: 实现主流程**

App 只持 `path/gender/region/mode`；开始、完成和失败分别记录 `query_started/query_resolved/query_unresolved`，每加一步记录 `relation_step_added { relation: token }`；切换已审核地域包记录 `region_pack_used { region }`。不得把 `path.join()` 或反查原文作为埋点属性。

结果页列出 entry 的来源标题与可核验链接；用户点击时记录 `source_opened { source:sourceId }`。只有 resolved 时记录工厂标准 `generate { mode:'relation' }`。

- [ ] **Step 3: 实现可访问视觉**

关系按钮最小 44px；面包屑可横向换行而非滚动；剪纸红、洒金、墨色之外不新增主色；关系线同时有箭头与文字。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/kinship-calculator test
git add sites/kinship-calculator pnpm-lock.yaml
git commit -m "feat(kinship-calculator): build the relation lookup flow"
```

---

### Task 7: 可索引解释页与纠错入口

**Files:**
- Create: `sites/kinship-calculator/scripts/generate-relation-pages.ts`
- Create: `sites/kinship-calculator/src/lib/correction.ts`
- Create: `sites/kinship-calculator/src/lib/correction.test.ts`
- Modify: `sites/kinship-calculator/vite.config.ts`

- [ ] **Step 1: 写静态页生成测试**

对 popular relations 生成 `sites/home/public/kinship-calculator/relations/<entry.id>/index.html`；页面必须含唯一 title/description、标准称呼、关系解释、canonical 和回 `/kinship-calculator/` 链接，且 HTML 转义用户不可控数据。

- [ ] **Step 2: 实现生成脚本**

脚本只从已 lint 的 corpus 读数据；输出目录必须通过 `--out` 明确传入并校验 basename 为 `relations`，每次构建只清空 `sites/home/public/kinship-calculator/relations` 后重建，不触碰其他 public 文件。home 的 build 前置执行该命令，生成页不包含统计脚本以外的第三方资源。

- [ ] **Step 3: 实现纠错链接**

部署环境使用 `VITE_CORRECTION_URL` 指向人工审核表单；构建时变量缺失则只显示“复制纠错信息”，不会把用户反馈伪装成已提交。复制内容只含 relation id、候选 labels 和用户主动填写的说明；埋点仅 `correction_submitted { method:'form'|'copy' }`。

- [ ] **Step 4: 运行并提交**

```bash
pnpm --filter @viral/kinship-calculator build
git add sites/kinship-calculator/scripts sites/kinship-calculator/src/lib/correction* sites/kinship-calculator/vite.config.ts
git commit -m "feat(kinship-calculator): add indexable relation pages"
```

---

### Task 8: 族谱称呼卡

**Files:**
- Create: `sites/kinship-calculator/src/card/draw-relation-card.ts`
- Create: `sites/kinship-calculator/src/card/draw-relation-card.test.ts`
- Create: `sites/kinship-calculator/src/components/save-card-button.tsx`
- Create: `sites/kinship-calculator/src/components/save-card-button.test.tsx`
- Create: `sites/kinship-calculator/src/components/long-press-overlay.tsx`
- Modify: `sites/kinship-calculator/src/components/relation-result.tsx`

**Interfaces:**

```ts
interface RelationCardData {
  label: string
  pathLabels: readonly string[]
  regionalLabel?: string
  confidence: Confidence
}
export function makeRelationCardDraw(data: RelationCardData): DrawFn
```

- [ ] **Step 1: 写失败测试**

覆盖中心称呼大字、族谱路径、用户只选择一个地域称呼、长链换行、置信提示、品牌条；不允许姓名字段；unresolved 不生成误导卡片。

- [ ] **Step 2: 实现并保存**

用节点、箭头和文字三重呈现，不只靠红/金颜色。记录 `generate` 仅在 resolved 时，`save_image { card:'kinship' }` 保存意向。

- [ ] **Step 3: 运行并提交**

```bash
pnpm --filter @viral/kinship-calculator test
git add sites/kinship-calculator/src/card sites/kinship-calculator/src/components
git commit -m "feat(kinship-calculator): add relation share cards"
```

---

### Task 9: 主站接入与发布 gate

- [ ] **Step 1: 写失败测试并接入主站**

创建 `sites/home/kinship-calculator/index.html` 与预览图；在 home Vite MPA input、literal loader 和 projects registry 登记 `/kinship-calculator/`。测试必须断言首页 href 同源、loader key 一致，以及 home build 前置生成的解释页链接仍位于 `/kinship-calculator/relations/*`。

- [ ] **Step 2: 新鲜验证**

```bash
pnpm --filter @viral/shared test
pnpm --filter @viral/kinship-calculator test
pnpm --filter @viral/kinship-calculator typecheck
pnpm --filter @viral/home test
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
```

Expected：全部退出码 0；200 条 gate 和内容 lint 通过；`sites/home/dist/kinship-calculator/index.html` 与解释页存在；懒加载首屏 gzip `<100KB`。

- [ ] **Step 3: 人工验收**

四环境验证十秒内高频查询、撤销、gender 追问、反查多答案、热门速查、未覆盖、地域关闭、纠错、静态解释页和卡片保存。任何地域包由两位对应地区母语者逐条签核。

- [ ] **Step 4: 节令决策**

若距离春节不足 10 天仍有普通话 corpus 失败或人工样例未达 200 条，记录顺延一年并停止部署，不以删除失败样例换取通过。

- [ ] **Step 5: 更新状态并提交**

```bash
git add sites/kinship-calculator sites/home/kinship-calculator sites/home/public/kinship-calculator sites/home/public/previews/kinship-calculator.avif sites/home/vite.config.ts sites/home/src README.md
git commit -m "docs(kinship-calculator): record seasonal release gate"
```

浏览器必须从首页进入并验证刷新、返回首页、静态解释页回流、320px 与 reduced-motion。生产只随 `@viral/home` 统一发布并等待用户明确授权。
