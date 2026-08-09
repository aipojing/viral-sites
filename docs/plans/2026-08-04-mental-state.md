# 站点 02 · 精神状态检测（班味浓度）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@viral/shared` 落地配置驱动的测试引擎 v1（linear 线性计分 + zod 校验），并完成第二发站点「班味浓度检测」（`sites/mental-state`）到可部署状态。

**Architecture:** 测试引擎（schema 校验 + 计分纯函数）放 `packages/shared/src/quiz/`——这是对设计文档 [02](../02-mental-state-check.md) §7「站内 `engine/`」的**修正**：工厂规则（[00](../00-factory-design.md) §4.1）禁止站与站互相依赖，而站点 12（网感年龄）要复用该引擎，引擎必须进 shared。`scoring.mode` 字段 v1 只实现 `'linear'`，为 12 的 `'tags'` 多维计分预留扩展位。题库为 TS 模块常量而非设计文档所说的 `configs/*.json`（TS 常量同样打包进 bundle，还白得一层 typecheck），加载时经 `parseTestConfig` 做 zod 校验，坏配置在测试期与加载期都直接报错。配置里也不含设计文档 §4 的 `card` 视觉参数块——卡片视觉是站点级风格资产，由站点绘制回调写死，进配置属过度设计（修正点，12 计划同口径）。站点侧只做三屏 UI（落地 → 答题 → 报告）+ 卡片绘制，计分全部走 shared 纯函数。TDD：每个纯函数与组件先写失败测试。

**Tech Stack:** pnpm workspace · Vite · React 19 · TypeScript(strict) · Tailwind v4 · zod（新增 shared 依赖）· Vitest + Testing Library(jsdom) · Cloudflare Pages（`_worker.js` 同源代理 umami）· umami

## Global Constraints

（工厂规则 + life-grid 实施验证过的工程约定，所有任务默认遵守）

- 新站与 life-grid 同构：包名 `@viral/mental-state`，依赖 `'@viral/shared@workspace:*'`；站与站零依赖，只准依赖 shared
- `vitest.config.ts` 必须 `test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] }`（Testing Library 自动 cleanup 依赖 globals）
- devDeps 版本用已验证组合：`vitest@^3`、`@testing-library/jest-dom@^6`，其余照 life-grid 的版本族（React 19 / Vite 8 / Tailwind 4 / TS 7）
- `public/_worker.js` 与 `public/u.js` 从 `sites/life-grid/public/` 用 cp 复制（计划内明确步骤）；`index.html` 用同款 umami 接入：自托管 `/u.js` + `data-website-id="TO_BE_FILLED"`（上线任务替换真实 id）+ `data-host-url="/"`；`favicon.svg` 按本站风格现写
- 埋点语义全厂统一：`visit`（umami pageview 自带）/ `generate`（出报告）/ `save_image`（保存卡片）；本站另加 `q_answered`（带题号 `q: 1~8`，算完测率——题目不好笑的位置会直接反映为流失点）；埋点不带任何个人数据
- 分享卡片一律走 shared 的 `renderCard`/`saveCard`，1080×1440（3:4），底部品牌条
- 纯函数显式传参，不取全局时间/全局状态；不可变数据：更新一律返回新副本，答案数组用 `[...answers, i]` 追加
- 首屏 gzip < 100KB；不引入 UI 库/日期库/动画库；zod 加入 shared 依赖（≈15KB gzip，预算内，上线任务复核）
- 隐私/免责声明只放 App 页脚一处（避免测试 getByText 多重匹配）；设计文档 §6「结果页明示玩梗」由页脚常驻覆盖
- 视觉＝**新粗野主义**（[00a](../00a-style-map.md) 分配），完整色板（禁止套用 life-grid 作业本配色）：
  - 荧光黄 `#EFFF00`：页面底色 / 称号高亮块 / 主按钮文字
  - 墨黑 `#111111`：正文 / 描边 / 硬阴影 / 品牌条底 / 公章（章用墨黑单色不用印泥红，守住新粗野主义「色数 ≤3」硬约束）
  - 白 `#FFFFFF`：卡片底
  - 描边统一 3px（canvas 卡片上 6~10px）；硬阴影统一偏**右下** `6px 6px 0 #111111`（canvas 上 20px）；圆角一律 0（公章圆形除外）
  - 签名元素：「检测报告」公章 + 骑缝章——页面与分享卡片都必须出现
- 调性「轻快、贱兮兮」；题目文案过「值得截图」自审：8 题里至少 3 题让人想截图发群
- 动效只出现在签名时刻（换题 pop-in、按钮按压塌陷），尊重 `prefers-reduced-motion`
- 提交信息 conventional commits（feat/fix/test/chore/docs），不加 Co-Authored-By；测试命令统一 `pnpm --filter <pkg> test`

**文件全景**（Create/Modify 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
packages/shared/
  package.json                    # Modify：pnpm add zod
  src/index.ts                    # Modify：追加 quiz 与 wrapByLength 导出
  src/quiz/schema.ts (+test)      # TestConfig zod schema + parseTestConfig
  src/quiz/schema.fixtures.ts     # 合法配置工厂（本包测试与 12 计划复用；无 describe，避免被当测试收集）
  src/quiz/scoring.ts (+test)     # 线性计分纯函数
  src/share-card/text.ts (+test)  # wrapByLength 中文换行（站点 12 复用）
sites/mental-state/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  public/_worker.js  public/u.js  # cp 自 life-grid
  public/favicon.svg              # 新写（新粗野主义）
  test/setup.ts  test/canvas-stub.ts
  src/main.tsx  src/index.css
  src/app.tsx (+test)
  src/config/ban-wei.ts           # 班味题库（全部文案成品）
  src/config/registry.ts (+test)  # ?t=<slug> 多测试路由预留
  src/components/landing-screen.tsx (+test)
  src/components/quiz-screen.tsx (+test)
  src/components/report-screen.tsx (+test)
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-report-card.ts (+test)
```

---

### Task 1: shared 测试引擎 schema（zod 校验 + parseTestConfig）

**Files:**
- Modify: `packages/shared/package.json`（加 zod 依赖）
- Create: `packages/shared/src/quiz/schema.ts`, `packages/shared/src/quiz/schema.fixtures.ts`
- Test: `packages/shared/src/quiz/schema.test.ts`

**Interfaces:**
- Produces:
  - `type TestConfig`（zod 推导：`meta { slug; title; subtitle }` + `questions`（恰 8 题，每题 3~4 选项 `{ text; score }`）+ `scoring { mode: 'linear'(默认); tiers[5] }`；tier = `{ minScore; title; percentRange: [number, number]; comments: string[3]; remedy }`）
  - `type QuizQuestion` / `type QuizOption` / `type QuizTier`
  - `parseTestConfig(raw: unknown): TestConfig` — 校验失败抛 `Error('测试配置不合法：<路径: 信息;...>')`
- 注意：站点 12 计划会把本文件升级为 v2（联合 tags 模式）。**本任务的测试文件是 v2 的回归基线，只准通过 `parseTestConfig` 与类型消费本模块，不得 import 内部子 schema**。

- [ ] **Step 1: 安装 zod**

Run: `cd /Users/ahs/Documents/vibe-coding/viral-sites && pnpm --filter @viral/shared add zod`
Expected: `packages/shared/package.json` 出现 `"zod": "^4.x"` 依赖

- [ ] **Step 2: 写失败测试**

先写配置工厂 `packages/shared/src/quiz/schema.fixtures.ts`（独立于测试文件：12 计划的新测试也要 import 它，放 `.test.ts` 里会导致引用方重复注册用例）：

```ts
export function makeRawConfig() {
  const question = (n: number) => ({
    text: `第 ${n} 题`,
    options: [
      { text: '选项 0 分', score: 0 },
      { text: '选项 1 分', score: 1 },
      { text: '选项 2 分', score: 2 },
      { text: '选项 3 分', score: 3 },
    ],
  })
  return {
    meta: { slug: 'demo', title: '演示测试', subtitle: '演示副标题' },
    questions: [1, 2, 3, 4, 5, 6, 7, 8].map(question),
    scoring: {
      tiers: [
        { minScore: 0, title: '一档', percentRange: [0, 19], comments: ['a1', 'a2', 'a3'], remedy: 'r1' },
        { minScore: 5, title: '二档', percentRange: [20, 39], comments: ['b1', 'b2', 'b3'], remedy: 'r2' },
        { minScore: 10, title: '三档', percentRange: [40, 64], comments: ['c1', 'c2', 'c3'], remedy: 'r3' },
        { minScore: 15, title: '四档', percentRange: [65, 84], comments: ['d1', 'd2', 'd3'], remedy: 'r4' },
        { minScore: 20, title: '五档', percentRange: [85, 100], comments: ['e1', 'e2', 'e3'], remedy: 'r5' },
      ],
    },
  }
}
```

再写 `packages/shared/src/quiz/schema.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { parseTestConfig } from './schema'
import { makeRawConfig } from './schema.fixtures'

describe('parseTestConfig', () => {
  it('合法配置通过，mode 默认 linear', () => {
    const config = parseTestConfig(makeRawConfig())
    expect(config.scoring.mode).toBe('linear')
    expect(config.questions).toHaveLength(8)
    expect(config.scoring.tiers).toHaveLength(5)
  })

  it('题数不是 8 拒绝', () => {
    const base = makeRawConfig()
    const raw = { ...base, questions: base.questions.slice(0, 7) }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('选项少于 3 个拒绝', () => {
    const base = makeRawConfig()
    const bad = { ...base.questions[0], options: base.questions[0].options.slice(0, 2) }
    const raw = { ...base, questions: [bad, ...base.questions.slice(1)] }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('分档不是 5 档拒绝', () => {
    const base = makeRawConfig()
    const raw = {
      ...base,
      scoring: { ...base.scoring, tiers: base.scoring.tiers.slice(0, 4) },
    }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('第一档 minScore 不为 0 拒绝', () => {
    const base = makeRawConfig()
    const tiers = [{ ...base.scoring.tiers[0], minScore: 1 }, ...base.scoring.tiers.slice(1)]
    const raw = { ...base, scoring: { ...base.scoring, tiers } }
    expect(() => parseTestConfig(raw)).toThrow('第一档 minScore 必须为 0')
  })

  it('minScore 不严格递增拒绝', () => {
    const base = makeRawConfig()
    const tiers = base.scoring.tiers.map((t, i) => (i === 2 ? { ...t, minScore: 5 } : t))
    const raw = { ...base, scoring: { ...base.scoring, tiers } }
    expect(() => parseTestConfig(raw)).toThrow('minScore 必须严格递增')
  })

  it('报告文案不是 3 条拒绝', () => {
    const base = makeRawConfig()
    const tiers = [
      { ...base.scoring.tiers[0], comments: ['只有一条'] },
      ...base.scoring.tiers.slice(1),
    ]
    const raw = { ...base, scoring: { ...base.scoring, tiers } }
    expect(() => parseTestConfig(raw)).toThrow('测试配置不合法')
  })

  it('非对象输入拒绝且不崩溃', () => {
    expect(() => parseTestConfig(null)).toThrow('测试配置不合法')
    expect(() => parseTestConfig('x')).toThrow('测试配置不合法')
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL（schema 模块不存在）

- [ ] **Step 4: 实现** `packages/shared/src/quiz/schema.ts`

```ts
import { z } from 'zod'

export const quizOptionSchema = z.object({
  text: z.string().min(1),
  score: z.number().int().min(0),
})

export const quizQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(quizOptionSchema).min(3).max(4),
})

export const quizTierSchema = z.object({
  minScore: z.number().int().min(0),
  title: z.string().min(1),
  percentRange: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  comments: z.array(z.string().min(1)).length(3),
  remedy: z.string().min(1),
})

export const testConfigSchema = z
  .object({
    meta: z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string().min(1),
      subtitle: z.string().min(1),
    }),
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

export type TestConfig = z.infer<typeof testConfigSchema>
export type QuizQuestion = z.infer<typeof quizQuestionSchema>
export type QuizOption = z.infer<typeof quizOptionSchema>
export type QuizTier = z.infer<typeof quizTierSchema>

export function parseTestConfig(raw: unknown): TestConfig {
  const parsed = testConfigSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`测试配置不合法：${issues}`)
  }
  return parsed.data
}
```

- [ ] **Step 5: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`
Expected: 全 PASS

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(shared): quiz 引擎 TestConfig schema 与 zod 校验"
```

---

### Task 2: shared 线性计分纯函数

**Files:**
- Create: `packages/shared/src/quiz/scoring.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/quiz/scoring.test.ts`

**Interfaces:**
- Consumes: `TestConfig`/`QuizTier`（Task 1）
- Produces（站点与 12 计划共同依赖，签名必须一致）:
  - `totalScore(config: TestConfig, answers: readonly number[]): number` — answers 为各题选项下标；数量或下标越界抛 Error
  - `scoreBounds(config: TestConfig): { min: number; max: number }`
  - `resolveTier(config: TestConfig, score: number): QuizTier` — 取 `score >= minScore` 的最高档
  - `percentInTier(config: TestConfig, score: number): number` — 档内线性映射到 `percentRange`，四舍五入取整（同档不同分显示不同浓度，制造「我 87% 你 83%」的对比谈资）
  - `interface QuizResult { score: number; tier: QuizTier; percent: number }`
  - `computeResult(config: TestConfig, answers: readonly number[]): QuizResult`
  - `assertAnswers(config: TestConfig, answers: readonly number[]): void`（导出：12 的 tags 计分复用同一套答案校验）

- [ ] **Step 1: 写失败测试** `packages/shared/src/quiz/scoring.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { makeRawConfig } from './schema.fixtures'
import { parseTestConfig } from './schema'
import {
  computeResult,
  percentInTier,
  resolveTier,
  scoreBounds,
  totalScore,
} from './scoring'

const config = parseTestConfig(makeRawConfig())
const ALL_MIN = [0, 0, 0, 0, 0, 0, 0, 0]
const ALL_MAX = [3, 3, 3, 3, 3, 3, 3, 3]

describe('totalScore', () => {
  it('全选最低分 = 0', () => expect(totalScore(config, ALL_MIN)).toBe(0))
  it('全选最高分 = 24', () => expect(totalScore(config, ALL_MAX)).toBe(24))
  it('混合作答逐题求和', () =>
    expect(totalScore(config, [0, 1, 2, 3, 0, 1, 2, 3])).toBe(12))
  it('答案数量不对抛错', () =>
    expect(() => totalScore(config, [0, 1])).toThrow('答案数量不对'))
  it('选项下标越界抛错', () =>
    expect(() => totalScore(config, [0, 0, 0, 0, 0, 0, 0, 4])).toThrow('第 8 题答案越界'))
  it('非整数下标抛错', () =>
    expect(() => totalScore(config, [0, 0, 0, 0, 0, 0, 0, 1.5])).toThrow('第 8 题答案越界'))
})

describe('scoreBounds', () => {
  it('全 0~3 分制 8 题 → { 0, 24 }', () =>
    expect(scoreBounds(config)).toEqual({ min: 0, max: 24 }))
})

describe('resolveTier', () => {
  it('档位边界：4 → 一档，5 → 二档', () => {
    expect(resolveTier(config, 4).title).toBe('一档')
    expect(resolveTier(config, 5).title).toBe('二档')
  })
  it('档位边界：19 → 四档，20 → 五档', () => {
    expect(resolveTier(config, 19).title).toBe('四档')
    expect(resolveTier(config, 20).title).toBe('五档')
  })
})

describe('percentInTier', () => {
  it('全档最低分落在区间下缘：0 → 0，5 → 20，20 → 85', () => {
    expect(percentInTier(config, 0)).toBe(0)
    expect(percentInTier(config, 5)).toBe(20)
    expect(percentInTier(config, 20)).toBe(85)
  })
  it('档内线性：12 → 52（40 + 2/4 × 24）', () =>
    expect(percentInTier(config, 12)).toBe(52))
  it('末档用 scoreBounds.max 收口：22 → 93，24 → 100', () => {
    expect(percentInTier(config, 22)).toBe(93)
    expect(percentInTier(config, 24)).toBe(100)
  })
})

describe('computeResult', () => {
  it('组装 score/tier/percent', () => {
    const result = computeResult(config, ALL_MAX)
    expect(result.score).toBe(24)
    expect(result.tier.title).toBe('五档')
    expect(result.percent).toBe(100)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL

- [ ] **Step 3: 实现** `packages/shared/src/quiz/scoring.ts`

```ts
import type { QuizTier, TestConfig } from './schema'

export interface QuizResult {
  score: number
  tier: QuizTier
  percent: number
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
  assertAnswers(config, answers)
  return answers.reduce((sum, answer, i) => sum + config.questions[i].options[answer].score, 0)
}

export function scoreBounds(config: TestConfig): { min: number; max: number } {
  return config.questions.reduce(
    (acc, q) => {
      const scores = q.options.map((o) => o.score)
      return { min: acc.min + Math.min(...scores), max: acc.max + Math.max(...scores) }
    },
    { min: 0, max: 0 },
  )
}

export function resolveTier(config: TestConfig, score: number): QuizTier {
  const tiers = config.scoring.tiers
  let matched = tiers[0]
  for (const tier of tiers) {
    if (score >= tier.minScore) matched = tier
  }
  return matched
}

export function percentInTier(config: TestConfig, score: number): number {
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

`packages/shared/src/index.ts` 追加（保留原有四行导出）：

```ts
export {
  parseTestConfig,
  type TestConfig,
  type QuizQuestion,
  type QuizOption,
  type QuizTier,
} from './quiz/schema'
export {
  assertAnswers,
  totalScore,
  scoreBounds,
  resolveTier,
  percentInTier,
  computeResult,
  type QuizResult,
} from './quiz/scoring'
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): quiz 线性计分与档内百分比映射"
```

---

### Task 3: wrapByLength 中文换行工具（卡片绘制共用）

**Files:**
- Create: `packages/shared/src/share-card/text.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/share-card/text.test.ts`

**Interfaces:**
- Produces: `wrapByLength(text: string, maxChars: number): string[]` — 按字符数硬换行（中文场景等宽近似，不依赖 canvas measureText，可在 jsdom 下纯函数单测）；`maxChars <= 0` 抛 Error；空串返回 `['']`；用 `Array.from` 切分避免拆开代理对（emoji）
- 站点 12 的考卷卡片复用本函数，勿在站内重复实现

- [ ] **Step 1: 写失败测试** `packages/shared/src/share-card/text.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { wrapByLength } from './text'

describe('wrapByLength', () => {
  it('不超长时单行原样返回', () =>
    expect(wrapByLength('班味清新', 10)).toEqual(['班味清新']))

  it('超长按 maxChars 硬切', () =>
    expect(wrapByLength('一二三四五六七八九十甲乙', 5)).toEqual(['一二三四五', '六七八九十', '甲乙']))

  it('空串返回一个空行（调用方好统一按行推进 y）', () =>
    expect(wrapByLength('', 10)).toEqual(['']))

  it('emoji 代理对不被拆开', () =>
    expect(wrapByLength('😀😀😀', 2)).toEqual(['😀😀', '😀']))

  it('maxChars 非正数抛错', () =>
    expect(() => wrapByLength('x', 0)).toThrow('maxChars 必须为正整数'))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL

- [ ] **Step 3: 实现** `packages/shared/src/share-card/text.ts`

```ts
export function wrapByLength(text: string, maxChars: number): string[] {
  if (!Number.isInteger(maxChars) || maxChars <= 0) {
    throw new Error('maxChars 必须为正整数')
  }
  const chars = Array.from(text)
  if (chars.length === 0) return ['']
  const lines: string[] = []
  for (let i = 0; i < chars.length; i += maxChars) {
    lines.push(chars.slice(i, i + maxChars).join(''))
  }
  return lines
}
```

`packages/shared/src/index.ts` 追加：

```ts
export { wrapByLength } from './share-card/text'
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/shared test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): wrapByLength 卡片文本换行工具"
```

---

### Task 4: mental-state 站点脚手架

**Files:**
- Create: `sites/mental-state/package.json`, `sites/mental-state/tsconfig.json`, `sites/mental-state/vite.config.ts`, `sites/mental-state/vitest.config.ts`, `sites/mental-state/index.html`, `sites/mental-state/public/favicon.svg`, `sites/mental-state/src/main.tsx`, `sites/mental-state/src/app.tsx`, `sites/mental-state/src/index.css`, `sites/mental-state/test/setup.ts`, `sites/mental-state/test/canvas-stub.ts`
- Copy: `sites/life-grid/public/_worker.js`、`sites/life-grid/public/u.js` → `sites/mental-state/public/`

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）
- Produces: 可 build 的 Vite React 站点；`test/canvas-stub.ts` 的 `installCanvasStub(): RecordingCtx`（比 life-grid 版多 arc/stroke/save/restore/translate/rotate 等，供公章绘制测试）

- [ ] **Step 1: 建包与依赖**

`sites/mental-state/package.json`：

```json
{
  "name": "@viral/mental-state",
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
pnpm --filter @viral/mental-state add react react-dom
pnpm --filter @viral/mental-state add -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom@^6 @types/react @types/react-dom
pnpm --filter @viral/mental-state add '@viral/shared@workspace:*'
```

- [ ] **Step 2: 复制 umami 基建（不改内容）**

```bash
mkdir -p sites/mental-state/public
cp sites/life-grid/public/_worker.js sites/life-grid/public/u.js sites/mental-state/public/
```

- [ ] **Step 3: 配置文件**

`sites/mental-state/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client", "@testing-library/jest-dom"] },
  "include": ["src", "test"]
}
```

`sites/mental-state/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/mental-state/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
})
```

`sites/mental-state/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

`sites/mental-state/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#EFFF00" />
    <title>班味浓度检测 — 测测你被工位腌入味了没</title>
    <meta
      name="description"
      content="8 道好笑的题，测出你的班味浓度，出具一张可以甩到群里的检测报告。测试纯属玩梗，所有计算在本地完成。"
    />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- umami 自托管脚本 + 同源上报（data-host-url="/" → POST /api/send，由 _worker.js 代理转发）。
         TO_BE_FILLED 在 Task 11 上线步骤替换为真实 website-id -->
    <script defer src="/u.js" data-website-id="TO_BE_FILLED" data-host-url="/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`sites/mental-state/public/favicon.svg`（新粗野主义：荧光黄底 + 白卡硬阴影 + 公章圈）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#EFFF00"/>
  <rect x="16" y="14" width="38" height="38" fill="#111111"/>
  <rect x="10" y="8" width="38" height="38" fill="#FFFFFF" stroke="#111111" stroke-width="4"/>
  <circle cx="29" cy="27" r="11" fill="none" stroke="#111111" stroke-width="3" transform="rotate(-12 29 27)"/>
</svg>
```

`sites/mental-state/src/index.css`（新粗野主义基础样式，全站唯一 CSS）：

```css
@import 'tailwindcss';

:root {
  color-scheme: light;
}

body {
  background-color: #efff00;
  color: #111111;
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

/* 新粗野主义卡片：白底 + 粗黑描边 + 右下硬阴影（全站统一偏移方向） */
.nb-card {
  background: #ffffff;
  border: 3px solid #111111;
  box-shadow: 6px 6px 0 #111111;
}

/* 按钮：按下时阴影塌陷，手感「啪」 */
.nb-btn {
  background: #ffffff;
  border: 3px solid #111111;
  box-shadow: 6px 6px 0 #111111;
  font-weight: 800;
  transition:
    transform 0.05s ease-out,
    box-shadow 0.05s ease-out;
}
.nb-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 2px 2px 0 #111111;
}
.nb-btn-primary {
  background: #111111;
  color: #efff00;
}

/* 公章：墨黑单色（色数 ≤3，不引入印泥红） */
.stamp {
  display: inline-block;
  border: 4px solid #111111;
  border-radius: 9999px;
  padding: 10px 14px;
  transform: rotate(-12deg);
  font-weight: 900;
  letter-spacing: 2px;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.pop-in {
  animation: pop-in 0.22s ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .pop-in {
    animation: none;
  }
  .nb-btn {
    transition: none;
  }
}
```

`sites/mental-state/src/main.tsx`：

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

`sites/mental-state/src/app.tsx`（占位，Task 10 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-5 py-8">班味浓度检测</main>
}
```

`sites/mental-state/test/canvas-stub.ts`（组件/卡片测试共用 canvas 桩，含公章所需方法）：

```ts
import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  strokeRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  beginPath: ReturnType<typeof vi.fn>
  arc: ReturnType<typeof vi.fn>
  stroke: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  translate: ReturnType<typeof vi.fn>
  rotate: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
  fillStyle: string
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
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
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

Run: `pnpm --filter @viral/mental-state build`
Expected: 构建成功，`sites/mental-state/dist/` 内含 `_worker.js`、`u.js`、`favicon.svg`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mental-state): 站点脚手架与新粗野主义基础样式"
```

---

### Task 5: 班味题库（全部文案成品）+ ?t= 路由预留

**Files:**
- Create: `sites/mental-state/src/config/ban-wei.ts`, `sites/mental-state/src/config/registry.ts`
- Test: `sites/mental-state/src/config/registry.test.ts`

**Interfaces:**
- Consumes: `parseTestConfig`/`computeResult`/`scoreBounds`（shared）
- Produces:
  - `banWeiConfig: TestConfig` — 模块加载即 `parseTestConfig` 校验（坏配置在 import 时报错）
  - `DEFAULT_SLUG = 'ban-wei'`；`resolveConfig(search: string): TestConfig` — 解析 `?t=<slug>` 查注册表，未知/缺省回落默认（同站多测试换皮预留，验证期不换域名）
- 题库规则：8 题 × 4 选项，分值 0/1/2/3 按班味浓度递进排列；总分 0~24；5 档 minScore `0/5/10/15/20`，percentRange 相连覆盖 0~100（`[0,19][20,39][40,64][65,84][85,100]`，对齐设计文档「班味清新 <20% / 班味十级学者 >85%」）
- 文案即产品：以下题库文字是**成品**，执行时逐字照抄，不得改写、不得「优化」

- [ ] **Step 1: 写失败测试** `sites/mental-state/src/config/registry.test.ts`

```ts
import { computeResult, scoreBounds } from '@viral/shared'
import { describe, expect, it } from 'vitest'
import { banWeiConfig } from './ban-wei'
import { DEFAULT_SLUG, resolveConfig } from './registry'

describe('banWeiConfig', () => {
  it('通过 schema 校验且结构达标', () => {
    expect(banWeiConfig.meta.slug).toBe('ban-wei')
    expect(banWeiConfig.questions).toHaveLength(8)
    banWeiConfig.questions.forEach((q) => expect(q.options).toHaveLength(4))
  })

  it('每题分值 0~3 递进，总分界 0~24', () => {
    banWeiConfig.questions.forEach((q) =>
      expect(q.options.map((o) => o.score)).toEqual([0, 1, 2, 3]),
    )
    expect(scoreBounds(banWeiConfig)).toEqual({ min: 0, max: 24 })
  })

  it('五档称号与档界符合设计', () => {
    expect(banWeiConfig.scoring.tiers.map((t) => t.title)).toEqual([
      '班味清新',
      '微微入味',
      '腌制中',
      '深度腌入味',
      '班味十级学者',
    ])
    expect(banWeiConfig.scoring.tiers.map((t) => t.minScore)).toEqual([0, 5, 10, 15, 20])
  })

  it('percentRange 相连覆盖 0~100', () => {
    const ranges = banWeiConfig.scoring.tiers.map((t) => t.percentRange)
    expect(ranges[0][0]).toBe(0)
    expect(ranges[4][1]).toBe(100)
    for (let i = 1; i < ranges.length; i += 1) {
      expect(ranges[i][0]).toBe(ranges[i - 1][1] + 1)
    }
  })

  it('全选最低 → 班味清新 0%，全选最高 → 班味十级学者 100%', () => {
    const low = computeResult(banWeiConfig, [0, 0, 0, 0, 0, 0, 0, 0])
    expect(low.tier.title).toBe('班味清新')
    expect(low.percent).toBe(0)
    const high = computeResult(banWeiConfig, [3, 3, 3, 3, 3, 3, 3, 3])
    expect(high.tier.title).toBe('班味十级学者')
    expect(high.percent).toBe(100)
  })
})

describe('resolveConfig', () => {
  it('无参数回落默认题库', () =>
    expect(resolveConfig('').meta.slug).toBe(DEFAULT_SLUG))
  it('?t=ban-wei 命中', () =>
    expect(resolveConfig('?t=ban-wei').meta.slug).toBe('ban-wei'))
  it('未知 slug 回落默认（不白屏）', () =>
    expect(resolveConfig('?t=not-exist').meta.slug).toBe(DEFAULT_SLUG))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/mental-state test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/mental-state/src/config/ban-wei.ts`

```ts
import { parseTestConfig } from '@viral/shared'

// 班味浓度题库 v1 —— 文案是产品本体，改动须过「值得截图」自审
export const banWeiConfig = parseTestConfig({
  meta: {
    slug: 'ban-wei',
    title: '班味浓度检测',
    subtitle: '测测你被工位腌入味了没',
  },
  questions: [
    {
      text: '周日晚上的你，心情曲线长什么样？',
      options: [
        { text: '周日晚上？正是玩得最疯的时候', score: 0 },
        { text: '会想起明天要上班，但转头就忘了', score: 1 },
        { text: '晚饭后开始低落，刷手机到一点舍不得睡', score: 2 },
        { text: '下午三点起，胸口就压着一块名叫「周一」的大石头', score: 3 },
      ],
    },
    {
      text: '「收到」两个字，你一天要打几次？',
      options: [
        { text: '基本不打，我回消息用「好嘞」「OK👌」', score: 0 },
        { text: '群里被点名才打，一天三五次', score: 1 },
        { text: '十次往上，拇指已经形成肌肉记忆', score: 2 },
        { text: '我妈叫我回家吃饭，我回了个「收到」', score: 3 },
      ],
    },
    {
      text: '你对工位上那盆绿植的感情是？',
      options: [
        { text: '没有绿植，工位是用来下班的，不装修', score: 0 },
        { text: '有一盆多肉，心情好的时候浇浇水', score: 1 },
        { text: '每天上班先跟它问好，它是我在公司唯一的朋友', score: 2 },
        { text: '它枯死半个月我才发现——那一刻我居然共情了', score: 3 },
      ],
    },
    {
      text: '电梯门一开，里面站着老板，你会？',
      options: [
        { text: '大方打招呼，顺便聊两句昨晚的比赛', score: 0 },
        { text: '点头微笑，眼神接触不超过两秒', score: 1 },
        { text: '假装看手机看得很专注，其实屏幕是黑的', score: 2 },
        { text: '默默转身走向消防楼梯，就当锻炼身体了', score: 3 },
      ],
    },
    {
      text: '「下班后学习提升自己」，你坚持了几天？',
      options: [
        { text: '一直在坚持，下班是我的第二人生', score: 0 },
        { text: '买了课，看完了第一章，进度条停在 13%', score: 1 },
        { text: '坚持了三天，现在网课账号借给表弟考研用', score: 2 },
        { text: '学习？我在学怎么撑到发工资那天', score: 3 },
      ],
    },
    {
      text: '你的年假一般是怎么用掉的？',
      options: [
        { text: '早就规划好了，机票半年前就订了', score: 0 },
        { text: '攒着，总觉得会有更值得用的时刻', score: 1 },
        { text: '用来搬家、看病、办证——年假是拿来办事的', score: 2 },
        { text: '上次想请假，领导「嗯？」了一声，我说那算了', score: 3 },
      ],
    },
    {
      text: '工作日你的微信步数，一般是什么水平？',
      options: [
        { text: '一万步起步，下班还要去夜跑', score: 0 },
        { text: '五六千，全靠通勤硬凑', score: 1 },
        { text: '稳定两千：工位—茶水间—厕所黄金三角', score: 2 },
        { text: '800 步，系统一度以为我失踪了', score: 3 },
      ],
    },
    {
      text: '听到「团建」两个字，你的生理反应是？',
      options: [
        { text: '太好了！公费吃喝，冲！', score: 0 },
        { text: '吃饭可以，才艺表演就免了', score: 1 },
        { text: '已经开始翻日历找借口：那天我要复查智齿', score: 2 },
        { text: '瞳孔地震。周末团建等于加班，还要笑着自拍', score: 3 },
      ],
    },
  ],
  scoring: {
    mode: 'linear',
    tiers: [
      {
        minScore: 0,
        title: '班味清新',
        percentRange: [0, 19],
        comments: [
          '检测不到班味，你身上还有周末的太阳味',
          '上班对你来说只是副业，主业是生活',
          '建议同事围着你深呼吸两口，就当上过班了',
        ],
        remedy: '解药：保持住。工资是租你时间的，别把灵魂也搭进去',
      },
      {
        minScore: 5,
        title: '微微入味',
        percentRange: [20, 39],
        comments: [
          '刚腌上，还能吃出食材本来的味道',
          '你还会在周五晚上兴奋，说明神经末梢没死透',
          '偶尔说梦话「收到」，但白天还记得自己是谁',
        ],
        remedy: '解药：每周留半天不碰手机不想工作，班味靠晾晒可散',
      },
      {
        minScore: 10,
        title: '腌制中',
        percentRange: [40, 64],
        comments: [
          '入味程度：筷子插得进去，但还没腌到骨头',
          '你已经会用「对齐颗粒度」造句，且不觉得羞耻',
          '照镜子时，偶尔闪过工牌照上那个表情',
        ],
        remedy: '解药：下班路上别再听职场播客了，听歌，大声跟唱那种',
      },
      {
        minScore: 15,
        title: '深度腌入味',
        percentRange: [65, 84],
        comments: [
          '腌透了，切开全是纹路，每一道都是 OKR',
          '点外卖只看「30 分钟达」，因为午休只有 40 分钟',
          '梦里都在开周会，醒来第一反应是找会议纪要',
        ],
        remedy: '解药：请一天假，不出门不干活，专门发呆——这叫脱水回鲜',
      },
      {
        minScore: 20,
        title: '班味十级学者',
        percentRange: [85, 100],
        comments: [
          '你已经不散发班味了，你就是班味本味',
          '血液送检报告：茶多酚 3%，咖啡因 12%，KPI 85%',
          '休假第二天开始心慌，第三天主动打开工作群爬楼',
        ],
        remedy: '解药：把年假一次性用完，去一个没信号的地方，让系统重装',
      },
    ],
  },
})
```

`sites/mental-state/src/config/registry.ts`：

```ts
import type { TestConfig } from '@viral/shared'
import { banWeiConfig } from './ban-wei'

// 同站多测试预留：换皮 = 新增一份配置 + 注册一行（验证期不换域名）
const REGISTRY: Record<string, TestConfig> = {
  [banWeiConfig.meta.slug]: banWeiConfig,
}

export const DEFAULT_SLUG = 'ban-wei'

export function resolveConfig(search: string): TestConfig {
  const slug = new URLSearchParams(search).get('t')
  return (slug && REGISTRY[slug]) || REGISTRY[DEFAULT_SLUG]
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/mental-state test && pnpm --filter @viral/mental-state typecheck`
Expected: 全 PASS

- [ ] **Step 5: 「值得截图」自审（质量门禁，不可跳过）**

对照题库通读一遍，确认：8 题里至少 3 题（基准：Q2 收到、Q4 电梯、Q8 团建）单独截图发群里也好笑；若执行者判断不达标，停下来向用户报告而不是自行改文案。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(mental-state): 班味题库全量文案与多测试路由预留"
```

---

### Task 6: 落地屏 LandingScreen

**Files:**
- Create: `sites/mental-state/src/components/landing-screen.tsx`
- Test: `sites/mental-state/src/components/landing-screen.test.tsx`

**Interfaces:**
- Consumes: `TestConfig`（shared）
- Produces: `<LandingScreen config={TestConfig} onStart={() => void} />` — 标题 + 挑衅文案 + 「开始检测」按钮 + 公章装饰（签名元素）；免责声明**不在**本屏（只在 App 页脚）

- [ ] **Step 1: 写失败测试** `sites/mental-state/src/components/landing-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { banWeiConfig } from '../config/ban-wei'
import { LandingScreen } from './landing-screen'

describe('LandingScreen', () => {
  it('渲染标题/副标题/挑衅文案', () => {
    render(<LandingScreen config={banWeiConfig} onStart={() => {}} />)
    expect(screen.getByRole('heading', { name: '班味浓度检测' })).toBeInTheDocument()
    expect(screen.getByText('测测你被工位腌入味了没')).toBeInTheDocument()
    expect(screen.getByText(/8 道题 · 60 秒/)).toBeInTheDocument()
  })

  it('公章装饰存在（签名元素）', () => {
    render(<LandingScreen config={banWeiConfig} onStart={() => {}} />)
    expect(screen.getByText('检测专用章')).toBeInTheDocument()
  })

  it('点击开始触发 onStart', async () => {
    const onStart = vi.fn()
    render(<LandingScreen config={banWeiConfig} onStart={onStart} />)
    await userEvent.click(screen.getByRole('button', { name: '开始检测' }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/mental-state test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/mental-state/src/components/landing-screen.tsx`

```tsx
import type { TestConfig } from '@viral/shared'

interface Props {
  config: TestConfig
  onStart: () => void
}

export function LandingScreen({ config, onStart }: Props) {
  return (
    <section className="flex flex-col gap-6 pop-in">
      <div className="nb-card relative p-6">
        <p className="text-xs font-bold tracking-[0.3em]">精神状态检测系列 · 第 1 号</p>
        <h1 className="mt-3 text-4xl font-black leading-tight">{config.meta.title}</h1>
        <p className="mt-2 text-lg font-bold">{config.meta.subtitle}</p>
        <span className="stamp absolute -right-2 -top-4 text-xs">检测专用章</span>
      </div>
      <div className="nb-card p-5 text-sm leading-relaxed">
        <p>8 道题 · 60 秒 · 出具一份可以甩到工作群里的检测报告。</p>
        <p className="mt-2 text-xs">检测机构：班味研究所（未在任何机构注册）</p>
      </div>
      <button type="button" onClick={onStart} className="nb-btn nb-btn-primary py-4 text-lg">
        开始检测
      </button>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/mental-state test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mental-state): 落地屏与公章签名元素"
```

---

### Task 7: 答题屏 QuizScreen（一屏一题 + 进度条 + q_answered 回调）

**Files:**
- Create: `sites/mental-state/src/components/quiz-screen.tsx`
- Test: `sites/mental-state/src/components/quiz-screen.test.tsx`

**Interfaces:**
- Consumes: `TestConfig`（shared）、`banWeiConfig`（Task 5，测试用）
- Produces: `<QuizScreen config={TestConfig} onAnswer={(questionIndex: number) => void} onFinish={(answers: number[]) => void} />` — 点选即跳下一题（无返回，消除返回焦虑）；顶部细进度条 + 「第 X / 8 题」；每题触发一次 `onAnswer(index)`（App 层接埋点）；最后一题触发 `onFinish(完整答案数组)`；换题 pop-in 动效（`key` 换绑触发重挂载）

- [ ] **Step 1: 写失败测试** `sites/mental-state/src/components/quiz-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { banWeiConfig } from '../config/ban-wei'
import { QuizScreen } from './quiz-screen'

describe('QuizScreen', () => {
  it('初始渲染第一题与进度「第 1 / 8 题」', () => {
    render(<QuizScreen config={banWeiConfig} onAnswer={() => {}} onFinish={() => {}} />)
    expect(screen.getByText(banWeiConfig.questions[0].text)).toBeInTheDocument()
    expect(screen.getByText('第 1 / 8 题')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('点选即跳下一题，进度更新，onAnswer 带题目下标', async () => {
    const onAnswer = vi.fn()
    render(<QuizScreen config={banWeiConfig} onAnswer={onAnswer} onFinish={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: banWeiConfig.questions[0].options[2].text }))
    expect(onAnswer).toHaveBeenCalledWith(0)
    expect(screen.getByText(banWeiConfig.questions[1].text)).toBeInTheDocument()
    expect(screen.getByText('第 2 / 8 题')).toBeInTheDocument()
  })

  it('答完 8 题触发 onFinish 且答案按序收集', async () => {
    const onFinish = vi.fn()
    render(<QuizScreen config={banWeiConfig} onAnswer={() => {}} onFinish={onFinish} />)
    const picks = [0, 1, 2, 3, 0, 1, 2, 3]
    for (const pick of picks) {
      const question = screen.getByText(/^.+？$/, { selector: 'h2' })
      expect(question).toBeInTheDocument()
      await userEvent.click(screen.getAllByRole('button')[pick])
    }
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledWith(picks)
  })

  it('答到最后一题前不触发 onFinish', async () => {
    const onFinish = vi.fn()
    render(<QuizScreen config={banWeiConfig} onAnswer={() => {}} onFinish={onFinish} />)
    for (let i = 0; i < 7; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    expect(onFinish).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/mental-state test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/mental-state/src/components/quiz-screen.tsx`

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
      <div className="h-3 border-2 border-[#111111] bg-white" aria-hidden="true">
        <div
          className="h-full bg-[#111111]"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>
      <p className="text-xs font-bold">第 {index + 1} / {questions.length} 题</p>
      <div key={index} className="pop-in flex flex-col gap-4">
        <h2 className="nb-card p-5 text-xl font-black leading-snug">{question.text}</h2>
        <ul className="flex flex-col gap-3">
          {question.options.map((option, i) => (
            <li key={option.text}>
              <button
                type="button"
                onClick={() => handlePick(i)}
                className="nb-btn w-full px-4 py-3 text-left text-base leading-snug"
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

Run: `pnpm --filter @viral/mental-state test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mental-state): 一屏一题答题屏与进度条"
```

---

### Task 8: 报告屏 ReportScreen

**Files:**
- Create: `sites/mental-state/src/components/report-screen.tsx`
- Test: `sites/mental-state/src/components/report-screen.test.tsx`

**Interfaces:**
- Consumes: `QuizResult`/`TestConfig`（shared）、`banWeiConfig`（测试造数）
- Produces: `<ReportScreen config={TestConfig} result={QuizResult} onRestart={() => void}>{children}</ReportScreen>` — 检测报告版式：抬头 + 「检测完毕」公章 + 浓度大数字 + 称号高亮块 + 3 条锐评 + 1 条解药 + `children` 插槽（App 注入 SaveCardButton，本组件不依赖它）+ 「再测一次」

- [ ] **Step 1: 写失败测试** `sites/mental-state/src/components/report-screen.test.tsx`

```tsx
import { computeResult } from '@viral/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { banWeiConfig } from '../config/ban-wei'
import { ReportScreen } from './report-screen'

const HIGH = computeResult(banWeiConfig, [3, 3, 3, 3, 3, 3, 3, 3]) // 24 分 → 班味十级学者 100%

describe('ReportScreen', () => {
  it('渲染浓度大数字与称号', () => {
    render(<ReportScreen config={banWeiConfig} result={HIGH} onRestart={() => {}} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('班味十级学者')).toBeInTheDocument()
  })

  it('渲染 3 条锐评与解药', () => {
    render(<ReportScreen config={banWeiConfig} result={HIGH} onRestart={() => {}} />)
    for (const comment of HIGH.tier.comments) {
      expect(screen.getByText(comment)).toBeInTheDocument()
    }
    expect(screen.getByText(HIGH.tier.remedy)).toBeInTheDocument()
  })

  it('公章「检测完毕」存在（签名元素）', () => {
    render(<ReportScreen config={banWeiConfig} result={HIGH} onRestart={() => {}} />)
    expect(screen.getByText('检测完毕')).toBeInTheDocument()
  })

  it('children 插槽渲染，再测一次触发 onRestart', async () => {
    const onRestart = vi.fn()
    render(
      <ReportScreen config={banWeiConfig} result={HIGH} onRestart={onRestart}>
        <button type="button">保存检测报告</button>
      </ReportScreen>,
    )
    expect(screen.getByRole('button', { name: '保存检测报告' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '再测一次' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/mental-state test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/mental-state/src/components/report-screen.tsx`

```tsx
import type { ReactNode } from 'react'
import type { QuizResult, TestConfig } from '@viral/shared'

interface Props {
  config: TestConfig
  result: QuizResult
  onRestart: () => void
  children?: ReactNode
}

export function ReportScreen({ config, result, onRestart, children }: Props) {
  return (
    <section className="pop-in flex flex-col gap-5">
      <header className="nb-card relative p-5">
        <p className="text-sm font-black tracking-[0.2em]">精神状态检测报告</p>
        <p className="mt-1 text-xs">
          检测项目：{config.meta.title} · 样本编号：BW-{String(result.score).padStart(2, '0')}
        </p>
        <span className="stamp absolute -right-2 -top-4 text-xs">检测完毕</span>
      </header>
      <div className="nb-card p-6 text-center">
        <p className="text-sm font-bold">你的班味浓度</p>
        <p className="mt-1 text-7xl font-black tabular-nums">{result.percent}%</p>
        <p className="mt-4 inline-block border-[3px] border-[#111111] bg-[#EFFF00] px-4 py-1 text-2xl font-black">
          {result.tier.title}
        </p>
      </div>
      <ul className="nb-card flex flex-col gap-3 p-5 text-base leading-relaxed">
        {result.tier.comments.map((comment) => (
          <li key={comment}>{comment}</li>
        ))}
      </ul>
      <div className="nb-card p-5 text-base leading-relaxed">
        <p>{result.tier.remedy}</p>
      </div>
      <div className="flex flex-col gap-3">
        {children}
        <button type="button" onClick={onRestart} className="py-2 text-sm font-bold underline">
          再测一次
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/mental-state test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mental-state): 检测报告屏"
```

---

### Task 9: 分享卡片绘制 draw-report-card（含公章 + 骑缝章）

**Files:**
- Create: `sites/mental-state/src/card/draw-report-card.ts`
- Test: `sites/mental-state/src/card/draw-report-card.test.ts`

**Interfaces:**
- Consumes: `DrawFn`/`wrapByLength`（shared）、`QuizResult`/`TestConfig`（shared）
- Produces: `makeReportCardDraw(config: TestConfig, result: QuizResult): DrawFn` — 1080×1440：荧光黄底 → 白卡 + 20px 右下硬阴影 + 10px 黑描边 → 报告抬头 → 浓度大数字 → 称号黄块 → 3 锐评 + 解药（`wrapByLength` 22 字/行）→ 公章（右下，故意压在文字上，公章本就该盖在字上）→ 骑缝章（卡左缘半圆出血）→ 墨黑品牌条「班味浓度检测 · viral-sites」

- [ ] **Step 1: 写失败测试** `sites/mental-state/src/card/draw-report-card.test.ts`

```ts
import { computeResult } from '@viral/shared'
import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'
import { banWeiConfig } from '../config/ban-wei'
import { makeReportCardDraw } from './draw-report-card'

const result = computeResult(banWeiConfig, [3, 3, 3, 3, 3, 3, 3, 3])

function fakeCtx() {
  return {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

describe('makeReportCardDraw', () => {
  it('文字包含抬头/大数字/称号/品牌条', () => {
    const ctx = fakeCtx()
    makeReportCardDraw(banWeiConfig, result)(ctx, { width: 1080, height: 1440 })
    const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('精神状态检测报告')
    expect(texts).toContain('100%')
    expect(texts).toContain('班味十级学者')
    expect(texts).toContain('班味浓度检测 · viral-sites')
  })

  it('锐评与解药逐行绘制（换行后仍完整覆盖原文）', () => {
    const ctx = fakeCtx()
    makeReportCardDraw(banWeiConfig, result)(ctx, { width: 1080, height: 1440 })
    const joined = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join('')
    for (const comment of result.tier.comments) {
      expect(joined).toContain(comment)
    }
    expect(joined).toContain(result.tier.remedy)
  })

  it('公章 + 骑缝章：arc 恰好两次且带旋转', () => {
    const ctx = fakeCtx()
    makeReportCardDraw(banWeiConfig, result)(ctx, { width: 1080, height: 1440 })
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2)
    expect(ctx.rotate).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/mental-state test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/mental-state/src/card/draw-report-card.ts`

```ts
import { wrapByLength, type DrawFn, type QuizResult, type TestConfig } from '@viral/shared'

const INK = '#111111'
const YELLOW = '#EFFF00'
const WHITE = '#ffffff'
const BRAND_TEXT = '班味浓度检测 · viral-sites'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const CHARS_PER_LINE = 22

function drawStamp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  text: string,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-Math.PI / 14)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.lineWidth = 8
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.font = `900 ${Math.round(r * 0.3)}px ${FONT}`
  ctx.fillText(text, 0, r * 0.12)
  ctx.restore()
}

export function makeReportCardDraw(config: TestConfig, result: QuizResult): DrawFn {
  return (ctx, size) => {
    // 荧光黄底
    ctx.fillStyle = YELLOW
    ctx.fillRect(0, 0, size.width, size.height)

    // 白卡 + 右下硬阴影 + 粗黑描边
    const card = { x: 60, y: 80, w: size.width - 120, h: size.height - 260 }
    ctx.fillStyle = INK
    ctx.fillRect(card.x + 20, card.y + 20, card.w, card.h)
    ctx.fillStyle = WHITE
    ctx.fillRect(card.x, card.y, card.w, card.h)
    ctx.lineWidth = 10
    ctx.strokeStyle = INK
    ctx.strokeRect(card.x, card.y, card.w, card.h)

    // 报告抬头
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.font = `900 72px ${FONT}`
    ctx.fillText('精神状态检测报告', size.width / 2, card.y + 130)
    ctx.font = `400 32px ${FONT}`
    ctx.fillText(
      `检测项目：${config.meta.title} · 样本编号：BW-${String(result.score).padStart(2, '0')}`,
      size.width / 2,
      card.y + 190,
    )

    // 浓度大数字
    ctx.font = `900 210px ${FONT}`
    ctx.fillText(`${result.percent}%`, size.width / 2, card.y + 420)

    // 称号：荧光黄块 + 黑描边
    const badge = { w: 600, h: 96 }
    const badgeX = (size.width - badge.w) / 2
    const badgeY = card.y + 470
    ctx.fillStyle = YELLOW
    ctx.fillRect(badgeX, badgeY, badge.w, badge.h)
    ctx.lineWidth = 6
    ctx.strokeRect(badgeX, badgeY, badge.w, badge.h)
    ctx.fillStyle = INK
    ctx.font = `900 56px ${FONT}`
    ctx.fillText(result.tier.title, size.width / 2, badgeY + 66)

    // 3 条锐评 + 解药（左对齐逐行绘制）
    ctx.textAlign = 'left'
    let y = badgeY + 190
    for (const comment of result.tier.comments) {
      ctx.font = `400 36px ${FONT}`
      for (const line of wrapByLength(comment, CHARS_PER_LINE)) {
        ctx.fillText(line, card.x + 60, y)
        y += 52
      }
      y += 14
    }
    y += 10
    ctx.font = `900 36px ${FONT}`
    for (const line of wrapByLength(result.tier.remedy, CHARS_PER_LINE)) {
      ctx.fillText(line, card.x + 60, y)
      y += 52
    }

    // 公章（右下，压在文字上——公章本就该盖在字上）+ 骑缝章（左缘半圆出血）
    drawStamp(ctx, card.x + card.w - 200, card.y + card.h - 190, 130, '检测专用章')
    drawStamp(ctx, card.x, card.y + 320, 90, '骑缝')

    // 品牌条
    ctx.fillStyle = INK
    ctx.fillRect(0, size.height - 110, size.width, 110)
    ctx.fillStyle = YELLOW
    ctx.textAlign = 'center'
    ctx.font = `700 40px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 42)
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/mental-state test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mental-state): 检测报告分享卡片绘制（公章+骑缝章）"
```

---

### Task 10: SaveCardButton + LongPressOverlay（双路径保存）

**Files:**
- Create: `sites/mental-state/src/components/save-card-button.tsx`, `sites/mental-state/src/components/long-press-overlay.tsx`
- Test: `sites/mental-state/src/components/save-card-button.test.tsx`

**Interfaces:**
- Consumes: `renderCard`/`saveCard`/`track`（shared）、`makeReportCardDraw`（Task 9）
- Produces: `<SaveCardButton config={TestConfig} result={QuizResult} />` — 点击：`renderCard` → `saveCard`；成功 `track('save_image', { slug })`；long-press 策略弹 `<LongPressOverlay dataUrl onClose />`；异常 `track('export_error', { slug })` 并提示「保存失败了，直接截图也一样」

- [ ] **Step 1: 写失败测试** `sites/mental-state/src/components/save-card-button.test.tsx`

```tsx
import { computeResult } from '@viral/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { banWeiConfig } from '../config/ban-wei'
import { SaveCardButton } from './save-card-button'

const result = computeResult(banWeiConfig, [2, 2, 2, 2, 2, 2, 2, 2])

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
    render(<SaveCardButton config={banWeiConfig} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: '保存检测报告' }))
    expect(umamiSpy).toHaveBeenCalledWith('save_image', { slug: 'ban-wei' })
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton config={banWeiConfig} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: '保存检测报告' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton config={banWeiConfig} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: '保存检测报告' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', { slug: 'ban-wei' })
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/mental-state test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/mental-state/src/components/long-press-overlay.tsx`：

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
      <img src={dataUrl} alt="班味检测报告卡片" className="max-h-[70vh] w-auto border-[3px] border-white" />
      <p className="text-sm font-bold text-white">长按图片保存</p>
      <p className="text-xs text-white/60">点击空白处关闭</p>
    </div>
  )
}
```

`sites/mental-state/src/components/save-card-button.tsx`：

```tsx
import { useState } from 'react'
import { renderCard, saveCard, track, type QuizResult, type TestConfig } from '@viral/shared'
import { makeReportCardDraw } from '../card/draw-report-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  config: TestConfig
  result: QuizResult
}

export function SaveCardButton({ config, result }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeReportCardDraw(config, result))
      saveCard(canvas, {
        filename: `${config.meta.slug}-report.png`,
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
      <button type="button" onClick={handleSave} className="nb-btn nb-btn-primary py-4 text-lg">
        保存检测报告
      </button>
      {failed && <p className="text-center text-sm font-bold">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/mental-state test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mental-state): 卡片双路径保存与降级提示"
```

---

### Task 11: App 组装（三屏状态机 + generate / q_answered 埋点 + 页脚免责）

**Files:**
- Modify: `sites/mental-state/src/app.tsx`
- Test: `sites/mental-state/src/app.test.tsx`

**Interfaces:**
- Consumes: `LandingScreen`（6）、`QuizScreen`（7）、`ReportScreen`（8）、`SaveCardButton`（10）、`computeResult`/`track`（shared）、`resolveConfig`（5）
- Produces: `<App />` — `{ screen: 'landing' } | { screen: 'quiz' } | { screen: 'report'; result: QuizResult }` 状态机；答每题 `track('q_answered', { slug, q: 题号 1~8 })`；答完 `track('generate', { slug, score })`；页脚免责声明**全站唯一一处**；`window.location.search` 只在 App 初始化读一次（组装层，纯函数层禁取全局）

- [ ] **Step 1: 写失败测试** `sites/mental-state/src/app.test.tsx`

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

  it('完整流程：落地 → 8 题 → 报告，埋点齐全', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '开始检测' }))
    for (let i = 0; i < 8; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    expect(screen.getByText('你的班味浓度')).toBeInTheDocument()
    expect(screen.getByText('班味清新')).toBeInTheDocument() // 全选第一项 = 0 分
    const events = umamiSpy.mock.calls.map((c) => c[0])
    expect(events.filter((e) => e === 'q_answered')).toHaveLength(8)
    expect(umamiSpy).toHaveBeenCalledWith('q_answered', { slug: 'ban-wei', q: 1 })
    expect(umamiSpy).toHaveBeenCalledWith('generate', { slug: 'ban-wei', score: 0 })
  })

  it('再测一次回落地屏', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '开始检测' }))
    for (let i = 0; i < 8; i += 1) {
      await userEvent.click(screen.getAllByRole('button')[0])
    }
    await userEvent.click(screen.getByRole('button', { name: '再测一次' }))
    expect(screen.getByRole('button', { name: '开始检测' })).toBeInTheDocument()
  })

  it('免责声明常驻页脚且全站仅此一处', () => {
    render(<App />)
    expect(screen.getByText(/测试纯属玩梗/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/mental-state test`
Expected: FAIL（app.tsx 还是占位）

- [ ] **Step 3: 实现** `sites/mental-state/src/app.tsx`（整文件替换）

```tsx
import { useState } from 'react'
import { computeResult, track, type QuizResult } from '@viral/shared'
import { resolveConfig } from './config/registry'
import { LandingScreen } from './components/landing-screen'
import { QuizScreen } from './components/quiz-screen'
import { ReportScreen } from './components/report-screen'
import { SaveCardButton } from './components/save-card-button'

type Screen = { screen: 'landing' } | { screen: 'quiz' } | { screen: 'report'; result: QuizResult }

export function App() {
  // window.location.search 只允许在这一处组装层读取
  const [config] = useState(() => resolveConfig(window.location.search))
  const [state, setState] = useState<Screen>({ screen: 'landing' })

  const handleFinish = (answers: number[]) => {
    const result = computeResult(config, answers)
    track('generate', { slug: config.meta.slug, score: result.score })
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
      <footer className="pt-8 text-center text-xs leading-relaxed">
        测试纯属玩梗，不构成任何建议 · 所有计算在本地完成，答案不会被上传
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + 全仓核验**

Run: `pnpm -r test && pnpm -r typecheck && pnpm --filter @viral/mental-state build`
Expected: 全 PASS（含 life-grid 既有测试不回归），构建成功

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mental-state): App 三屏状态机与完测率埋点"
```

---

### Task 12: 上线准备（体积核验为止；部署列手工步骤）

**Files:**
- Modify: `sites/mental-state/index.html`（umami website-id，手工步骤内）、`README.md`（路线图状态，若有 02 行）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: 体积预算核验（本计划执行边界到此为止）**

Run: `pnpm --filter @viral/mental-state build`
查看 vite 输出 gzip 列：JS + CSS gzip 合计须 < 100KB（React 19 + zod ≈ 60KB 量级，超了先 `pnpm --filter @viral/mental-state list --depth 0` 查是否混入多余依赖）。

- [ ] **Step 2: 本地手机真机冒烟**

Run: `pnpm --filter @viral/mental-state dev --host`
手机连同一 Wi-Fi 打开 `http://<局域网IP>:5173`，走一遍 落地 → 8 题 → 报告 → 保存；顺手核对：题目在一屏内放得下、荧光黄底上文字对比度可读。

- [ ] **Step 3: 【手工·需用户】创建 umami 站点**

在 umami 后台 Add website（mental-state）→ 拿到 website-id → 替换 `sites/mental-state/index.html` 里的 `TO_BE_FILLED`。此步骤需要用户账号，执行者停下来向用户要。

- [ ] **Step 4: 【手工·需用户】部署 Cloudflare Pages**

```bash
pnpm dlx wrangler login
pnpm dlx wrangler pages project create mental-state --production-branch main
pnpm --filter @viral/mental-state build
pnpm dlx wrangler pages deploy sites/mental-state/dist --project-name mental-state
```

产出 `https://mental-state.pages.dev`。

- [ ] **Step 5: 【手工·需用户】四环境验收**

- [ ] iPhone 微信内打开 → 长按路径，图能存相册
- [ ] 安卓微信内打开 → 同上
- [ ] iOS Safari → 长按路径
- [ ] 桌面 Chrome → 直接下载
- [ ] umami 后台能看到 pageview / q_answered / generate / save_image 四类事件，且 q_answered 可按 q 分组看流失

- [ ] **Step 6: 更新 README 状态并提交推送**

README 路线图表中 02 行状态改为 `🚀 已上线（mental-state.pages.dev）`。

```bash
git add -A && git commit -m "chore: mental-state 上线，更新状态与 umami 配置" && git push
```

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §4 引擎/配置分离与计分规则（Task 1/2，引擎位置修正为 shared 已在 Architecture 注明）、§5 班味 8 题全部题目方向逐一落成文（Task 5）、§6 三屏流程与轻快动效（Task 6/7/8）、§4+§5 分档 5 档 × 3 锐评 + 解药全部成文（Task 5）、档内线性映射（Task 2 percentInTier）、§7 卡片走 shared/1080×1440（Task 9/10）、§7 埋点四事件含 q_answered 完测率（Task 10/11）、§7 路由预留 ?t=（Task 5 registry）、§8 计分边界单测/zod 校验/手工验收（Task 1/2/5/12）、§9 风险中「8 题至少 3 题想截图」自审落为 Task 5 Step 5 门禁。未纳入：换皮主题池（恋爱脑等，设计文档明确「每个主题独立评估，不预先承诺」）。
- **占位符扫描**：无 TBD/TODO/「适当处理」；`TO_BE_FILLED` 为 umami 接入的既定占位值（life-grid 同款约定），在 Task 12 手工步骤替换，非未完成项；Task 12 手工步骤均已标注【手工·需用户】。
- **类型一致性**：`TestConfig`/`QuizTier`/`QuizResult`（Task 1/2 定义，5/6/7/8/9/10/11 消费）、`assertAnswers` 导出供 12 计划 tags 计分复用、`DrawFn`（shared 既有，Task 9 消费）、`wrapByLength(text, maxChars): string[]`（Task 3 定义，Task 9 与 12 计划考卷卡消费）签名逐一核对一致；`track(event, data?: Record<string, string | number>)` 与 shared 现网签名一致（slug: string、q/score: number 合法）。





