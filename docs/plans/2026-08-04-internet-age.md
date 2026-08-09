# 站点 12 · 网感年龄测试 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **前置：[02 计划](2026-08-04-mental-state.md)已执行完成。** 本计划依赖其产物：`packages/shared/src/quiz/`（schema/scoring/测试）、`wrapByLength`、`sites/mental-state`（引擎升级后回归基线）。未完成 02 前禁止开工。

**Goal:** 把 `@viral/shared` 测试引擎升级到 v2（新增 `mode: 'tags'` 多维成分计分，向后兼容 linear），并完成站点「网感年龄测试」（`sites/internet-age`）到可部署状态——测出「精神网龄 + 互联网成分占比」。

**Architecture:** 引擎 v2 在 `packages/shared/src/quiz/` 内演进：`schema.ts` 拆成 linear/tags 两个配置 schema 的并集（`TestConfig = LinearTestConfig | TagsTestConfig`），`parseTestConfig` 按 `scoring.mode` 分派；`scoring.ts` 各线性函数加 `assertLinear` 运行时守卫（linear 之外抛错）；新增 `tags.ts`（聚合、占比归一、精神网龄、平手主成分决策）。**硬约束：02 的既有测试文件（`schema.test.ts`/`scoring.test.ts` 与 mental-state 全部测试）一字不改、原样通过**——v2 的新用例只进新文件。站点侧三屏 UI 复用 02 的交互骨架但按 Y2K 风格重写样式（站与站零依赖，UI 不进 shared，只有引擎进 shared）。题库五维 tag（贴吧遗老/QQ空间贵族/微博冲浪元老/抽象人/小红书新贵），每维绑一个年代锚点年龄；精神网龄 = 成分加权平均 + 由总分推出的**确定性**离散扰动（同成分不同分，且纯函数可测）。设计文档 §4 的「梗年代标注」落为 question 可选 `note` 字段（引擎透传不消费，题库 lint 强制非空）。

**Tech Stack:** pnpm workspace · Vite · React 19 · TypeScript(strict) · Tailwind v4 · zod（shared 已有）· Vitest + Testing Library(jsdom) · Cloudflare Pages（`_worker.js` 同源代理 umami）· umami

## Global Constraints

（工厂规则 + life-grid/mental-state 实施验证过的工程约定，所有任务默认遵守）

- 新站与 life-grid 同构：包名 `@viral/internet-age`，依赖 `'@viral/shared@workspace:*'`；站与站零依赖（禁止 import mental-state 的任何文件）
- `vitest.config.ts` 必须 `test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] }`（Testing Library 自动 cleanup 依赖 globals）
- devDeps 版本用已验证组合：`vitest@^3`、`@testing-library/jest-dom@^6`，其余照 life-grid 的版本族（React 19 / Vite 8 / Tailwind 4 / TS 7）
- `public/_worker.js` 与 `public/u.js` 从 `sites/life-grid/public/` 用 cp 复制；`index.html` 同款 umami 接入：自托管 `/u.js` + `data-website-id="TO_BE_FILLED"`（上线任务替换）+ `data-host-url="/"`；`favicon.svg` 按本站风格现写
- 埋点语义全厂统一：`visit`（umami pageview 自带）/ `generate` / `save_image`，沿用 02 的 `q_answered`（带题号 `q: 1~8`，算完测率）；埋点不带个人数据
- 分享卡片一律走 shared 的 `renderCard`/`saveCard`，1080×1440（3:4），底部品牌条
- 纯函数显式传参不取全局时间/全局状态；不可变数据（更新一律返回新副本）；精神网龄扰动必须由输入推导（禁 `Math.random`）
- 首屏 gzip < 100KB；不引入 UI 库/日期库/动画库/图表库（成分条形图用 div + 内联宽度实现，卡片上用 fillRect）
- 隐私/免责声明只放 App 页脚一处（避免测试 getByText 多重匹配）
- 视觉＝**Y2K · QQ 空间非主流**（[00a](../00a-style-map.md) 分配），完整色板（禁止套用 life-grid 作业本配色，与 09 站「金钱极繁」色向不重叠）：
  - 彩虹渐变（页面底/考卷头/卡片底）：`linear-gradient(160deg, #FF3E9D 0%, #FF9A3E 22%, #FFD500 45%, #00C48C 70%, #00AEEF 100%)`
  - 亮蓝 `#00AEEF`：主按钮 / 贴吧遗老成分条
  - 玫红 `#FF3E9D`：强调 / 考卷描边 / QQ空间贵族成分条
  - 明黄 `#FFD500`：微博冲浪元老成分条；紫 `#9B51E0`：抽象人成分条；青绿 `#00C48C`：小红书新贵成分条
  - 纸白 `#FFFFFF`（考卷底）、正文墨 `#333333`
  - 签名元素：彩虹渐变「考卷」+ 火星文点缀；火星文只做装饰（`aria-hidden`），正文严禁火星文（可读性底线）
- 成分条形图是卡片的视觉锤：页面与分享卡片都必须出现
- 动效只出现在签名时刻（换题 slide-in、成分条生长 bar-grow），尊重 `prefers-reduced-motion`
- 提交信息 conventional commits，不加 Co-Authored-By；测试命令统一 `pnpm --filter <pkg> test`

**文件全景**（Create/Modify 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
packages/shared/
  src/quiz/schema.ts              # Modify：升级为 linear|tags 并集（02 测试原样通过）
  src/quiz/scoring.ts             # Modify：线性函数加 assertLinear 守卫
  src/quiz/tags.ts (+test)        # 新增：tags 聚合/占比归一/精神网龄
  src/quiz/tags.fixtures.ts       # 新增：tags 合法配置工厂（v2 两个新测试文件复用）
  src/quiz/schema-tags.test.ts    # 新增：v2 schema 用例（不动 02 的 schema.test.ts）
  src/index.ts                    # Modify：追加 v2 导出
sites/internet-age/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  public/_worker.js  public/u.js  # cp 自 life-grid
  public/favicon.svg              # 新写（Y2K 彩虹考卷）
  test/setup.ts  test/canvas-stub.ts
  src/main.tsx  src/index.css
  src/app.tsx (+test)
  src/config/wang-gan.ts          # 网感题库（全部文案成品，含梗年代标注）
  src/config/registry.ts (+test)  # ?t=<slug> 路由预留 + 题库 lint
  src/components/landing-screen.tsx (+test)
  src/components/quiz-screen.tsx (+test)
  src/components/composition-bars.tsx (+test)
  src/components/report-screen.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-exam-card.ts (+test)
```

---

### Task 1: 引擎 v2 schema（tags 模式 + note 字段，02 测试原样通过）

**Files:**
- Modify: `packages/shared/src/quiz/schema.ts`（整文件替换）
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/quiz/tags.fixtures.ts`
- Test: `packages/shared/src/quiz/schema-tags.test.ts`（新文件；**禁止改动 `schema.test.ts` 与 `schema.fixtures.ts`**）

**Interfaces:**
- Produces:
  - `type LinearTestConfig`（= 02 的 TestConfig 形状 + question 可选 `note`）
  - `type TagsTestConfig` — questions 选项为 `{ text; tags: Record<string, number>(权重 > 0, 至少 1 个) }`；`scoring: { mode: 'tags'; dimensions: QuizDimension[](≥2, tag 唯一); ageJitterSpan: number(默认 5) }`
  - `type QuizDimension = { tag; title; anchorAge: 1~120 整数; barColor: #RRGGBB; comments: string[3] }`
  - `type TestConfig = LinearTestConfig | TagsTestConfig`（**类型收口点：02 站点代码只用 questions/meta 等公共字段，联合化后无需改动即可编译**）
  - `parseTestConfig(raw: unknown): TestConfig` — 按 `raw.scoring.mode`（缺省按 linear）分派对应 schema；报错前缀仍为 `测试配置不合法：`
  - tags 模式交叉校验：选项引用的 tag 必须在 dimensions 里注册；dimensions tag 不得重复
  - `QuizQuestion`/`QuizOption` 升级为两模式并集别名（02 站点未直接消费，无破坏）

- [ ] **Step 1: 写失败测试**

先写配置工厂 `packages/shared/src/quiz/tags.fixtures.ts`（独立于测试文件，schema-tags 与 tags 两个测试共用）：

```ts
export function makeRawTagsConfig() {
  const question = (n: number) => ({
    text: `第 ${n} 题`,
    note: '测试题·年代标注示例',
    options: [
      { text: '选 X', tags: { X: 2 } },
      { text: '选 Y', tags: { Y: 2 } },
      { text: '各半', tags: { X: 1, Y: 1 } },
    ],
  })
  return {
    meta: { slug: 'tags-demo', title: '成分演示', subtitle: '演示副标题' },
    questions: [1, 2, 3, 4, 5, 6, 7, 8].map(question),
    scoring: {
      mode: 'tags',
      dimensions: [
        { tag: 'X', title: 'X 系传人', anchorAge: 40, barColor: '#00AEEF', comments: ['x1', 'x2', 'x3'] },
        { tag: 'Y', title: 'Y 系新贵', anchorAge: 20, barColor: '#FF3E9D', comments: ['y1', 'y2', 'y3'] },
      ],
      ageJitterSpan: 5,
    },
  }
}
```

再写 `packages/shared/src/quiz/schema-tags.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { parseTestConfig } from './schema'
import { makeRawConfig } from './schema.fixtures'
import { makeRawTagsConfig } from './tags.fixtures'

describe('parseTestConfig v2 · tags 模式', () => {
  it('合法 tags 配置通过', () => {
    const config = parseTestConfig(makeRawTagsConfig())
    expect(config.scoring.mode).toBe('tags')
    if (config.scoring.mode === 'tags') {
      expect(config.scoring.dimensions).toHaveLength(2)
      expect(config.scoring.ageJitterSpan).toBe(5)
    }
  })

  it('ageJitterSpan 缺省为 5', () => {
    const base = makeRawTagsConfig()
    const { ageJitterSpan: _drop, ...scoring } = base.scoring
    const config = parseTestConfig({ ...base, scoring })
    if (config.scoring.mode === 'tags') expect(config.scoring.ageJitterSpan).toBe(5)
  })

  it('选项引用未注册 tag 拒绝', () => {
    const base = makeRawTagsConfig()
    const bad = {
      ...base.questions[0],
      options: [{ text: '幽灵', tags: { Z: 1 } }, ...base.questions[0].options.slice(1)],
    }
    const raw = { ...base, questions: [bad, ...base.questions.slice(1)] }
    expect(() => parseTestConfig(raw)).toThrow('未知 tag')
  })

  it('dimensions tag 重复拒绝', () => {
    const base = makeRawTagsConfig()
    const dims = [base.scoring.dimensions[0], { ...base.scoring.dimensions[1], tag: 'X' }]
    const raw = { ...base, scoring: { ...base.scoring, dimensions: dims } }
    expect(() => parseTestConfig(raw)).toThrow('tag 重复')
  })

  it('选项 tags 为空对象拒绝', () => {
    const base = makeRawTagsConfig()
    const bad = {
      ...base.questions[0],
      options: [{ text: '空的', tags: {} }, ...base.questions[0].options.slice(1)],
    }
    const raw = { ...base, questions: [bad, ...base.questions.slice(1)] }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('权重非正数拒绝', () => {
    const base = makeRawTagsConfig()
    const bad = {
      ...base.questions[0],
      options: [{ text: '负权', tags: { X: -1 } }, ...base.questions[0].options.slice(1)],
    }
    const raw = { ...base, questions: [bad, ...base.questions.slice(1)] }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('向后兼容：02 的 linear 原始配置照常通过，且可带可选 note', () => {
    const linear = parseTestConfig(makeRawConfig())
    expect(linear.scoring.mode).toBe('linear')
    const base = makeRawConfig()
    const withNote = {
      ...base,
      questions: [{ ...base.questions[0], note: '年代标注' }, ...base.questions.slice(1)],
    }
    expect(() => parseTestConfig(withNote)).not.toThrow()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: `schema-tags.test.ts` FAIL；`schema.test.ts`/`scoring.test.ts` 仍 PASS

- [ ] **Step 3: 实现** `packages/shared/src/quiz/schema.ts`（整文件替换）

```ts
import { z } from 'zod'

const metaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  subtitle: z.string().min(1),
})

// ---------- linear（02 起的 v1 形状 + 可选 note） ----------

export const quizOptionSchema = z.object({
  text: z.string().min(1),
  score: z.number().int().min(0),
})

export const quizQuestionSchema = z.object({
  text: z.string().min(1),
  note: z.string().optional(),
  options: z.array(quizOptionSchema).min(3).max(4),
})

export const quizTierSchema = z.object({
  minScore: z.number().int().min(0),
  title: z.string().min(1),
  percentRange: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  comments: z.array(z.string().min(1)).length(3),
  remedy: z.string().min(1),
})

export const linearTestConfigSchema = z
  .object({
    meta: metaSchema,
    questions: z.array(quizQuestionSchema).length(8),
    scoring: z.object({
      mode: z.literal('linear').default('linear'),
      tiers: z.array(quizTierSchema).length(5),
    }),
  })
  .superRefine((config, ctx) => {
    const tiers = config.scoring.tiers
    if (tiers[0].minScore !== 0) {
      ctx.addIssue({
        code: 'custom',
        message: '第一档 minScore 必须为 0',
        path: ['scoring', 'tiers', 0, 'minScore'],
      })
    }
    for (let i = 1; i < tiers.length; i += 1) {
      if (tiers[i].minScore <= tiers[i - 1].minScore) {
        ctx.addIssue({
          code: 'custom',
          message: '分档 minScore 必须严格递增',
          path: ['scoring', 'tiers', i, 'minScore'],
        })
      }
    }
  })

// ---------- tags（v2 新增：多维成分计分） ----------

export const tagsOptionSchema = z.object({
  text: z.string().min(1),
  tags: z
    .record(z.string().min(1), z.number().positive())
    .refine((tags) => Object.keys(tags).length > 0, { message: '每个选项至少带一个 tag' }),
})

export const tagsQuestionSchema = z.object({
  text: z.string().min(1),
  note: z.string().optional(),
  options: z.array(tagsOptionSchema).min(3).max(4),
})

export const quizDimensionSchema = z.object({
  tag: z.string().min(1),
  title: z.string().min(1),
  anchorAge: z.number().int().min(1).max(120),
  barColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  comments: z.array(z.string().min(1)).length(3),
})

export const tagsTestConfigSchema = z
  .object({
    meta: metaSchema,
    questions: z.array(tagsQuestionSchema).length(8),
    scoring: z.object({
      mode: z.literal('tags'),
      dimensions: z.array(quizDimensionSchema).min(2),
      ageJitterSpan: z.number().int().min(1).default(5),
    }),
  })
  .superRefine((config, ctx) => {
    const dims = config.scoring.dimensions
    const known = new Set(dims.map((d) => d.tag))
    if (known.size !== dims.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'dimensions tag 重复',
        path: ['scoring', 'dimensions'],
      })
    }
    config.questions.forEach((q, qi) => {
      q.options.forEach((o, oi) => {
        for (const tag of Object.keys(o.tags)) {
          if (!known.has(tag)) {
            ctx.addIssue({
              code: 'custom',
              message: `未知 tag「${tag}」（未在 dimensions 注册）`,
              path: ['questions', qi, 'options', oi, 'tags', tag],
            })
          }
        }
      })
    })
  })

// ---------- 并集与解析 ----------

export type LinearTestConfig = z.infer<typeof linearTestConfigSchema>
export type TagsTestConfig = z.infer<typeof tagsTestConfigSchema>
export type TestConfig = LinearTestConfig | TagsTestConfig
export type QuizQuestion = LinearTestConfig['questions'][number] | TagsTestConfig['questions'][number]
export type QuizOption = z.infer<typeof quizOptionSchema> | z.infer<typeof tagsOptionSchema>
export type QuizTier = z.infer<typeof quizTierSchema>
export type QuizDimension = z.infer<typeof quizDimensionSchema>

export function parseTestConfig(raw: unknown): TestConfig {
  const mode =
    typeof raw === 'object' && raw !== null
      ? ((raw as { scoring?: { mode?: unknown } }).scoring?.mode ?? 'linear')
      : 'linear'
  const schema = mode === 'tags' ? tagsTestConfigSchema : linearTestConfigSchema
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`测试配置不合法：${issues}`)
  }
  return parsed.data
}
```

`packages/shared/src/index.ts` 中原有的 quiz schema 导出块替换为：

```ts
export {
  parseTestConfig,
  type TestConfig,
  type LinearTestConfig,
  type TagsTestConfig,
  type QuizQuestion,
  type QuizOption,
  type QuizTier,
  type QuizDimension,
} from './quiz/schema'
```

- [ ] **Step 4: 跑测试确认通过（重点：02 基线零改动全绿）+ typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck && pnpm --filter @viral/mental-state test && pnpm --filter @viral/mental-state typecheck`
Expected: 全 PASS；`git diff --name-only` 确认 `schema.test.ts`、`scoring.test.ts` 与 `sites/mental-state/**` 均未被改动

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): quiz schema 升级 v2，新增 tags 多维模式（兼容 linear）"
```

---

### Task 2: 引擎 v2 tags 计分（聚合 / 占比归一 / 精神网龄 / 平手决策）

**Files:**
- Modify: `packages/shared/src/quiz/scoring.ts`（整文件替换：加 assertLinear 守卫，函数签名不变）
- Create: `packages/shared/src/quiz/tags.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/quiz/tags.test.ts`（新文件；**禁止改动 `scoring.test.ts`**）

**Interfaces:**
- Consumes: `TestConfig`/`TagsTestConfig`/`QuizDimension`（Task 1）、`assertAnswers`（02 计划 Task 2 导出）
- Produces:
  - `aggregateTags(config: TagsTestConfig, answers: readonly number[]): Record<string, number>` — 各 tag 原始权重和（所有注册 tag 都在结果里，未命中为 0）
  - `normalizeShares(raws: readonly number[]): number[]` — 归一为整数百分比且总和恰为 100（最大余数法，平手按下标序补），总和 ≤ 0 抛 Error
  - `mentalAgeOf(config: TagsTestConfig, raws: Record<string, number>): number` — `round(Σ anchorAge×raw / Σraw) + jitter`，`jitter = (Σraw % ageJitterSpan) - floor(ageJitterSpan / 2)`（确定性扰动：同成分不同总分 → 不同网龄）
  - `interface TagShare { tag: string; title: string; raw: number; percent: number; barColor: string }`
  - `interface TagsResult { raws: Record<string, number>; composition: TagShare[]（按 raw 降序，平手按 dimensions 顺序——稳定排序保证）; dominant: QuizDimension; mentalAge: number; comment: string（主成分 comments[mentalAge % 3]，确定性）}`
  - `computeTagsResult(config: TestConfig, answers: readonly number[]): TagsResult` — 非 tags 配置抛 `'computeTagsResult 仅支持 tags 模式配置'`
  - `computeResult` 等 5 个线性函数：非 linear 配置抛 `'线性计分函数仅支持 mode 为 linear 的配置'`（新增守卫用例进 tags.test.ts）

- [ ] **Step 1: 写失败测试** `packages/shared/src/quiz/tags.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { parseTestConfig } from './schema'
import { makeRawConfig } from './schema.fixtures'
import { makeRawTagsConfig } from './tags.fixtures'
import { computeResult } from './scoring'
import { aggregateTags, computeTagsResult, mentalAgeOf, normalizeShares } from './tags'

const tagsConfig = parseTestConfig(makeRawTagsConfig())
const linearConfig = parseTestConfig(makeRawConfig())
const ALL_X = [0, 0, 0, 0, 0, 0, 0, 0] // 每题选「选 X」：X+2
const ALL_HALF = [2, 2, 2, 2, 2, 2, 2, 2] // 每题选「各半」：X+1 Y+1

describe('normalizeShares', () => {
  it('整除场景直出', () => expect(normalizeShares([5, 5])).toEqual([50, 50]))
  it('最大余数法补齐 100：[1,1,1] → [34,33,33]', () =>
    expect(normalizeShares([1, 1, 1])).toEqual([34, 33, 33]))
  it('含 0 维度：[4,9,3,0,0] → [25,56,19,0,0]', () =>
    expect(normalizeShares([4, 9, 3, 0, 0])).toEqual([25, 56, 19, 0, 0]))
  it('单维直接 100', () => expect(normalizeShares([7])).toEqual([100]))
  it('总和为 0 抛错', () => expect(() => normalizeShares([0, 0])).toThrow('成分总分必须大于 0'))
})

describe('aggregateTags', () => {
  it('逐题累加权重，未命中 tag 记 0', () => {
    if (tagsConfig.scoring.mode !== 'tags') throw new Error('fixture 应为 tags 配置')
    expect(aggregateTags(tagsConfig, ALL_X)).toEqual({ X: 16, Y: 0 })
    expect(aggregateTags(tagsConfig, ALL_HALF)).toEqual({ X: 8, Y: 8 })
  })
  it('答案数量不对抛错（复用 assertAnswers）', () => {
    if (tagsConfig.scoring.mode !== 'tags') throw new Error('fixture 应为 tags 配置')
    expect(() => aggregateTags(tagsConfig, [0])).toThrow('答案数量不对')
  })
})

describe('mentalAgeOf', () => {
  it('锚点加权 + 确定性扰动：X:6 Y:3 → 33 + (9%5-2) = 35', () => {
    if (tagsConfig.scoring.mode !== 'tags') throw new Error('fixture 应为 tags 配置')
    expect(mentalAgeOf(tagsConfig, { X: 6, Y: 3 })).toBe(35)
  })
  it('总分为 0 抛错', () => {
    if (tagsConfig.scoring.mode !== 'tags') throw new Error('fixture 应为 tags 配置')
    expect(() => mentalAgeOf(tagsConfig, { X: 0, Y: 0 })).toThrow('成分总分必须大于 0')
  })
})

describe('computeTagsResult', () => {
  it('全选 X：成分 100/0，主成分 X，网龄 40+(16%5-2)=39，锐评确定性命中', () => {
    const result = computeTagsResult(tagsConfig, ALL_X)
    expect(result.composition.map((s) => [s.tag, s.percent])).toEqual([
      ['X', 100],
      ['Y', 0],
    ])
    expect(result.dominant.title).toBe('X 系传人')
    expect(result.mentalAge).toBe(39)
    expect(result.comment).toBe(result.dominant.comments[39 % 3])
  })

  it('平手主成分决策：raw 相同取 dimensions 先注册者', () => {
    const result = computeTagsResult(tagsConfig, ALL_HALF)
    expect(result.raws).toEqual({ X: 8, Y: 8 })
    expect(result.dominant.tag).toBe('X')
    expect(result.composition.map((s) => s.percent)).toEqual([50, 50])
    expect(result.mentalAge).toBe(29) // (40×8+20×8)/16=30，jitter=16%5-2=-1
  })

  it('确定性：同输入两次结果深等', () => {
    expect(computeTagsResult(tagsConfig, ALL_X)).toEqual(computeTagsResult(tagsConfig, ALL_X))
  })

  it('linear 配置进 tags 计分抛错', () =>
    expect(() => computeTagsResult(linearConfig, ALL_X)).toThrow(
      'computeTagsResult 仅支持 tags 模式配置',
    ))
})

describe('linear 守卫（v2 新增，不动 02 用例）', () => {
  it('tags 配置进线性计分抛错', () =>
    expect(() => computeResult(tagsConfig, ALL_X)).toThrow(
      '线性计分函数仅支持 mode 为 linear 的配置',
    ))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: `tags.test.ts` FAIL；02 基线仍 PASS

- [ ] **Step 3: 实现**

`packages/shared/src/quiz/scoring.ts`（整文件替换——只加守卫与联合类型适配，导出签名不变）：

```ts
import type { LinearTestConfig, QuizTier, TestConfig } from './schema'

export interface QuizResult {
  score: number
  tier: QuizTier
  percent: number
}

function assertLinear(config: TestConfig): asserts config is LinearTestConfig {
  if (config.scoring.mode !== 'linear') {
    throw new Error('线性计分函数仅支持 mode 为 linear 的配置')
  }
}

export function assertAnswers(config: TestConfig, answers: readonly number[]): void {
  if (answers.length !== config.questions.length) {
    throw new Error(`答案数量不对：应为 ${config.questions.length}，实际 ${answers.length}`)
  }
  answers.forEach((answer, i) => {
    const optionCount = config.questions[i].options.length
    if (!Number.isInteger(answer) || answer < 0 || answer >= optionCount) {
      throw new Error(`第 ${i + 1} 题答案越界：${answer}`)
    }
  })
}

export function totalScore(config: TestConfig, answers: readonly number[]): number {
  assertLinear(config)
  assertAnswers(config, answers)
  return answers.reduce((sum, answer, i) => sum + config.questions[i].options[answer].score, 0)
}

export function scoreBounds(config: TestConfig): { min: number; max: number } {
  assertLinear(config)
  return config.questions.reduce(
    (acc, q) => {
      const scores = q.options.map((o) => o.score)
      return { min: acc.min + Math.min(...scores), max: acc.max + Math.max(...scores) }
    },
    { min: 0, max: 0 },
  )
}

export function resolveTier(config: TestConfig, score: number): QuizTier {
  assertLinear(config)
  const tiers = config.scoring.tiers
  let matched = tiers[0]
  for (const tier of tiers) {
    if (score >= tier.minScore) matched = tier
  }
  return matched
}

export function percentInTier(config: TestConfig, score: number): number {
  assertLinear(config)
  const tiers = config.scoring.tiers
  const tier = resolveTier(config, score)
  const index = tiers.indexOf(tier)
  const tierMin = tier.minScore
  const tierMax = index + 1 < tiers.length ? tiers[index + 1].minScore - 1 : scoreBounds(config).max
  const [lo, hi] = tier.percentRange
  if (tierMax === tierMin) return Math.round(lo)
  const ratio = (score - tierMin) / (tierMax - tierMin)
  return Math.round(lo + ratio * (hi - lo))
}

export function computeResult(config: TestConfig, answers: readonly number[]): QuizResult {
  const score = totalScore(config, answers)
  const tier = resolveTier(config, score)
  return { score, tier, percent: percentInTier(config, score) }
}
```

`packages/shared/src/quiz/tags.ts`：

```ts
import type { QuizDimension, TagsTestConfig, TestConfig } from './schema'
import { assertAnswers } from './scoring'

export interface TagShare {
  tag: string
  title: string
  raw: number
  percent: number
  barColor: string
}

export interface TagsResult {
  raws: Record<string, number>
  composition: TagShare[]
  dominant: QuizDimension
  mentalAge: number
  comment: string
}

function assertTags(config: TestConfig): asserts config is TagsTestConfig {
  if (config.scoring.mode !== 'tags') {
    throw new Error('computeTagsResult 仅支持 tags 模式配置')
  }
}

export function aggregateTags(
  config: TagsTestConfig,
  answers: readonly number[],
): Record<string, number> {
  assertAnswers(config, answers)
  const zero: Record<string, number> = Object.fromEntries(
    config.scoring.dimensions.map((d) => [d.tag, 0]),
  )
  return answers.reduce((acc, answer, i) => {
    const optionTags = config.questions[i].options[answer].tags
    const next = { ...acc }
    for (const [tag, weight] of Object.entries(optionTags)) {
      next[tag] = (next[tag] ?? 0) + weight
    }
    return next
  }, zero)
}

export function normalizeShares(raws: readonly number[]): number[] {
  const total = raws.reduce((sum, raw) => sum + raw, 0)
  if (total <= 0) throw new Error('成分总分必须大于 0')
  const exact = raws.map((raw) => (raw / total) * 100)
  const floors = exact.map(Math.floor)
  const assigned = floors.reduce((sum, f) => sum + f, 0)
  // 最大余数法：小数部分大的先补 1，平手按下标序（确定性）
  const order = exact
    .map((value, i) => ({ i, frac: value - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  return order
    .slice(0, 100 - assigned)
    .reduce((acc, { i }) => acc.map((v, k) => (k === i ? v + 1 : v)), [...floors])
}

export function mentalAgeOf(config: TagsTestConfig, raws: Record<string, number>): number {
  const dims = config.scoring.dimensions
  const total = dims.reduce((sum, d) => sum + (raws[d.tag] ?? 0), 0)
  if (total <= 0) throw new Error('成分总分必须大于 0')
  const weighted = dims.reduce((sum, d) => sum + d.anchorAge * (raws[d.tag] ?? 0), 0) / total
  const span = config.scoring.ageJitterSpan
  const jitter = (total % span) - Math.floor(span / 2)
  return Math.round(weighted) + jitter
}

export function computeTagsResult(config: TestConfig, answers: readonly number[]): TagsResult {
  assertTags(config)
  const raws = aggregateTags(config, answers)
  const dims = config.scoring.dimensions
  const rawList = dims.map((d) => raws[d.tag] ?? 0)
  const percents = normalizeShares(rawList)
  // Array.prototype.sort 是稳定排序（ES2019+）：raw 平手时保持 dimensions 注册顺序
  const composition = dims
    .map((d, i) => ({ tag: d.tag, title: d.title, raw: rawList[i], percent: percents[i], barColor: d.barColor }))
    .sort((a, b) => b.raw - a.raw)
  const dominant = dims.find((d) => d.tag === composition[0].tag)!
  const mentalAge = mentalAgeOf(config, raws)
  return {
    raws,
    composition,
    dominant,
    mentalAge,
    comment: dominant.comments[mentalAge % dominant.comments.length],
  }
}
```

`packages/shared/src/index.ts` 追加：

```ts
export {
  aggregateTags,
  normalizeShares,
  mentalAgeOf,
  computeTagsResult,
  type TagShare,
  type TagsResult,
} from './quiz/tags'
```

- [ ] **Step 4: 跑测试确认通过 + 02 全量回归**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck && pnpm --filter @viral/mental-state test && pnpm --filter @viral/mental-state build`
Expected: 全 PASS；mental-state 构建成功（引擎升级不破坏 02 站点）

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): quiz tags 多维计分（成分占比+精神网龄+平手决策）"
```

---

### Task 3: internet-age 站点脚手架

**Files:**
- Create: `sites/internet-age/package.json`, `sites/internet-age/tsconfig.json`, `sites/internet-age/vite.config.ts`, `sites/internet-age/vitest.config.ts`, `sites/internet-age/index.html`, `sites/internet-age/public/favicon.svg`, `sites/internet-age/src/main.tsx`, `sites/internet-age/src/app.tsx`, `sites/internet-age/src/index.css`, `sites/internet-age/test/setup.ts`, `sites/internet-age/test/canvas-stub.ts`
- Copy: `sites/life-grid/public/_worker.js`、`sites/life-grid/public/u.js` → `sites/internet-age/public/`

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）
- Produces: 可 build 的 Vite React 站点；`installCanvasStub(): RecordingCtx`（含 `createLinearGradient` 桩，供彩虹渐变卡片测试）

- [ ] **Step 1: 建包与依赖**

`sites/internet-age/package.json`：

```json
{
  "name": "@viral/internet-age",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Run:

```bash
pnpm --filter @viral/internet-age add react react-dom
pnpm --filter @viral/internet-age add -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom@^6 @types/react @types/react-dom
pnpm --filter @viral/internet-age add '@viral/shared@workspace:*'
```

- [ ] **Step 2: 复制 umami 基建（不改内容）**

```bash
mkdir -p sites/internet-age/public
cp sites/life-grid/public/_worker.js sites/life-grid/public/u.js sites/internet-age/public/
```

- [ ] **Step 3: 配置文件**

`sites/internet-age/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client", "@testing-library/jest-dom"] },
  "include": ["src", "test"]
}
```

`sites/internet-age/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/internet-age/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
})
```

`sites/internet-age/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

`sites/internet-age/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#FF3E9D" />
    <title>网感年龄测试 — 测测你的互联网精神年龄</title>
    <meta
      name="description"
      content="8 道梗题，测出你的精神网龄和互联网成分：几成贴吧遗老、几成 QQ 空间贵族、几成小红书新贵。所有计算在本地完成。"
    />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- umami 自托管脚本 + 同源上报（data-host-url="/" → POST /api/send，由 _worker.js 代理转发）。
         TO_BE_FILLED 在 Task 12 上线步骤替换为真实 website-id -->
    <script defer src="/u.js" data-website-id="TO_BE_FILLED" data-host-url="/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`sites/internet-age/public/favicon.svg`（Y2K：彩虹渐变底 + 白考卷 + 对勾）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="r" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF3E9D"/>
      <stop offset="0.5" stop-color="#FFD500"/>
      <stop offset="1" stop-color="#00AEEF"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="8" fill="url(#r)"/>
  <rect x="14" y="10" width="36" height="44" rx="4" fill="#FFFFFF"/>
  <path d="M20 21h24M20 29h24M20 37h14" stroke="#00AEEF" stroke-width="3" stroke-linecap="round"/>
  <path d="M38 39l5 7 9-13" stroke="#FF3E9D" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>
```

`sites/internet-age/src/index.css`（Y2K · QQ 空间非主流基础样式，全站唯一 CSS）：

```css
@import 'tailwindcss';

:root {
  color-scheme: light;
}

body {
  background: linear-gradient(160deg, #ff3e9d 0%, #ff9a3e 22%, #ffd500 45%, #00c48c 70%, #00aeef 100%)
    fixed;
  color: #333333;
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

/* 考卷纸：白底圆角 + 玫红描边 —— 彩虹底上的「非主流试卷」 */
.exam-paper {
  background: #ffffff;
  border: 3px solid #ff3e9d;
  border-radius: 14px;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.18);
}

/* 渐变描字：只用于大标题/大数字 */
.rainbow-text {
  background: linear-gradient(90deg, #ff3e9d, #ff9a3e, #ffd500, #00c48c, #00aeef);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Y2K 水晶按钮 */
.y2k-btn {
  background: linear-gradient(180deg, #33c5ff 0%, #00aeef 55%, #008bc7 100%);
  border: 3px solid #ffffff;
  border-radius: 999px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
  color: #ffffff;
  font-weight: 800;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
  transition:
    transform 0.05s ease-out,
    box-shadow 0.05s ease-out;
}
.y2k-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}

/* 火星文点缀：纯装饰，必须配 aria-hidden，正文禁用 */
.mars-text {
  opacity: 0.85;
  letter-spacing: 2px;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.slide-in {
  animation: slide-in 0.22s ease-out both;
}

@keyframes bar-grow {
  from {
    width: 0;
  }
}
.bar-grow {
  animation: bar-grow 0.6s ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .slide-in,
  .bar-grow {
    animation: none;
  }
  .y2k-btn {
    transition: none;
  }
}
```

`sites/internet-age/src/main.tsx`：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`sites/internet-age/src/app.tsx`（占位，Task 11 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-5 py-8">网感年龄测试</main>
}
```

`sites/internet-age/test/canvas-stub.ts`（含渐变桩）：

```ts
import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  strokeRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  createLinearGradient: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  translate: ReturnType<typeof vi.fn>
  rotate: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
  fillStyle: unknown
  strokeStyle: string
  lineWidth: number
  globalAlpha: number
  font: string
  textAlign: string
}

export function installCanvasStub(): RecordingCtx {
  const ctx: RecordingCtx = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}
```

- [ ] **Step 4: 验证构建**

Run: `pnpm --filter @viral/internet-age build`
Expected: 构建成功，`sites/internet-age/dist/` 内含 `_worker.js`、`u.js`、`favicon.svg`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(internet-age): 站点脚手架与 Y2K 非主流基础样式"
```

---

### Task 4: 网感题库（全部文案成品，含梗年代标注）+ 路由预留 + 题库 lint

**Files:**
- Create: `sites/internet-age/src/config/wang-gan.ts`, `sites/internet-age/src/config/registry.ts`
- Test: `sites/internet-age/src/config/registry.test.ts`

**Interfaces:**
- Consumes: `parseTestConfig`/`computeTagsResult`（shared v2）
- Produces:
  - `wangGanConfig: TestConfig`（tags 模式）— 模块加载即校验
  - `DEFAULT_SLUG = 'wang-gan'`；`resolveConfig(search: string): TestConfig`
- 题库规则：8 题 × 4 选项；五维 tag 固定 `贴吧遗老/QQ空间贵族/微博冲浪元老/抽象人/小红书新贵`，锚点年龄 `40/35/30/24/19`，条形色按 Global Constraints 色板；每题带 `note` 梗年代标注（时效校准制度的数据基础）；每维在全题库的可得权重 ≥ 8（保证每维都有被测出来的空间）
- 文案即产品：以下题库文字是**成品**，执行时逐字照抄，不得改写

- [ ] **Step 1: 写失败测试** `sites/internet-age/src/config/registry.test.ts`

```ts
import { computeTagsResult } from '@viral/shared'
import { describe, expect, it } from 'vitest'
import { wangGanConfig } from './wang-gan'
import { DEFAULT_SLUG, resolveConfig } from './registry'

const TAGS = ['贴吧遗老', 'QQ空间贵族', '微博冲浪元老', '抽象人', '小红书新贵']

describe('wangGanConfig · 题库 lint', () => {
  it('tags 模式，8 题 4 选项，五维齐全', () => {
    expect(wangGanConfig.meta.slug).toBe('wang-gan')
    expect(wangGanConfig.scoring.mode).toBe('tags')
    expect(wangGanConfig.questions).toHaveLength(8)
    wangGanConfig.questions.forEach((q) => expect(q.options).toHaveLength(4))
    if (wangGanConfig.scoring.mode === 'tags') {
      expect(wangGanConfig.scoring.dimensions.map((d) => d.tag)).toEqual(TAGS)
    }
  })

  it('锚点年龄 40/35/30/24/19，互不重复', () => {
    if (wangGanConfig.scoring.mode !== 'tags') throw new Error('应为 tags 配置')
    expect(wangGanConfig.scoring.dimensions.map((d) => d.anchorAge)).toEqual([40, 35, 30, 24, 19])
  })

  it('时效校准制度：每题都有非空梗年代标注 note', () => {
    wangGanConfig.questions.forEach((q) => {
      expect(q.note).toBeTruthy()
      expect((q.note ?? '').length).toBeGreaterThan(4)
    })
  })

  it('每维全题库可得权重 ≥ 8', () => {
    if (wangGanConfig.scoring.mode !== 'tags') throw new Error('应为 tags 配置')
    const totals = Object.fromEntries(TAGS.map((t) => [t, 0]))
    for (const q of wangGanConfig.questions) {
      for (const o of q.options) {
        for (const [tag, w] of Object.entries(o.tags)) totals[tag] += w
      }
    }
    for (const tag of TAGS) expect(totals[tag]).toBeGreaterThanOrEqual(8)
  })

  it('对齐设计文档口径：全选首项 → 主成分 QQ空间贵族，精神网龄 34', () => {
    const result = computeTagsResult(wangGanConfig, [0, 0, 0, 0, 0, 0, 0, 0])
    expect(result.dominant.title).toBe('QQ空间贵族')
    expect(result.mentalAge).toBe(34)
    expect(result.composition.map((s) => [s.tag, s.percent])).toEqual([
      ['QQ空间贵族', 56],
      ['贴吧遗老', 25],
      ['微博冲浪元老', 19],
      ['抽象人', 0],
      ['小红书新贵', 0],
    ])
  })
})

describe('resolveConfig', () => {
  it('无参数回落默认题库', () => expect(resolveConfig('').meta.slug).toBe(DEFAULT_SLUG))
  it('?t=wang-gan 命中', () => expect(resolveConfig('?t=wang-gan').meta.slug).toBe('wang-gan'))
  it('未知 slug 回落默认（不白屏）', () =>
    expect(resolveConfig('?t=not-exist').meta.slug).toBe(DEFAULT_SLUG))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/internet-age test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/internet-age/src/config/wang-gan.ts`

```ts
import { parseTestConfig } from '@viral/shared'

// 网感年龄题库 v1 —— 文案是产品本体；note 是梗年代标注（时效校准制度），上线前双人审、每季度复审
export const wangGanConfig = parseTestConfig({
  meta: {
    slug: 'wang-gan',
    title: '网感年龄测试',
    subtitle: '测测你的互联网精神年龄',
  },
  questions: [
    {
      text: '以下哪个是你最先学会的告别方式？',
      note: '88：QQ 聊天时代（00 年代初）；拜拜了您嘞：贴吧老梗；溜了溜了：2017 前后弹幕；润了：2021 抽象圈起流行',
      options: [
        { text: '88，下了', tags: { QQ空间贵族: 2 } },
        { text: '拜拜了您嘞', tags: { 贴吧遗老: 2 } },
        { text: '溜了溜了', tags: { 微博冲浪元老: 2 } },
        { text: '润了润了', tags: { 抽象人: 2 } },
      ],
    },
    {
      text: '看到「蓝瘦香菇」，你的第一反应是？',
      note: '蓝瘦香菇：2016 微博爆梗（南宁小哥失恋视频）',
      options: [
        { text: '能完整背出原视频台词：蓝瘦，香菇，本来今天高高兴兴', tags: { 微博冲浪元老: 2 } },
        { text: '这是什么？某种菌菇料理吗', tags: { 小红书新贵: 2 } },
        { text: '梗太老了，建议火化', tags: { 抽象人: 2 } },
        { text: '当年我还拿它做过 QQ 签名', tags: { QQ空间贵族: 2 } },
      ],
    },
    {
      text: '「家人们」这个词，你一般用在哪？',
      note: '家人们：2020 后直播间/小红书语系；吧友们、老哥们：贴吧原生称呼',
      options: [
        { text: '不用。跟一群陌生人互称家人，怪怪的', tags: { 微博冲浪元老: 1, QQ空间贵族: 1 } },
        { text: '直播间抢东西：家人们把价格打在公屏上', tags: { 小红书新贵: 2 } },
        { text: '「家人们谁懂啊」开头，后面跟一篇小作文', tags: { 小红书新贵: 1, 抽象人: 1 } },
        { text: '我只说「吧友们」「老哥们」', tags: { 贴吧遗老: 2 } },
      ],
    },
    {
      text: '你的青春期网名，长什么样？',
      note: '火星文符号网名：2008 前后 QQ 空间；momo 匿名马甲：2022 小红书起流行',
      options: [
        { text: 'ヾ爱情断了线°丶 这种，符号比字多', tags: { QQ空间贵族: 2 } },
        { text: '真名拼音缩写加数字，在某个吧潜水十年', tags: { 贴吧遗老: 2 } },
        { text: '带横杠带英文，比如 Vivian-颖', tags: { 微博冲浪元老: 2 } },
        { text: 'momo，粉色恐龙头像，你根本找不到我', tags: { 小红书新贵: 2 } },
      ],
    },
    {
      text: '网上遇到杠精，你的战斗方式是？',
      note: '盖楼对线：贴吧时代；典孝急：2021 抽象话；拉黑禁评：微博常规操作；求安慰笔记：小红书语系',
      options: [
        { text: '引经据典盖高楼，一层一层跟他对线到天亮', tags: { 贴吧遗老: 2 } },
        { text: '「典」「孝」「急」，一个字都不多打', tags: { 抽象人: 2 } },
        { text: '拉黑禁评一气呵成，我的地盘我做主', tags: { 微博冲浪元老: 2 } },
        { text: '委屈半天，发一篇「被网暴了求抱抱」笔记', tags: { 小红书新贵: 2 } },
      ],
    },
    {
      text: '「絕蝂↘傷憾」这行字，你的解码速度？',
      note: '火星文签名：2006-2010 QQ 空间非主流鼎盛期',
      options: [
        { text: '秒读。当年我的空间签名比这还花', tags: { QQ空间贵族: 2 } },
        { text: '看得懂，但手指已经打不出来了', tags: { QQ空间贵族: 1, 微博冲浪元老: 1 } },
        { text: '这是乱码吗？浏览器编码坏了？', tags: { 小红书新贵: 2 } },
        { text: '建议申遗，供后人瞻仰', tags: { 抽象人: 2 } },
      ],
    },
    {
      text: '你手机表情包的主力军是？',
      note: '滑稽：贴吧 2015 前后；兔斯基/悠嘻猴：2007 QQ 斗图期；熊猫头：2016 后抽象表情包；追新表情：小红书/短视频语系',
      options: [
        { text: '滑稽😏，它陪我走过千山万水', tags: { 贴吧遗老: 2 } },
        { text: '熊猫头，配字越离谱越好', tags: { 抽象人: 2 } },
        { text: '兔斯基、悠嘻猴，QQ 斗图时代的老兵', tags: { QQ空间贵族: 2 } },
        { text: '现存现用：谁最近火就存谁', tags: { 小红书新贵: 2 } },
      ],
    },
    {
      text: '深夜 emo 的时候，你会发什么？',
      note: '仅自己可见说说：QQ 空间；小号长文秒删：微博；抽象话压情绪：2020 后；「被生活温柔治愈」体：小红书',
      options: [
        { text: '一条仅自己可见的伤感说说，配黑白头像', tags: { QQ空间贵族: 2 } },
        { text: '小号发长文，发完 30 秒内删掉', tags: { 微博冲浪元老: 2 } },
        { text: '「乐」「绷不住了」，用抽象话把眼泪压回去', tags: { 抽象人: 2 } },
        { text: '一篇「今天也是被生活温柔治愈的一天」图文', tags: { 小红书新贵: 2 } },
      ],
    },
  ],
  scoring: {
    mode: 'tags',
    ageJitterSpan: 5,
    dimensions: [
      {
        tag: '贴吧遗老',
        title: '贴吧遗老',
        anchorAge: 40,
        barColor: '#00AEEF',
        comments: [
          '你的精神户口还在百度贴吧，虽然吧主已经十年没上线了',
          '层主、沙发、盖楼——你说的黑话，00 后要带翻译器才能听懂',
          '你不是网民，你是互联网活化石，建议申报文化遗产',
        ],
      },
      {
        tag: 'QQ空间贵族',
        title: 'QQ空间贵族',
        anchorAge: 35,
        barColor: '#FF3E9D',
        comments: [
          '你的忧伤永远停在那条火星文签名里，转发这条说说会有好运',
          '踩空间、抢车位、偷菜——你的社交礼仪毕业于 QQ 农场',
          '黄钻贵族的余晖还在你身上闪烁，虽然 QQ 密码已经忘了',
        ],
      },
      {
        tag: '微博冲浪元老',
        title: '微博冲浪元老',
        anchorAge: 30,
        barColor: '#FFD500',
        comments: [
          '十年热搜看下来，你已经修炼出「让子弹飞一会儿」的定力',
          '你见过转发抽奖的黄金年代，也见过大型塌房现场',
          '吃瓜一流，考古一流，就是自己的生活忘了经营',
        ],
      },
      {
        tag: '抽象人',
        title: '抽象人',
        anchorAge: 24,
        barColor: '#9B51E0',
        comments: [
          '你的喜怒哀乐已全部压缩成一个字：乐',
          '别人聊天要打字，你聊天只需要：典、绷、孝、急、蚌',
          '你不是在说话，你是在发电——抽象话浓度已超标',
        ],
      },
      {
        tag: '小红书新贵',
        title: '小红书新贵',
        anchorAge: 19,
        barColor: '#00C48C',
        comments: [
          '万物皆可「绝绝子」，你的字典里没有平凡两个字',
          '你的互联网记忆从 momo 开始，再早的梗请自行考古',
          '听劝体、探店体、避雷体——你说话自带笔记排版',
        ],
      },
    ],
  },
})
```

`sites/internet-age/src/config/registry.ts`：

```ts
import type { TestConfig } from '@viral/shared'
import { wangGanConfig } from './wang-gan'

// 同站多测试预留：换皮 = 新增一份配置 + 注册一行（验证期不换域名）
const REGISTRY: Record<string, TestConfig> = {
  [wangGanConfig.meta.slug]: wangGanConfig,
}

export const DEFAULT_SLUG = 'wang-gan'

export function resolveConfig(search: string): TestConfig {
  const slug = new URLSearchParams(search).get('t')
  return (slug && REGISTRY[slug]) || REGISTRY[DEFAULT_SLUG]
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/internet-age test && pnpm --filter @viral/internet-age typecheck`
Expected: 全 PASS（含「全选首项 → QQ空间贵族 34 岁」的口径测试——与设计文档 §1 示例同量级）

- [ ] **Step 5: 「值得截图」+ 时效自审（质量门禁，不可跳过）**

通读题库确认：至少 3 题（基准：Q4 网名、Q6 火星文、Q8 深夜 emo）单独截图发群里也好笑；逐条核对 note 年代标注无明显翻车（正式双人审在 Task 12 手工步骤）。若执行者判断不达标，停下来向用户报告而不是自行改文案。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(internet-age): 网感题库全量文案与梗年代标注"
```

---

### Task 5: 落地屏 LandingScreen

**Files:**
- Create: `sites/internet-age/src/components/landing-screen.tsx`
- Test: `sites/internet-age/src/components/landing-screen.test.tsx`

**Interfaces:**
- Consumes: `TestConfig`（shared）
- Produces: `<LandingScreen config={TestConfig} onStart={() => void} />` — 考卷式落地页 + 挑衅文案 + 火星文点缀（`aria-hidden`）+ 「开始答卷」按钮

- [ ] **Step 1: 写失败测试** `sites/internet-age/src/components/landing-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { wangGanConfig } from '../config/wang-gan'
import { LandingScreen } from './landing-screen'

describe('LandingScreen', () => {
  it('渲染考卷抬头与挑衅文案', () => {
    render(<LandingScreen config={wangGanConfig} onStart={() => {}} />)
    expect(screen.getByRole('heading', { name: '网感年龄测试' })).toBeInTheDocument()
    expect(screen.getByText('互联网网感统一测试卷')).toBeInTheDocument()
    expect(screen.getByText(/你的精神网龄，可能比身份证大 20 岁/)).toBeInTheDocument()
  })

  it('火星文点缀存在且对读屏隐藏', () => {
    const { container } = render(<LandingScreen config={wangGanConfig} onStart={() => {}} />)
    const mars = container.querySelector('.mars-text')
    expect(mars).not.toBeNull()
    expect(mars).toHaveAttribute('aria-hidden', 'true')
  })

  it('点击开始触发 onStart', async () => {
    const onStart = vi.fn()
    render(<LandingScreen config={wangGanConfig} onStart={onStart} />)
    await userEvent.click(screen.getByRole('button', { name: '开始答卷' }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/internet-age test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/internet-age/src/components/landing-screen.tsx`

```tsx
import type { TestConfig } from '@viral/shared'

interface Props {
  config: TestConfig
  onStart: () => void
}

export function LandingScreen({ config, onStart }: Props) {
  return (
    <section className="slide-in flex flex-col gap-6">
      <div className="exam-paper p-6">
        <p className="text-center text-xs font-bold tracking-[0.3em] text-[#FF3E9D]">
          互联网网感统一测试卷
        </p>
        <h1 className="rainbow-text mt-3 text-center text-4xl font-black leading-tight">
          {config.meta.title}
        </h1>
        <p className="mt-2 text-center text-base font-bold">{config.meta.subtitle}</p>
        <p className="mars-text mt-3 text-center text-xs" aria-hidden="true">
          ↘莂问硪湜谁↙请到硪的空间踩一踩
        </p>
      </div>
      <div className="exam-paper p-5 text-sm leading-relaxed">
        <p>你的精神网龄，可能比身份证大 20 岁。</p>
        <p className="mt-2">
          8 道梗题 · 60 秒 · 出具成分报告：几成贴吧遗老、几成 QQ 空间贵族、几成小红书新贵。
        </p>
        <p className="mt-2 text-xs text-[#888888]">（满分 100 · 不设及格线 · 禁止代考）</p>
      </div>
      <button type="button" onClick={onStart} className="y2k-btn py-4 text-lg">
        开始答卷
      </button>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/internet-age test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(internet-age): 考卷式落地屏与火星文点缀"
```

---

### Task 6: 答题屏 QuizScreen（考卷风，一屏一题）

**Files:**
- Create: `sites/internet-age/src/components/quiz-screen.tsx`
- Test: `sites/internet-age/src/components/quiz-screen.test.tsx`

**Interfaces:**
- Consumes: `TestConfig`（shared）、`wangGanConfig`（Task 4，测试用）
- Produces: `<QuizScreen config={TestConfig} onAnswer={(questionIndex: number) => void} onFinish={(answers: number[]) => void} />` — 交互契约与 02 完全一致（点选即跳、无返回、每题回调、最后一题回传完整答案），样式为考卷风（彩虹进度条 + 「第 X 题 / 共 8 题」）；UI 代码站内自持，不从 mental-state import

- [ ] **Step 1: 写失败测试** `sites/internet-age/src/components/quiz-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { wangGanConfig } from '../config/wang-gan'
import { QuizScreen } from './quiz-screen'

describe('QuizScreen', () => {
  it('初始渲染第一题与进度「第 1 题 / 共 8 题」', () => {
    render(<QuizScreen config={wangGanConfig} onAnswer={() => {}} onFinish={() => {}} />)
    expect(screen.getByText(wangGanConfig.questions[0].text)).toBeInTheDocument()
    expect(screen.getByText('第 1 题 / 共 8 题')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('点选即跳下一题，onAnswer 带题目下标', async () => {
    const onAnswer = vi.fn()
    render(<QuizScreen config={wangGanConfig} onAnswer={onAnswer} onFinish={() => {}} />)
    await userEvent.click(
      screen.getByRole('button', { name: wangGanConfig.questions[0].options[3].text }),
    )
    expect(onAnswer).toHaveBeenCalledWith(0)
    expect(screen.getByText(wangGanConfig.questions[1].text)).toBeInTheDocument()
    expect(screen.getByText('第 2 题 / 共 8 题')).toBeInTheDocument()
  })

  it('答完 8 题触发 onFinish 且答案按序收集', async () => {
    const onFinish = vi.fn()
    render(<QuizScreen config={wangGanConfig} onAnswer={() => {}} onFinish={onFinish} />)
    const picks = [0, 3, 1, 2, 0, 3, 1, 2]
    for (const pick of picks) {
      await userEvent.click(screen.getAllByRole('button')[pick])
    }
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledWith(picks)
  })

  it('答到最后一题前不触发 onFinish', async () => {
    const onFinish = vi.fn()
    render(<QuizScreen config={wangGanConfig} onAnswer={() => {}} onFinish={onFinish} />)
    for (let i = 0; i < 7; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    expect(onFinish).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/internet-age test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/internet-age/src/components/quiz-screen.tsx`

```tsx
import { useState } from 'react'
import type { TestConfig } from '@viral/shared'

interface Props {
  config: TestConfig
  onAnswer: (questionIndex: number) => void
  onFinish: (answers: number[]) => void
}

export function QuizScreen({ config, onAnswer, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<readonly number[]>([])
  const questions = config.questions
  const question = questions[index]

  const handlePick = (optionIndex: number) => {
    const next = [...answers, optionIndex]
    onAnswer(index)
    if (next.length === questions.length) {
      onFinish([...next])
    } else {
      setAnswers(next)
      setIndex(index + 1)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="h-3 overflow-hidden rounded-full border-2 border-white bg-white/40" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#FF3E9D,#FFD500,#00AEEF)]"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>
      <p className="text-center text-xs font-bold text-white [text-shadow:0_1px_0_rgba(0,0,0,0.35)]">
        第 {index + 1} 题 / 共 {questions.length} 题
      </p>
      <div key={index} className="slide-in flex flex-col gap-4">
        <h2 className="exam-paper p-5 text-xl font-black leading-snug">{question.text}</h2>
        <ul className="flex flex-col gap-3">
          {question.options.map((option, i) => (
            <li key={option.text}>
              <button
                type="button"
                onClick={() => handlePick(i)}
                className="exam-paper w-full px-4 py-3 text-left text-base leading-snug font-medium"
              >
                {option.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/internet-age test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(internet-age): 考卷答题屏与彩虹进度条"
```

---

### Task 7: 成分条形图 CompositionBars（视觉锤）

**Files:**
- Create: `sites/internet-age/src/components/composition-bars.tsx`
- Test: `sites/internet-age/src/components/composition-bars.test.tsx`

**Interfaces:**
- Consumes: `TagShare`（shared v2）
- Produces: `<CompositionBars composition={TagShare[]} />` — 每维一行：称号 + 横向占比条（宽 = percent%，色 = barColor，bar-grow 生长动效）+ 百分比数字；行序按传入顺序（computeTagsResult 已按占比降序）；纯 div 实现，不引图表库

- [ ] **Step 1: 写失败测试** `sites/internet-age/src/components/composition-bars.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TagShare } from '@viral/shared'
import { CompositionBars } from './composition-bars'

const composition: TagShare[] = [
  { tag: 'QQ空间贵族', title: 'QQ空间贵族', raw: 9, percent: 56, barColor: '#FF3E9D' },
  { tag: '贴吧遗老', title: '贴吧遗老', raw: 4, percent: 25, barColor: '#00AEEF' },
  { tag: '微博冲浪元老', title: '微博冲浪元老', raw: 3, percent: 19, barColor: '#FFD500' },
  { tag: '抽象人', title: '抽象人', raw: 0, percent: 0, barColor: '#9B51E0' },
  { tag: '小红书新贵', title: '小红书新贵', raw: 0, percent: 0, barColor: '#00C48C' },
]

describe('CompositionBars', () => {
  it('每维一行，称号与百分比齐全', () => {
    render(<CompositionBars composition={composition} />)
    for (const share of composition) {
      expect(screen.getByText(share.title)).toBeInTheDocument()
    }
    expect(screen.getByText('56%')).toBeInTheDocument()
    expect(screen.getAllByText('0%')).toHaveLength(2)
  })

  it('条宽与颜色由数据驱动', () => {
    render(<CompositionBars composition={composition} />)
    const bar = screen.getByTestId('bar-QQ空间贵族')
    expect(bar).toHaveStyle({ width: '56%' })
    expect(bar).toHaveStyle({ backgroundColor: '#FF3E9D' })
  })

  it('行序保持传入顺序（占比降序由计分层保证）', () => {
    render(<CompositionBars composition={composition} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('QQ空间贵族')
    expect(rows[4]).toHaveTextContent('小红书新贵')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/internet-age test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/internet-age/src/components/composition-bars.tsx`

```tsx
import type { TagShare } from '@viral/shared'

interface Props {
  composition: TagShare[]
}

export function CompositionBars({ composition }: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {composition.map((share) => (
        <li key={share.tag} className="flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 font-bold">{share.title}</span>
          <span className="h-5 flex-1 overflow-hidden rounded-full bg-[#F0F0F0]">
            <span
              data-testid={`bar-${share.tag}`}
              className="bar-grow block h-full rounded-full"
              style={{ width: `${share.percent}%`, backgroundColor: share.barColor }}
            />
          </span>
          <span className="w-10 shrink-0 text-right font-black tabular-nums">{share.percent}%</span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/internet-age test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(internet-age): 成分条形图组件"
```

---

### Task 8: 报告屏 ReportScreen（成绩单）

**Files:**
- Create: `sites/internet-age/src/components/report-screen.tsx`
- Test: `sites/internet-age/src/components/report-screen.test.tsx`

**Interfaces:**
- Consumes: `TagsResult`/`TestConfig`（shared v2）、`CompositionBars`（Task 7）、`computeTagsResult`（测试造数）
- Produces: `<ReportScreen config={TestConfig} result={TagsResult} onRestart={() => void}>{children}</ReportScreen>` — 成绩单版式：考卷抬头 + 精神网龄大数字 + 称号（主成分）+ 成分条形图 + 一句锐评 + `children` 插槽 + 「再考一次」

- [ ] **Step 1: 写失败测试** `sites/internet-age/src/components/report-screen.test.tsx`

```tsx
import { computeTagsResult } from '@viral/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { wangGanConfig } from '../config/wang-gan'
import { ReportScreen } from './report-screen'

const result = computeTagsResult(wangGanConfig, [0, 0, 0, 0, 0, 0, 0, 0]) // QQ空间贵族 34 岁

describe('ReportScreen', () => {
  it('渲染精神网龄大数字与称号', () => {
    render(<ReportScreen config={wangGanConfig} result={result} onRestart={() => {}} />)
    expect(screen.getByText('34')).toBeInTheDocument()
    expect(screen.getByText('你的精神网龄')).toBeInTheDocument()
    expect(screen.getByText('本卷判定：QQ空间贵族')).toBeInTheDocument()
  })

  it('成分条形图与锐评齐全', () => {
    render(<ReportScreen config={wangGanConfig} result={result} onRestart={() => {}} />)
    expect(screen.getByTestId('bar-QQ空间贵族')).toBeInTheDocument()
    expect(screen.getByText(result.comment)).toBeInTheDocument()
  })

  it('children 插槽渲染，再考一次触发 onRestart', async () => {
    const onRestart = vi.fn()
    render(
      <ReportScreen config={wangGanConfig} result={result} onRestart={onRestart}>
        <button type="button">保存成绩单</button>
      </ReportScreen>,
    )
    expect(screen.getByRole('button', { name: '保存成绩单' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '再考一次' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/internet-age test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/internet-age/src/components/report-screen.tsx`

```tsx
import type { ReactNode } from 'react'
import type { TagsResult, TestConfig } from '@viral/shared'
import { CompositionBars } from './composition-bars'

interface Props {
  config: TestConfig
  result: TagsResult
  onRestart: () => void
  children?: ReactNode
}

export function ReportScreen({ config, result, onRestart, children }: Props) {
  return (
    <section className="slide-in flex flex-col gap-5">
      <header className="exam-paper p-5 text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-[#FF3E9D]">互联网网感统一测试卷 · 成绩单</p>
        <p className="mt-1 text-xs text-[#888888]">
          科目：{config.meta.title} · 考生：屏幕前这位 · 座位号：随缘
        </p>
      </header>
      <div className="exam-paper p-6 text-center">
        <p className="text-sm font-bold">你的精神网龄</p>
        <p className="rainbow-text mt-1 text-8xl font-black tabular-nums leading-none">
          {result.mentalAge}
        </p>
        <p className="mt-1 text-base font-bold">岁</p>
        <p className="mt-4 inline-block rounded-full border-[3px] border-[#FF3E9D] px-4 py-1 text-lg font-black text-[#FF3E9D]">
          本卷判定：{result.dominant.title}
        </p>
      </div>
      <div className="exam-paper p-5">
        <p className="mb-3 text-sm font-black">你的互联网成分</p>
        <CompositionBars composition={result.composition} />
      </div>
      <div className="exam-paper p-5 text-base leading-relaxed">
        <p>{result.comment}</p>
        <p className="mars-text mt-3 text-xs" aria-hidden="true">
          ↘这卷子莪给沵批完孒↙
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {children}
        <button
          type="button"
          onClick={onRestart}
          className="py-2 text-sm font-bold text-white underline [text-shadow:0_1px_0_rgba(0,0,0,0.35)]"
        >
          再考一次
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/internet-age test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(internet-age): 成绩单报告屏"
```

---

### Task 9: 分享卡片绘制 draw-exam-card（彩虹考卷 + 成分条）

**Files:**
- Create: `sites/internet-age/src/card/draw-exam-card.ts`
- Test: `sites/internet-age/src/card/draw-exam-card.test.ts`

**Interfaces:**
- Consumes: `DrawFn`/`wrapByLength`（shared）、`TagsResult`/`TestConfig`（shared v2）
- Produces: `makeExamCardDraw(config: TestConfig, result: TagsResult): DrawFn` — 1080×1440：彩虹渐变底（`createLinearGradient`）→ 白考卷 + 玫红描边 → 考卷抬头 → 精神网龄大数字 → 主成分判定 → 5 条成分横条（`fillRect` 画轨道 + 占比条，颜色取 `barColor`）→ 锐评（`wrapByLength` 24 字/行）→ 火星文角标（`aria` 无关，canvas 纯装饰）→ 玫红品牌条「网感年龄测试 · viral-sites」

- [ ] **Step 1: 写失败测试** `sites/internet-age/src/card/draw-exam-card.test.ts`

```ts
import { computeTagsResult } from '@viral/shared'
import { describe, expect, it, vi } from 'vitest'
import { wangGanConfig } from '../config/wang-gan'
import { makeExamCardDraw } from './draw-exam-card'

const result = computeTagsResult(wangGanConfig, [0, 0, 0, 0, 0, 0, 0, 0]) // QQ空间贵族 34 岁

function fakeCtx() {
  return {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '' as unknown,
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

describe('makeExamCardDraw', () => {
  it('彩虹底：createLinearGradient 恰好一次', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    expect((ctx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
  })

  it('文字包含抬头/网龄/判定/品牌条', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('互联网网感统一测试卷')
    expect(texts).toContain('34')
    expect(texts).toContain('岁 · 本卷判定：QQ空间贵族')
    expect(texts).toContain('网感年龄测试 · viral-sites')
  })

  it('五维成分条：每维画称号 + 百分比，轨道与占比条各 5 个 fillRect', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    for (const share of result.composition) {
      expect(texts).toContain(share.title)
      expect(texts).toContain(`${share.percent}%`)
    }
    // 底(渐变)1 + 考卷1 + 轨道5 + 占比条5 + 品牌条1 = 13
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(13)
  })

  it('锐评换行后仍完整覆盖原文', () => {
    const ctx = fakeCtx()
    makeExamCardDraw(wangGanConfig, result)(ctx, { width: 1080, height: 1440 })
    const joined = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join('')
    expect(joined).toContain(result.comment)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/internet-age test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/internet-age/src/card/draw-exam-card.ts`

```ts
import { wrapByLength, type DrawFn, type TagsResult, type TestConfig } from '@viral/shared'

const PINK = '#FF3E9D'
const INK = '#333333'
const GREY = '#888888'
const TRACK = '#F0F0F0'
const WHITE = '#ffffff'
const BRAND_TEXT = '网感年龄测试 · viral-sites'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const RAINBOW: Array<[number, string]> = [
  [0, '#FF3E9D'],
  [0.22, '#FF9A3E'],
  [0.45, '#FFD500'],
  [0.7, '#00C48C'],
  [1, '#00AEEF'],
]

export function makeExamCardDraw(config: TestConfig, result: TagsResult): DrawFn {
  return (ctx, size) => {
    // 彩虹渐变底
    const gradient = ctx.createLinearGradient(0, 0, size.width, size.height)
    for (const [offset, color] of RAINBOW) gradient.addColorStop(offset, color)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size.width, size.height)

    // 白考卷 + 玫红描边
    const paper = { x: 60, y: 90, w: size.width - 120, h: 1180 }
    ctx.fillStyle = WHITE
    ctx.fillRect(paper.x, paper.y, paper.w, paper.h)
    ctx.lineWidth = 6
    ctx.strokeStyle = PINK
    ctx.strokeRect(paper.x, paper.y, paper.w, paper.h)

    // 考卷抬头
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.font = `900 60px ${FONT}`
    ctx.fillText('互联网网感统一测试卷', size.width / 2, 200)
    ctx.fillStyle = GREY
    ctx.font = `400 30px ${FONT}`
    ctx.fillText('（满分 100 · 不设及格线 · 禁止代考）', size.width / 2, 252)

    // 精神网龄
    ctx.fillStyle = INK
    ctx.font = `400 36px ${FONT}`
    ctx.fillText('你的精神网龄', size.width / 2, 340)
    ctx.fillStyle = PINK
    ctx.font = `900 220px ${FONT}`
    ctx.fillText(`${result.mentalAge}`, size.width / 2, 560)
    ctx.fillStyle = INK
    ctx.font = `900 44px ${FONT}`
    ctx.fillText(`岁 · 本卷判定：${result.dominant.title}`, size.width / 2, 640)

    // 成分条（视觉锤）
    ctx.textAlign = 'left'
    ctx.font = `900 34px ${FONT}`
    ctx.fillText('你的互联网成分', paper.x + 80, 730)
    const barX = paper.x + 300
    const barW = 460
    result.composition.forEach((share, i) => {
      const rowY = 775 + i * 70
      ctx.fillStyle = INK
      ctx.font = `400 30px ${FONT}`
      ctx.fillText(share.title, paper.x + 80, rowY + 26)
      ctx.fillStyle = TRACK
      ctx.fillRect(barX, rowY, barW, 34)
      ctx.fillStyle = share.barColor
      ctx.fillRect(barX, rowY, Math.round((barW * share.percent) / 100), 34)
      ctx.fillStyle = INK
      ctx.font = `900 30px ${FONT}`
      ctx.fillText(`${share.percent}%`, barX + barW + 20, rowY + 26)
    })

    // 锐评
    ctx.fillStyle = INK
    ctx.font = `400 34px ${FONT}`
    let y = 1170
    for (const line of wrapByLength(result.comment, 24)) {
      ctx.fillText(line, paper.x + 80, y)
      y += 50
    }

    // 火星文角标（纯装饰）
    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.fillStyle = PINK
    ctx.textAlign = 'right'
    ctx.font = `400 28px ${FONT}`
    ctx.fillText('↘莂问硪湜谁↙', paper.x + paper.w - 30, paper.y + paper.h - 24)
    ctx.restore()

    // 品牌条
    ctx.fillStyle = PINK
    ctx.fillRect(0, size.height - 110, size.width, 110)
    ctx.fillStyle = WHITE
    ctx.textAlign = 'center'
    ctx.font = `700 40px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 42)
  }
}
```

（注意 `ctx.restore()` 会还原 `globalAlpha`/`textAlign`，品牌条在 restore 之后重设即可；测试对 fillRect 计 13 次是精确断言，新增装饰矩形须同步改测试——防止「顺手加料」破坏体积与版式预算。）

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/internet-age test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(internet-age): 彩虹考卷分享卡片与成分条绘制"
```

---

### Task 10: SaveCardButton + LongPressOverlay（双路径保存）

**Files:**
- Create: `sites/internet-age/src/components/save-card-button.tsx`, `sites/internet-age/src/components/long-press-overlay.tsx`
- Test: `sites/internet-age/src/components/save-card-button.test.tsx`

**Interfaces:**
- Consumes: `renderCard`/`saveCard`/`track`（shared）、`makeExamCardDraw`（Task 9）
- Produces: `<SaveCardButton config={TestConfig} result={TagsResult} />` — 点击：`renderCard` → `saveCard`；成功 `track('save_image', { slug })`；long-press 弹 `<LongPressOverlay dataUrl onClose />`；异常 `track('export_error', { slug })` + 「保存失败了，直接截图也一样」

- [ ] **Step 1: 写失败测试** `sites/internet-age/src/components/save-card-button.test.tsx`

```tsx
import { computeTagsResult } from '@viral/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { wangGanConfig } from '../config/wang-gan'
import { SaveCardButton } from './save-card-button'

const result = computeTagsResult(wangGanConfig, [1, 1, 1, 1, 1, 1, 1, 1])

describe('SaveCardButton', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('桌面：点击触发下载并埋点 save_image（带 slug）', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton config={wangGanConfig} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: '保存成绩单' }))
    expect(umamiSpy).toHaveBeenCalledWith('save_image', { slug: 'wang-gan' })
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton config={wangGanConfig} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: '保存成绩单' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton config={wangGanConfig} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: '保存成绩单' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', { slug: 'wang-gan' })
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/internet-age test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/internet-age/src/components/long-press-overlay.tsx`：

```tsx
interface Props {
  dataUrl: string
  onClose: () => void
}

export function LongPressOverlay({ dataUrl, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 px-8"
      onClick={onClose}
    >
      <img src={dataUrl} alt="网感年龄成绩单卡片" className="max-h-[70vh] w-auto rounded-xl border-[3px] border-white" />
      <p className="text-sm font-bold text-white">长按图片保存</p>
      <p className="text-xs text-white/60">点击空白处关闭</p>
    </div>
  )
}
```

`sites/internet-age/src/components/save-card-button.tsx`：

```tsx
import { useState } from 'react'
import { renderCard, saveCard, track, type TagsResult, type TestConfig } from '@viral/shared'
import { makeExamCardDraw } from '../card/draw-exam-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  config: TestConfig
  result: TagsResult
}

export function SaveCardButton({ config, result }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeExamCardDraw(config, result))
      saveCard(canvas, {
        filename: `${config.meta.slug}-exam.png`,
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { slug: config.meta.slug })
    } catch {
      setFailed(true)
      track('export_error', { slug: config.meta.slug })
    }
  }

  return (
    <>
      <button type="button" onClick={handleSave} className="y2k-btn py-4 text-lg">
        保存成绩单
      </button>
      {failed && (
        <p className="text-center text-sm font-bold text-white [text-shadow:0_1px_0_rgba(0,0,0,0.35)]">
          保存失败了，直接截图也一样
        </p>
      )}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/internet-age test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(internet-age): 成绩单双路径保存与降级提示"
```

---

### Task 11: App 组装（三屏状态机 + generate / q_answered 埋点 + 页脚免责）

**Files:**
- Modify: `sites/internet-age/src/app.tsx`
- Test: `sites/internet-age/src/app.test.tsx`

**Interfaces:**
- Consumes: `LandingScreen`（5）、`QuizScreen`（6）、`ReportScreen`（8）、`SaveCardButton`（10）、`computeTagsResult`/`track`（shared）、`resolveConfig`（4）
- Produces: `<App />` — `{ screen: 'landing' } | { screen: 'quiz' } | { screen: 'report'; result: TagsResult }` 状态机；答每题 `track('q_answered', { slug, q: 1~8 })`；答完 `track('generate', { slug, age: mentalAge })`；页脚免责声明全站唯一一处（含「梗年代判定难免主观」的口碑风险提示）；`window.location.search` 只在组装层读一次

- [ ] **Step 1: 写失败测试** `sites/internet-age/src/app.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { App } from './app'

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('完整流程：落地 → 8 题 → 成绩单，埋点齐全', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '开始答卷' }))
    for (let i = 0; i < 8; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    expect(screen.getByText('你的精神网龄')).toBeInTheDocument()
    expect(screen.getByText('34')).toBeInTheDocument() // 全选首项 → QQ空间贵族 34 岁
    expect(screen.getByText('本卷判定：QQ空间贵族')).toBeInTheDocument()
    const events = umamiSpy.mock.calls.map((c) => c[0])
    expect(events.filter((e) => e === 'q_answered')).toHaveLength(8)
    expect(umamiSpy).toHaveBeenCalledWith('q_answered', { slug: 'wang-gan', q: 1 })
    expect(umamiSpy).toHaveBeenCalledWith('generate', { slug: 'wang-gan', age: 34 })
  })

  it('再考一次回落地屏', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '开始答卷' }))
    for (let i = 0; i < 8; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    await userEvent.click(screen.getByRole('button', { name: '再考一次' }))
    expect(screen.getByRole('button', { name: '开始答卷' })).toBeInTheDocument()
  })

  it('免责声明常驻页脚且全站仅此一处', () => {
    render(<App />)
    expect(screen.getByText(/测试纯属玩梗/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/internet-age test`
Expected: FAIL（app.tsx 还是占位）

- [ ] **Step 3: 实现** `sites/internet-age/src/app.tsx`（整文件替换）

```tsx
import { useState } from 'react'
import { computeTagsResult, track, type TagsResult } from '@viral/shared'
import { resolveConfig } from './config/registry'
import { LandingScreen } from './components/landing-screen'
import { QuizScreen } from './components/quiz-screen'
import { ReportScreen } from './components/report-screen'
import { SaveCardButton } from './components/save-card-button'

type Screen = { screen: 'landing' } | { screen: 'quiz' } | { screen: 'report'; result: TagsResult }

export function App() {
  // window.location.search 只允许在这一处组装层读取
  const [config] = useState(() => resolveConfig(window.location.search))
  const [state, setState] = useState<Screen>({ screen: 'landing' })

  const handleFinish = (answers: number[]) => {
    const result = computeTagsResult(config, answers)
    track('generate', { slug: config.meta.slug, age: result.mentalAge })
    setState({ screen: 'report', result })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="flex-1">
        {state.screen === 'landing' && (
          <LandingScreen config={config} onStart={() => setState({ screen: 'quiz' })} />
        )}
        {state.screen === 'quiz' && (
          <QuizScreen
            config={config}
            onAnswer={(i) => track('q_answered', { slug: config.meta.slug, q: i + 1 })}
            onFinish={handleFinish}
          />
        )}
        {state.screen === 'report' && (
          <ReportScreen
            config={config}
            result={state.result}
            onRestart={() => setState({ screen: 'landing' })}
          >
            <SaveCardButton config={config} result={state.result} />
          </ReportScreen>
        )}
      </div>
      <footer className="pt-8 text-center text-xs leading-relaxed text-white [text-shadow:0_1px_0_rgba(0,0,0,0.35)]">
        测试纯属玩梗，梗的年代判定难免主观 · 所有计算在本地完成，答案不会被上传
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + 全仓核验**

Run: `pnpm -r test && pnpm -r typecheck && pnpm --filter @viral/internet-age build`
Expected: 全 PASS（life-grid 与 mental-state 均不回归），构建成功

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(internet-age): App 三屏状态机与完测率埋点"
```

---

### Task 12: 上线准备（体积核验 + 02 回归为止；部署列手工步骤）

**Files:**
- Modify: `sites/internet-age/index.html`（umami website-id，手工步骤内）、`README.md`（路线图状态，若有 12 行）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: 体积预算核验（本计划执行边界到此为止）**

Run: `pnpm --filter @viral/internet-age build`
查看 vite 输出 gzip 列：JS + CSS gzip 合计须 < 100KB。超了先 `pnpm --filter @viral/internet-age list --depth 0` 查是否混入多余依赖。

- [ ] **Step 2: 02 站点回归复核（引擎升级的最后一道保险）**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/mental-state test && pnpm --filter @viral/mental-state build`
Expected: 全 PASS；确认 `git log --oneline -- sites/mental-state` 在本计划期间没有新增提交（02 站点零改动）

- [ ] **Step 3: 本地手机真机冒烟**

Run: `pnpm --filter @viral/internet-age dev --host`
手机连同一 Wi-Fi 打开 `http://<局域网IP>:5173`，走一遍 落地 → 8 题 → 成绩单 → 保存；顺手核对：彩虹底上白字可读、成分条动效在系统「减弱动态效果」开启时静止。

- [ ] **Step 4: 【手工·需用户】题库双人审（时效校准制度）**

请两位不同年龄段的真人各过一遍题库（对照 `wang-gan.ts` 的 note 年代标注）：老梗认定错误会被评论区嘲，是本站最大口碑风险。审出问题改配置字段即可（24 小时热修路径）。此步骤需要用户召集人，执行者停下来向用户要结论。

- [ ] **Step 5: 【手工·需用户】创建 umami 站点**

在 umami 后台 Add website（internet-age）→ 拿到 website-id → 替换 `sites/internet-age/index.html` 里的 `TO_BE_FILLED`。

- [ ] **Step 6: 【手工·需用户】部署 Cloudflare Pages**

```bash
pnpm dlx wrangler login
pnpm dlx wrangler pages project create internet-age --production-branch main
pnpm --filter @viral/internet-age build
pnpm dlx wrangler pages deploy sites/internet-age/dist --project-name internet-age
```

产出 `https://internet-age.pages.dev`。（与 02 发布间隔 ≥2 周，避免受众撞车——设计文档 §7。）

- [ ] **Step 7: 【手工·需用户】四环境验收**

- [ ] iPhone 微信内打开 → 长按路径，图能存相册
- [ ] 安卓微信内打开 → 同上
- [ ] iOS Safari → 长按路径
- [ ] 桌面 Chrome → 直接下载
- [ ] umami 后台能看到 pageview / q_answered / generate / save_image 四类事件
- [ ] 多测几组答案，确认成分条在九宫格缩略图尺寸下仍可辨识（卡片视觉锤验收）

- [ ] **Step 8: 更新 README 状态并提交推送**

README 路线图表中 12 行状态改为 `🚀 已上线（internet-age.pages.dev）`。

```bash
git add -A && git commit -m "chore: internet-age 上线，更新状态与 umami 配置" && git push
```

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §3 引擎 v2 升级（mode 并集 + 向后兼容 + 02 测试原样保留，Task 1/2；02 构建产物回归为 Task 12 Step 2）、§4 题库 8 题全部成文含设计文档点名的三个题干方向（告别方式/蓝瘦香菇/家人们，Task 4）、五维 tag 与锚点年龄（Task 4，全选首项恰好复现 §1 示例的「QQ 系 34 岁」口径）、时效校准制度（note 字段 + lint + Task 12 双人审）、精神网龄配置化公式与确定性扰动（Task 2 `ageJitterSpan`）、§5 成分条形图报告卡（Task 7 页面 / Task 9 卡片，视觉锤在 Task 12 Step 7 验收）、§6 埋点沿用 02 全套含 q_answered（Task 11）与两模式单测（聚合/归一/平手/linear 回归，Task 2）、§7 风险三条均有承接（双人审、发布间隔、回归保险）。
- **占位符扫描**：无 TBD/TODO/「适当处理」；`TO_BE_FILLED` 为 umami 接入的既定占位值（life-grid/mental-state 同款约定），Task 12 手工步骤替换；【手工·需用户】步骤均已显式标注。
- **类型一致性（含跨计划引擎签名核对）**：`parseTestConfig(raw: unknown): TestConfig`、`assertAnswers(config, answers)`、`computeResult(config, answers): QuizResult`、`wrapByLength(text, maxChars): string[]` 与 02 计划完全同名同签名；v2 仅将 `TestConfig` 联合化并加运行时守卫，02 站点消费的公共字段（meta/questions/options[].text）在联合类型上仍可直接访问，02 代码零改动即编译（Task 1 Step 4 强制验证）；`TagsResult`/`TagShare`/`QuizDimension`（Task 2 定义，Task 4/7/8/9/10/11 消费）签名逐一核对一致；`track(event, data?: Record<string, string | number>)` 传参（slug: string、q/age: number）合法。






