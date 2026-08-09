# 拒绝话术生成器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 上线站点 11「拒绝话术生成器」（A 级，纯前端模板库）：场景九宫格 → 语气胶囊 → 3 条候选话术，一键复制 + 保存「今日拒绝语录」卡；同时把可复用的话术模板引擎沉淀进 `@viral/shared`。

**Architecture:** 话术模板引擎（模板渲染 + `{对方称呼}` 变量替换 + 文案库 zod schema + 矩阵完整性 lint 纯函数）放 `packages/shared/src/phrase/`——后续站点 14 道歉信会复用；话术内容矩阵（8 场景 × 5 语气 × 3 条 = 120 条）是本站独有资产，留在 `sites/refusal-generator/src/configs/`。UI 三段式 `SceneGrid → TonePicker → PhraseList`，全部展示组件无副作用，复制/保存的 DOM 副作用隔离在 `copy-text.ts` 与 `SaveQuoteButton`。卡片按语气分发三种皮（Bento 标准皮 / 文言文竖排仿古皮 / 发疯文学高饱和 meme 皮）。TDD：每个纯函数与组件先写失败测试。

**Tech Stack:** pnpm workspace · Vite + React 19 + TypeScript(strict) + Tailwind v4 · Vitest + Testing Library(jsdom) · zod（仅 shared 的 schema/lint 模块）· Cloudflare Pages · umami（自托管 u.js + `_worker.js` 同源代理）

## Global Constraints

（来自 [11-refusal-generator.md](../11-refusal-generator.md)、[00-factory-design.md](../00-factory-design.md)、[00a-style-map.md](../00a-style-map.md) 与 life-grid 实施验证，所有任务默认遵守）

- 站点目录 `sites/refusal-generator`，包名 `@viral/refusal-generator`；站点只允许依赖 `@viral/shared`；包管理只用 pnpm，测试命令统一 `pnpm --filter <pkg> test`
- 工程约定与 life-grid 对齐：vitest@^3 + `globals: true` + `setupFiles: ['./test/setup.ts']`；`@testing-library/jest-dom@^6`；组件测试用 `test/canvas-stub.ts`（从 life-grid 复制）；tsconfig extends `../../tsconfig.base.json`
- `public/_worker.js` 与 `public/u.js` 从 `sites/life-grid/public/` 用 cp 复制，不改内容；`index.html` 用同款自托管 umami（`/u.js` + `data-host-url="/"` 同源上报），`data-website-id` 先置 `TO_BE_FILLED`，Task 11 手工步骤替换后才可部署；favicon 按 Bento 风新写 SVG
- 首屏 gzip < 100KB；不引 UI 组件库、日期库、webfont（仿古皮用系统衬线字族 `Songti SC / Noto Serif SC` 兜底）；zod 只允许被 shared 的 `phrase/schema.ts`、`phrase/lint.ts` 引用，站点运行时对 `Phrase` 只做 type-only import，Task 11 核验 zod 未混入 bundle
- 埋点（本站特殊口径）：`visit` = umami pageview 自带；`generate`（出话术）；**`copy`（本站核心指标，复制率 = copy / visit，生死线 15%）**；`save_image`（保存卡片）；`scene_selected` / `tone_selected`（矩阵热力，决定 v1.1 扩展方向）；`export_error`（卡片导出失败）。事件 data 只带 scene/tone 的 id，**绝不带用户输入的称呼**（隐私）
- 复制按钮：`navigator.clipboard.writeText` 优先，`document.execCommand('copy')` 降级（微信内置浏览器兼容）；封装成两层——纯编排层 `copyText` + DOM 层 `copyViaExecCommand`，两层均可单测
- 分享卡片：走 shared `renderCard`/`saveCard`，固定 1080×1440；「今日拒绝语录」卡按语气换皮：`wenyan`（文言文）→ 竖排仿古皮、`fafeng`（发疯文学）→ 高饱和 meme 皮、其余三档 → Bento 标准皮；**三种皮的绘制函数都要写全**，不留虚设分支
- 视觉按 00a「便当盒 Bento」，签名元素 = 场景九宫格拼盘（8 场景格 + 1 许愿格），卡片尺寸要有节奏（3 列 12 单元：3 个 2×1 + 6 个 1×1 混排，不全等分）；签名元素同样以「九格色块条」出现在所有分享卡片品牌条上。完整色板：
  - 页面基底：冷灰白底 `#f2f3f5` / 卡面白 `#ffffff` / 描边 `#e5e7eb` / 墨字 `#1f2937` / 次级灰 `#6b7280` / 弱灰 `#9ca3af`
  - 场景色（一场景一格色）：被借钱 `#0d9488` / 被拉群砍价 `#ea580c` / 被安排相亲 `#db2777` / 被叫周末加班 `#2563eb` / 被推销办卡 `#7c3aed` / 被要份子钱 `#dc2626` / 被要求帮忙搬家 `#d97706` / 被拉去团建 `#16a34a`
  - 仿古皮：纸 `#f5eeda` / 墨 `#2b2620` / 印泥红 `#b3352c`；发疯皮：荧光黄 `#ffe600` / 墨黑 `#111111` / 洋红 `#ff3d7f`
- 话术内容资产（本站唯一壁垒）：8 场景 × 5 语气 × 每组 3 条 = 120 条全部成文；单条 ≤80 字；占位符仅允许 `{对方称呼}`；除发疯文学档（定位 = 解压看的）外每条过「敢真的发出去」测试；构建期 lint（矩阵 40 组无空洞、每组 ≥3、字数上限、占位符语法合法）接进 build 命令，lint 不过则 build 失败
- 模板变量规则：称呼空值/纯空白 → 默认「亲」；trim 后超过 12 字截断前 12 字（按 code point）；特殊字符原样替换不转义
- 免责/定位声明只放页脚；首页第 9 格「想拒绝别的？」许愿入口用 `mailto:afu886.cn@gmail.com` 实现
- 不可变数据风格：更新对象一律返回新副本，不原地修改；组件状态用 setState 函数式更新
- 提交信息用 conventional commits（feat/fix/test/chore/docs），不加 Co-Authored-By

**文件全景**（Create/Modify 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
packages/shared/
  package.json                          # Modify：加 zod 依赖
  src/index.ts                          # Modify：追加 phrase 导出
  src/phrase/template.ts (+test)        # 模板变量替换纯函数（14 道歉信复用）
  src/phrase/schema.ts (+test)          # 文案库 zod schema
  src/phrase/lint.ts (+test)            # 矩阵完整性 lint 纯函数
sites/refusal-generator/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  public/_worker.js  public/u.js        # cp 自 sites/life-grid/public/
  public/favicon.svg                    # Bento 九格拼盘，新写
  test/setup.ts
  test/canvas-stub.ts                   # cp 自 sites/life-grid/test/
  src/main.tsx  src/index.css  src/app.tsx (+test)
  src/configs/scenes.ts                 # 8 场景：id/label/icon/色/span
  src/configs/tones.ts                  # 5 语气
  src/configs/phrases.ts                # 120 条话术矩阵（内容资产）
  src/configs/phrases.lint.test.ts      # 构建期完整性 lint（接进 build 命令）
  src/lib/copy-text.ts (+test)          # 剪贴板双层封装
  src/lib/pick-batch.ts (+test)         # 换一批批次纯函数
  src/components/scene-grid.tsx (+test) # 签名元素：场景九宫格拼盘
  src/components/tone-picker.tsx (+test)
  src/components/phrase-list.tsx (+test) # 称呼输入 + 复制 + generate/copy 埋点
  src/components/save-quote-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-quote-card.ts (+test)   # 三种卡片皮 + wrapByLength
README.md                              # Modify（Task 11）：11 移入已上线
```

---

### Task 1: shared/phrase 模板变量替换 renderTemplate

**Files:**
- Create: `packages/shared/src/phrase/template.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/phrase/template.test.ts`

**Interfaces:**
- Produces:
  - `const PLACEHOLDER_ADDRESSEE = '{对方称呼}'`、`const DEFAULT_ADDRESSEE = '亲'`、`const ADDRESSEE_MAX_LENGTH = 12`
  - `normalizeAddressee(raw?: string): string` — undefined/空串/纯空白 → `'亲'`；trim；按 code point 截断前 12 字
  - `hasAddresseePlaceholder(template: string): boolean`
  - `renderTemplate(template: string, addressee?: string): string` — 替换**全部** `{对方称呼}`；特殊字符原样；无占位符时原文返回

- [ ] **Step 1: 写失败测试** `packages/shared/src/phrase/template.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  ADDRESSEE_MAX_LENGTH,
  hasAddresseePlaceholder,
  normalizeAddressee,
  renderTemplate,
} from './template'

describe('normalizeAddressee', () => {
  it('undefined → 默认「亲」', () => expect(normalizeAddressee()).toBe('亲'))
  it('空串 → 默认「亲」', () => expect(normalizeAddressee('')).toBe('亲'))
  it('纯空白 → 默认「亲」', () => expect(normalizeAddressee('  \t ')).toBe('亲'))
  it('两端空白被 trim', () => expect(normalizeAddressee(' 王总 ')).toBe('王总'))
  it('超过 12 字截断前 12 字', () => {
    expect(normalizeAddressee('尊敬的王总经理大人阁下您好呀')).toBe('尊敬的王总经理大人阁下您')
    expect(normalizeAddressee('尊敬的王总经理大人阁下您好呀')).toHaveLength(ADDRESSEE_MAX_LENGTH)
  })
  it('按 code point 截断，emoji 不被劈成半个', () => {
    expect(normalizeAddressee('😀'.repeat(13))).toBe('😀'.repeat(12))
  })
})

describe('renderTemplate', () => {
  it('基本替换', () => {
    expect(renderTemplate('{对方称呼}，这事我帮不上', '王总')).toBe('王总，这事我帮不上')
  })
  it('多处占位符全部替换', () => {
    expect(renderTemplate('{对方称呼}好，{对方称呼}再见', '哥')).toBe('哥好，哥再见')
  })
  it('未填称呼用默认「亲」', () => {
    expect(renderTemplate('{对方称呼}，不好意思')).toBe('亲，不好意思')
  })
  it('特殊字符原样替换，不转义', () => {
    expect(renderTemplate('{对方称呼}你好', '<b>老板&大人</b>')).toBe('<b>老板&大人</b>你好')
  })
  it('无占位符时原文返回', () => {
    expect(renderTemplate('不借。', '王总')).toBe('不借。')
  })
})

describe('hasAddresseePlaceholder', () => {
  it('含占位符 → true', () => expect(hasAddresseePlaceholder('{对方称呼}，你好')).toBe(true))
  it('不含 → false', () => expect(hasAddresseePlaceholder('不借。')).toBe(false))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL（template 模块不存在）

- [ ] **Step 3: 实现** `packages/shared/src/phrase/template.ts`

```ts
export const PLACEHOLDER_ADDRESSEE = '{对方称呼}'
export const DEFAULT_ADDRESSEE = '亲'
export const ADDRESSEE_MAX_LENGTH = 12

export function normalizeAddressee(raw?: string): string {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return DEFAULT_ADDRESSEE
  return [...trimmed].slice(0, ADDRESSEE_MAX_LENGTH).join('')
}

export function hasAddresseePlaceholder(template: string): boolean {
  return template.includes(PLACEHOLDER_ADDRESSEE)
}

export function renderTemplate(template: string, addressee?: string): string {
  return template.split(PLACEHOLDER_ADDRESSEE).join(normalizeAddressee(addressee))
}
```

（`split/join` 天然替换全部出现且不解释替换串里的 `$` 等正则特殊符号，满足「特殊字符原样」。）

`packages/shared/src/index.ts` 追加：

```ts
export {
  ADDRESSEE_MAX_LENGTH,
  DEFAULT_ADDRESSEE,
  PLACEHOLDER_ADDRESSEE,
  hasAddresseePlaceholder,
  normalizeAddressee,
  renderTemplate,
} from './phrase/template'
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): phrase 模板变量替换 renderTemplate"
```

---

### Task 2: shared/phrase 文案库 zod schema + 矩阵完整性 lint

**Files:**
- Create: `packages/shared/src/phrase/schema.ts`, `packages/shared/src/phrase/lint.ts`
- Modify: `packages/shared/src/index.ts`, `packages/shared/package.json`（zod 依赖）
- Test: `packages/shared/src/phrase/schema.test.ts`, `packages/shared/src/phrase/lint.test.ts`

**Interfaces:**
- Produces:
  - `phraseSchema` / `phraseLibrarySchema`（zod）；`type Phrase = { scene: string; tone: string; text: string }`（`z.infer` 导出，站点 type-only import）
  - `interface PhraseLintConfig { sceneIds: readonly string[]; toneIds: readonly string[]; minPerGroup: number; maxTextLength: number; allowedPlaceholders: readonly string[] }`
  - `interface PhraseLintIssue { code: 'unknown-scene' | 'unknown-tone' | 'group-too-small' | 'text-too-long' | 'illegal-placeholder'; message: string }`
  - `lintPhraseLibrary(phrases: readonly Phrase[], config: PhraseLintConfig): PhraseLintIssue[]` — 空数组即通过
- 约束：zod 只在这两个模块出现；lint 是纯函数，不做 IO

- [ ] **Step 1: 装依赖**

Run: `pnpm --filter @viral/shared add zod`
Expected: `packages/shared/package.json` 的 dependencies 出现 `zod`

- [ ] **Step 2: 写失败测试**

`packages/shared/src/phrase/schema.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { phraseLibrarySchema, phraseSchema } from './schema'

describe('phraseSchema', () => {
  it('合法条目通过', () => {
    expect(() =>
      phraseSchema.parse({ scene: 'jieqian', tone: 'weiwan', text: '不借。' }),
    ).not.toThrow()
  })
  it('空 text 拒绝', () => {
    expect(() => phraseSchema.parse({ scene: 'a', tone: 'b', text: '' })).toThrow()
  })
  it('超过 80 字拒绝', () => {
    expect(() =>
      phraseSchema.parse({ scene: 'a', tone: 'b', text: '啊'.repeat(81) }),
    ).toThrow()
  })
  it('恰好 80 字放行', () => {
    expect(() =>
      phraseSchema.parse({ scene: 'a', tone: 'b', text: '啊'.repeat(80) }),
    ).not.toThrow()
  })
})

describe('phraseLibrarySchema', () => {
  it('数组整体校验', () => {
    expect(() =>
      phraseLibrarySchema.parse([{ scene: 'a', tone: 'b', text: '好' }]),
    ).not.toThrow()
    expect(() => phraseLibrarySchema.parse({ not: 'array' })).toThrow()
  })
})
```

`packages/shared/src/phrase/lint.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import type { Phrase } from './schema'
import { lintPhraseLibrary, type PhraseLintConfig } from './lint'

const config: PhraseLintConfig = {
  sceneIds: ['s1', 's2'],
  toneIds: ['t1'],
  minPerGroup: 2,
  maxTextLength: 80,
  allowedPlaceholders: ['对方称呼'],
}

const full: Phrase[] = [
  { scene: 's1', tone: 't1', text: '第一条' },
  { scene: 's1', tone: 't1', text: '{对方称呼}，第二条' },
  { scene: 's2', tone: 't1', text: '第三条' },
  { scene: 's2', tone: 't1', text: '第四条' },
]

describe('lintPhraseLibrary', () => {
  it('完整矩阵零问题', () => {
    expect(lintPhraseLibrary(full, config)).toEqual([])
  })

  it('整组缺失 → group-too-small', () => {
    const issues = lintPhraseLibrary(full.slice(0, 2), config)
    expect(issues.map((i) => i.code)).toContain('group-too-small')
    expect(issues.some((i) => i.message.includes('s2'))).toBe(true)
  })

  it('某组数量不足 → group-too-small', () => {
    const issues = lintPhraseLibrary(full.slice(0, 3), config)
    expect(issues.filter((i) => i.code === 'group-too-small')).toHaveLength(1)
  })

  it('超长文案 → text-too-long', () => {
    const issues = lintPhraseLibrary(
      [...full, { scene: 's1', tone: 't1', text: '长'.repeat(81) }],
      config,
    )
    expect(issues.map((i) => i.code)).toContain('text-too-long')
  })

  it('非法占位符名 → illegal-placeholder', () => {
    const issues = lintPhraseLibrary(
      [...full, { scene: 's1', tone: 't1', text: '{对方昵称}你好' }],
      config,
    )
    expect(issues.map((i) => i.code)).toContain('illegal-placeholder')
  })

  it('花括号不配对 → illegal-placeholder', () => {
    const issues = lintPhraseLibrary(
      [...full, { scene: 's1', tone: 't1', text: '你好{对方称呼' }],
      config,
    )
    expect(issues.map((i) => i.code)).toContain('illegal-placeholder')
  })

  it('未知场景/语气 id → unknown-scene / unknown-tone', () => {
    const issues = lintPhraseLibrary(
      [...full, { scene: 'sX', tone: 'tX', text: '游离条目' }],
      config,
    )
    expect(issues.map((i) => i.code)).toContain('unknown-scene')
    expect(issues.map((i) => i.code)).toContain('unknown-tone')
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL（schema/lint 模块不存在）

- [ ] **Step 4: 实现**

`packages/shared/src/phrase/schema.ts`：

```ts
import { z } from 'zod'

export const phraseSchema = z.object({
  scene: z.string().min(1),
  tone: z.string().min(1),
  text: z.string().min(1).max(80),
})

export const phraseLibrarySchema = z.array(phraseSchema)

export type Phrase = z.infer<typeof phraseSchema>
```

`packages/shared/src/phrase/lint.ts`：

```ts
import type { Phrase } from './schema'

export interface PhraseLintConfig {
  sceneIds: readonly string[]
  toneIds: readonly string[]
  minPerGroup: number
  maxTextLength: number
  allowedPlaceholders: readonly string[]
}

export interface PhraseLintIssue {
  code: 'unknown-scene' | 'unknown-tone' | 'group-too-small' | 'text-too-long' | 'illegal-placeholder'
  message: string
}

function lintPlaceholders(text: string, allowed: readonly string[]): PhraseLintIssue[] {
  const issues: PhraseLintIssue[] = []
  const matches = [...text.matchAll(/\{([^{}]*)\}/g)]
  for (const match of matches) {
    if (!allowed.includes(match[1])) {
      issues.push({ code: 'illegal-placeholder', message: `非法占位符 {${match[1]}}：${text}` })
    }
  }
  const count = (ch: string) => text.split(ch).length - 1
  if (count('{') !== matches.length || count('}') !== matches.length) {
    issues.push({ code: 'illegal-placeholder', message: `花括号不配对：${text}` })
  }
  return issues
}

function lintEntry(phrase: Phrase, config: PhraseLintConfig): PhraseLintIssue[] {
  const issues: PhraseLintIssue[] = []
  if (!config.sceneIds.includes(phrase.scene)) {
    issues.push({ code: 'unknown-scene', message: `未知场景 ${phrase.scene}：${phrase.text}` })
  }
  if (!config.toneIds.includes(phrase.tone)) {
    issues.push({ code: 'unknown-tone', message: `未知语气 ${phrase.tone}：${phrase.text}` })
  }
  if ([...phrase.text].length > config.maxTextLength) {
    issues.push({ code: 'text-too-long', message: `超过 ${config.maxTextLength} 字：${phrase.text}` })
  }
  return [...issues, ...lintPlaceholders(phrase.text, config.allowedPlaceholders)]
}

function lintMatrix(phrases: readonly Phrase[], config: PhraseLintConfig): PhraseLintIssue[] {
  const issues: PhraseLintIssue[] = []
  for (const scene of config.sceneIds) {
    for (const tone of config.toneIds) {
      const count = phrases.filter((p) => p.scene === scene && p.tone === tone).length
      if (count < config.minPerGroup) {
        issues.push({
          code: 'group-too-small',
          message: `${scene}×${tone} 只有 ${count} 条（需 ≥${config.minPerGroup}）`,
        })
      }
    }
  }
  return issues
}

export function lintPhraseLibrary(
  phrases: readonly Phrase[],
  config: PhraseLintConfig,
): PhraseLintIssue[] {
  return [...phrases.flatMap((p) => lintEntry(p, config)), ...lintMatrix(phrases, config)]
}
```

`packages/shared/src/index.ts` 追加：

```ts
export { phraseLibrarySchema, phraseSchema, type Phrase } from './phrase/schema'
export { lintPhraseLibrary, type PhraseLintConfig, type PhraseLintIssue } from './phrase/lint'
```

- [ ] **Step 5: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`
Expected: 全 PASS

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(shared): phrase 文案库 zod schema 与矩阵完整性 lint"
```

---

### Task 3: refusal-generator 站点脚手架（Bento 基底 + public 资产）

**Files:**
- Create: `sites/refusal-generator/package.json`, `sites/refusal-generator/tsconfig.json`, `sites/refusal-generator/vite.config.ts`, `sites/refusal-generator/vitest.config.ts`, `sites/refusal-generator/index.html`, `sites/refusal-generator/src/main.tsx`, `sites/refusal-generator/src/app.tsx`（占位，Task 10 替换）, `sites/refusal-generator/src/index.css`, `sites/refusal-generator/test/setup.ts`, `sites/refusal-generator/public/favicon.svg`
- Create（cp）: `sites/refusal-generator/public/_worker.js`, `sites/refusal-generator/public/u.js`, `sites/refusal-generator/test/canvas-stub.ts`

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）
- Produces: 可 build 的 Vite React 站点；`test/canvas-stub.ts` 的 `installCanvasStub(): RecordingCtx`（组件/卡片测试复用）

- [ ] **Step 1: 建包与依赖**

`sites/refusal-generator/package.json`：

```json
{
  "name": "@viral/refusal-generator",
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

（build 命令在 Task 4 接入话术 lint 后改为三段式。）

Run:

```bash
pnpm --filter @viral/refusal-generator add react react-dom
pnpm --filter @viral/refusal-generator add -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest@^3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom@^6 @types/react @types/react-dom
pnpm --filter @viral/refusal-generator add '@viral/shared@workspace:*'
```

- [ ] **Step 2: 复制工厂公共资产**

```bash
mkdir -p sites/refusal-generator/public sites/refusal-generator/test
cp sites/life-grid/public/_worker.js sites/refusal-generator/public/_worker.js
cp sites/life-grid/public/u.js sites/refusal-generator/public/u.js
cp sites/life-grid/test/canvas-stub.ts sites/refusal-generator/test/canvas-stub.ts
```

- [ ] **Step 3: 配置文件**

`sites/refusal-generator/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client", "@testing-library/jest-dom"] },
  "include": ["src", "test"]
}
```

`sites/refusal-generator/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/refusal-generator/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
})
```

`sites/refusal-generator/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: index.html 与 favicon**

`sites/refusal-generator/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f2f3f5" />
    <title>拒绝话术生成器 — 好好说「不」</title>
    <meta
      name="description"
      content="被借钱、被拉砍价、被安排相亲、被叫加班？选场景挑语气，委婉体面、直球硬刚、发疯文学、文言文、职场黑话，一键复制拒绝话术。"
    />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- umami 自托管脚本 + 同源上报（data-host-url="/" → POST /api/send，由 _worker.js 代理转发）。
         TO_BE_FILLED 在 Task 11 手工步骤替换为本站 website-id，替换前不得部署。 -->
    <script defer src="/u.js" data-website-id="TO_BE_FILLED" data-host-url="/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`sites/refusal-generator/public/favicon.svg`（Bento 九格拼盘缩影，1 个 2×1 混排）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#f2f3f5"/>
  <rect x="8" y="8" width="30" height="14" rx="4" fill="#0d9488"/>
  <rect x="42" y="8" width="14" height="14" rx="4" fill="#ea580c"/>
  <rect x="8" y="26" width="14" height="14" rx="4" fill="#db2777"/>
  <rect x="26" y="26" width="30" height="14" rx="4" fill="#2563eb"/>
  <rect x="8" y="44" width="14" height="12" rx="4" fill="#7c3aed"/>
  <rect x="26" y="44" width="14" height="12" rx="4" fill="#dc2626"/>
  <rect x="44" y="44" width="12" height="12" rx="4" fill="#16a34a"/>
</svg>
```

- [ ] **Step 5: 入口与样式**

`sites/refusal-generator/src/index.css`：

```css
@import 'tailwindcss';

:root {
  color-scheme: light;
}

body {
  background-color: #f2f3f5;
  color: #1f2937;
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}
```

（Bento 的质感来自白色圆角卡片浮在冷灰白底上，底色保持素净，不加纹理图。）

`sites/refusal-generator/src/main.tsx`：

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

`sites/refusal-generator/src/app.tsx`（占位，Task 10 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-5 py-8">拒绝话术生成器</main>
}
```

- [ ] **Step 6: 验证构建**

Run: `pnpm --filter @viral/refusal-generator build`
Expected: 构建成功，产出 `sites/refusal-generator/dist/`，其中含 `_worker.js`、`u.js`、`favicon.svg`

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(refusal): Vite+React+Tailwind 站点脚手架与 Bento 基底"
```

---

### Task 4: 内容资产 — 场景/语气配置 + 120 条话术 + 构建期 lint 接线

> 这是本站的真正产品。120 条全部在下面成文，执行者**逐字录入，不得改写、不得缩水、不得用占位文案**。质量标准：除发疯文学档外，每条都过「敢真的发出去」测试——得体、好笑但不绝交；文言文档要真的像文言文；职场黑话档要有「这个需求我评估了下 ROI 不高」的味道。

**Files:**
- Create: `sites/refusal-generator/src/configs/scenes.ts`, `sites/refusal-generator/src/configs/tones.ts`, `sites/refusal-generator/src/configs/phrases.ts`
- Modify: `sites/refusal-generator/package.json`（build 接入 lint）
- Test: `sites/refusal-generator/src/configs/phrases.lint.test.ts`

**Interfaces:**
- Consumes: `phraseLibrarySchema` / `lintPhraseLibrary`（Task 2）、`type Phrase`（type-only）
- Produces:
  - `interface Scene { id: string; label: string; icon: string; color: string; span: 1 | 2 }`；`const SCENES: readonly Scene[]`（8 个，span 合计 11，加许愿格 = 12 单元恰好铺满 3 列 × 4 行）
  - `interface Tone { id: string; label: string }`；`const TONES: readonly Tone[]`（5 个）
  - `const PHRASES: readonly Phrase[]`（120 条）
  - build 命令变为 `tsc --noEmit && vitest run src/configs/phrases.lint.test.ts && vite build`——lint 不过则 build 失败

- [ ] **Step 1: 写失败测试（构建期 lint 本体）** `sites/refusal-generator/src/configs/phrases.lint.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { lintPhraseLibrary, phraseLibrarySchema } from '@viral/shared'
import { PHRASES } from './phrases'
import { SCENES } from './scenes'
import { TONES } from './tones'

describe('话术库构建期 lint', () => {
  it('schema 校验通过（结构合法、单条 ≤80 字）', () => {
    expect(() => phraseLibrarySchema.parse([...PHRASES])).not.toThrow()
  })

  it('矩阵完整：8 场景 × 5 语气，每组 ≥3 条，占位符合法', () => {
    const issues = lintPhraseLibrary(PHRASES, {
      sceneIds: SCENES.map((s) => s.id),
      toneIds: TONES.map((t) => t.id),
      minPerGroup: 3,
      maxTextLength: 80,
      allowedPlaceholders: ['对方称呼'],
    })
    expect(issues).toEqual([])
  })

  it('总量恰好 120 条（8×5×3）', () => {
    expect(PHRASES).toHaveLength(120)
  })

  it('九宫格拼盘铺满：场景 span 合计 11（+1 许愿格 = 12 单元）', () => {
    expect(SCENES.reduce((sum, s) => sum + s.span, 0)).toBe(11)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/refusal-generator test src/configs/phrases.lint.test.ts`
Expected: FAIL（configs 模块不存在）

- [ ] **Step 3: 实现场景与语气配置**

`sites/refusal-generator/src/configs/scenes.ts`：

```ts
export interface Scene {
  id: string
  label: string
  icon: string
  color: string
  span: 1 | 2
}

export const SCENES: readonly Scene[] = [
  { id: 'jieqian', label: '被借钱', icon: '💸', color: '#0d9488', span: 2 },
  { id: 'kanjia', label: '被拉群砍价', icon: '🔪', color: '#ea580c', span: 1 },
  { id: 'xiangqin', label: '被安排相亲', icon: '💘', color: '#db2777', span: 1 },
  { id: 'jiaban', label: '被叫周末加班', icon: '🧑‍💻', color: '#2563eb', span: 2 },
  { id: 'banka', label: '被推销办卡', icon: '💳', color: '#7c3aed', span: 1 },
  { id: 'fenziqian', label: '被要份子钱', icon: '🧧', color: '#dc2626', span: 1 },
  { id: 'banjia', label: '被要求帮忙搬家', icon: '📦', color: '#d97706', span: 1 },
  { id: 'tuanjian', label: '被拉去团建', icon: '🚌', color: '#16a34a', span: 2 },
]
```

`sites/refusal-generator/src/configs/tones.ts`：

```ts
export interface Tone {
  id: string
  label: string
}

export const TONES: readonly Tone[] = [
  { id: 'weiwan', label: '委婉体面' },
  { id: 'yinggang', label: '直球硬刚' },
  { id: 'fafeng', label: '发疯文学' },
  { id: 'wenyan', label: '文言文' },
  { id: 'heihua', label: '职场黑话' },
]
```

- [ ] **Step 4: 录入 120 条话术** `sites/refusal-generator/src/configs/phrases.ts`

```ts
import type { Phrase } from '@viral/shared'

// 8 场景 × 5 语气 × 3 条 = 120 条。顺序：按场景分块，块内按语气。
// 修改本文件后必须跑 phrases.lint.test.ts；单条 ≤80 字；占位符仅 {对方称呼}。
export const PHRASES: readonly Phrase[] = [
  // ── 被借钱 · 委婉体面 ──
  { scene: 'jieqian', tone: 'weiwan', text: '{对方称呼}，最近我手头也紧，房贷刚扣完，实在腾不出来，你再想想别的路子？' },
  { scene: 'jieqian', tone: 'weiwan', text: '不是不想帮，是真没有。我这个月的账单都在分期，就不给你添乱了。' },
  { scene: 'jieqian', tone: 'weiwan', text: '我有个原则：关系好的不借钱，怕钱没了朋友也没了。这顿饭我请，钱就不借了。' },
  // ── 被借钱 · 直球硬刚 ──
  { scene: 'jieqian', tone: 'yinggang', text: '不借。我的钱也是一分一分挣的。' },
  { scene: 'jieqian', tone: 'yinggang', text: '借钱免谈。救急可以请你吃饭，救穷我没这个本事。' },
  { scene: 'jieqian', tone: 'yinggang', text: '上次借出去的还没回来，这个口子我已经封了，谁来都一样。' },
  // ── 被借钱 · 发疯文学 ──
  { scene: 'jieqian', tone: 'fafeng', text: '实在抱歉，我的钱在我这儿也是好好的，它不想出远门。' },
  { scene: 'jieqian', tone: 'fafeng', text: '你猜我为什么天天吃食堂？因为我也在等别人借我钱啊！！' },
  { scene: 'jieqian', tone: 'fafeng', text: '我刚问了我的钱包，它说它有社交恐惧症，见到「借」字就晕过去了。' },
  // ── 被借钱 · 文言文 ──
  { scene: 'jieqian', tone: 'wenyan', text: '非吾吝也，实囊中羞涩，爱莫能助。' },
  { scene: 'jieqian', tone: 'wenyan', text: '近日用度维艰，恐负君望，还请另谋良策。' },
  { scene: 'jieqian', tone: 'wenyan', text: '银钱之事，最伤情谊，吾不愿以此试之，君其谅察。' },
  // ── 被借钱 · 职场黑话 ──
  { scene: 'jieqian', tone: 'heihua', text: '这笔资金我评估了下，流动性风险太高，暂时无法立项。' },
  { scene: 'jieqian', tone: 'heihua', text: '我的现金流这个季度要对齐房贷 KPI，实在没有多余预算给到你。' },
  { scene: 'jieqian', tone: 'heihua', text: '借款这个需求我先挂起吧，等我财务状况迭代到 2.0 再拉通对齐。' },

  // ── 被拉群砍价 · 委婉体面 ──
  { scene: 'kanjia', tone: 'weiwan', text: '{对方称呼}，我基本不点这类链接，帮不上你啦，祝你早日砍成！' },
  { scene: 'kanjia', tone: 'weiwan', text: '我这号砍不动，权重太低，别浪费你一个名额，找新用户更划算。' },
  { scene: 'kanjia', tone: 'weiwan', text: '不好意思呀，那个 app 我卸载了，再装一次实在太折腾，就不帮这个忙啦。' },
  // ── 被拉群砍价 · 直球硬刚 ──
  { scene: 'kanjia', tone: 'yinggang', text: '不砍。差的那几毛钱我可以直接转你。' },
  { scene: 'kanjia', tone: 'yinggang', text: '这种链接我从来不点，你就当我没看见。' },
  { scene: 'kanjia', tone: 'yinggang', text: '别发我了，砍价链接一律不点，这是底线。' },
  // ── 被拉群砍价 · 发疯文学 ──
  { scene: 'kanjia', tone: 'fafeng', text: '我上次帮人砍价，最后一刀砍了三年，现在还停在「仅剩0.01%」。' },
  { scene: 'kanjia', tone: 'fafeng', text: '对不起，我的手指点这种链接会过敏，医生说再点就要住院了。' },
  { scene: 'kanjia', tone: 'fafeng', text: '你砍的不是价，是我们十年的友情啊！每点一刀，友情掉一格血！' },
  // ── 被拉群砍价 · 文言文 ──
  { scene: 'kanjia', tone: 'wenyan', text: '此等蝇头小利，徒耗心神，恕不奉陪。' },
  { scene: 'kanjia', tone: 'wenyan', text: '一刀复一刀，刀刀无穷尽，吾不愿陷于此局。' },
  { scene: 'kanjia', tone: 'wenyan', text: '君所求者数文钱耳，吾所失者清净也，恕难从命。' },
  // ── 被拉群砍价 · 职场黑话 ──
  { scene: 'kanjia', tone: 'heihua', text: '帮砍这个动作 ROI 太低了，建议你直接走付费通道，效率更高。' },
  { scene: 'kanjia', tone: 'heihua', text: '我评估了下，我的账号权重赋能不了你这条砍价链路。' },
  { scene: 'kanjia', tone: 'heihua', text: '这个需求不在我本周的排期里，砍价资源已经饱和了，抱歉。' },

  // ── 被安排相亲 · 委婉体面 ──
  { scene: 'xiangqin', tone: 'weiwan', text: '谢谢{对方称呼}惦记，不过我最近想先把自己的日子过明白，缘分的事不急。' },
  { scene: 'xiangqin', tone: 'weiwan', text: '心意我领了，但硬凑的饭局大家都尴尬，等我想见的时候一定主动找您。' },
  { scene: 'xiangqin', tone: 'weiwan', text: '我现在的状态还不适合认识新朋友，等我准备好了，第一个告诉您。' },
  // ── 被安排相亲 · 直球硬刚 ──
  { scene: 'xiangqin', tone: 'yinggang', text: '不去。我单身挺好的，不需要被解决。' },
  { scene: 'xiangqin', tone: 'yinggang', text: '相亲就免了，我的人生大事我自己排期。' },
  { scene: 'xiangqin', tone: 'yinggang', text: '这事别替我操心了，我缺的不是对象，是自己待着的时间。' },
  // ── 被安排相亲 · 发疯文学 ──
  { scene: 'xiangqin', tone: 'fafeng', text: '我这个版本还在内测，不对外发布，婚恋市场请等正式版上线。' },
  { scene: 'xiangqin', tone: 'fafeng', text: '不是我不想去，是对方运气不能这么差，第一次抽卡就抽到我。' },
  { scene: 'xiangqin', tone: 'fafeng', text: '我算过了，我的姻缘在 2049 年，提前见面会引发时空悖论。' },
  // ── 被安排相亲 · 文言文 ──
  { scene: 'xiangqin', tone: 'wenyan', text: '姻缘天定，强求无益，吾且随缘。' },
  { scene: 'xiangqin', tone: 'wenyan', text: '吾心如止水，未起波澜，此会不赴也罢。' },
  { scene: 'xiangqin', tone: 'wenyan', text: '多谢美意，然良缘不在酒席之间，在乎机缘耳。' },
  // ── 被安排相亲 · 职场黑话 ──
  { scene: 'xiangqin', tone: 'heihua', text: '我近期的人生规划里没有婚恋这条业务线，先不开新项目了。' },
  { scene: 'xiangqin', tone: 'heihua', text: '相亲这个场景转化率太低，我决定把精力聚焦在自我成长赛道。' },
  { scene: 'xiangqin', tone: 'heihua', text: '感谢推荐，但这位候选人和我的需求画像不匹配，先不约了。' },

  // ── 被叫周末加班 · 委婉体面 ──
  { scene: 'jiaban', tone: 'weiwan', text: '领导，这周末我家里早有安排实在挪不开，下周我一定把进度赶回来。' },
  { scene: 'jiaban', tone: 'weiwan', text: '这周末确实有事。如果不是特别紧急，我周一早点到，优先处理这块？' },
  { scene: 'jiaban', tone: 'weiwan', text: '周末我已经有约了。线上有急事我可以远程看一眼，到场就实在没办法了。' },
  // ── 被叫周末加班 · 直球硬刚 ──
  { scene: 'jiaban', tone: 'yinggang', text: '周末是我的私人时间，这次不来了。工作日的事我都会保质保量。' },
  { scene: 'jiaban', tone: 'yinggang', text: '加班费和调休有一个我就来，都没有就恕我不奉陪了。' },
  { scene: 'jiaban', tone: 'yinggang', text: '不好意思，周末不上班，这是我入职时就定好的边界。' },
  // ── 被叫周末加班 · 发疯文学 ──
  { scene: 'jiaban', tone: 'fafeng', text: '周六的我和周一的我不是同一个人，你找的那位周一才上班。' },
  { scene: 'jiaban', tone: 'fafeng', text: '我的电脑周末会自动断亲，一开机就蓝屏，它比我先觉醒了。' },
  { scene: 'jiaban', tone: 'fafeng', text: '好的收到！我马上转发给梦里的我，让他加，他闲着也是闲着。' },
  // ── 被叫周末加班 · 文言文 ──
  { scene: 'jiaban', tone: 'wenyan', text: '一张一弛，文武之道。周末不至，望乞海涵。' },
  { scene: 'jiaban', tone: 'wenyan', text: '五日尽忠，两日归隐，此吾之节律，不敢乱也。' },
  { scene: 'jiaban', tone: 'wenyan', text: '身可劳于五日，不可役于七日，周末且容吾自处。' },
  // ── 被叫周末加班 · 职场黑话 ──
  { scene: 'jiaban', tone: 'heihua', text: '这个需求我评估了下优先级，不值得占用周末这种稀缺资源。' },
  { scene: 'jiaban', tone: 'heihua', text: '周末我要对个人生活做复盘和迭代，加班这个排期插不进来了。' },
  { scene: 'jiaban', tone: 'heihua', text: '建议这个事拉个工作日的会对齐一下，周末执行 ROI 不高。' },

  // ── 被推销办卡 · 委婉体面 ──
  { scene: 'banka', tone: 'weiwan', text: '谢谢，我不太需要。你去忙别的顾客吧，别在我身上耽误业绩。' },
  { scene: 'banka', tone: 'weiwan', text: '我办卡从来用不满三次，纯属浪费，就不办啦，谢谢。' },
  { scene: 'banka', tone: 'weiwan', text: '今天先不办，有需要我一定回来找你，你服务挺好的。' },
  // ── 被推销办卡 · 直球硬刚 ──
  { scene: 'banka', tone: 'yinggang', text: '不办，谢谢。你再介绍，我也是这句话。' },
  { scene: 'banka', tone: 'yinggang', text: '我从不办任何预付卡，这是原则问题，跟优惠力度无关。' },
  { scene: 'banka', tone: 'yinggang', text: '省点力气吧，我是那种连传单都不接的人。' },
  // ── 被推销办卡 · 发疯文学 ──
  { scene: 'banka', tone: 'fafeng', text: '办卡？我上一张卡还没用完店就没了，现在看见「充值」俩字就心梗。' },
  { scene: 'banka', tone: 'fafeng', text: '别劝了，我的钱包已经立好遗嘱了，遗产一分都不留给会员卡。' },
  { scene: 'banka', tone: 'fafeng', text: '我命里缺卡，大师算过的，办卡会破我的财运，你忍心吗？' },
  // ── 被推销办卡 · 文言文 ──
  { scene: 'banka', tone: 'wenyan', text: '谢君美意，然吾无此需，不必多言。' },
  { scene: 'banka', tone: 'wenyan', text: '预付之约，以今日之财，博明日之虚诺，吾不为也。' },
  { scene: 'banka', tone: 'wenyan', text: '卡券之惠，看似让利，实为绳索，恕吾不受。' },
  // ── 被推销办卡 · 职场黑话 ──
  { scene: 'banka', tone: 'heihua', text: '这张卡的权益我评估过了，和我的消费场景不匹配，先不办了。' },
  { scene: 'banka', tone: 'heihua', text: '充值属于重资产投入，我目前只做轻量化消费，单次结算就好。' },
  { scene: 'banka', tone: 'heihua', text: '你这套获客话术不错，但我这个用户的付费意愿是负的，换个目标吧。' },

  // ── 被要份子钱 · 委婉体面 ──
  { scene: 'fenziqian', tone: 'weiwan', text: '恭喜恭喜！不过咱们好多年没联系了，婚礼我就不去凑热闹了，祝你们幸福！' },
  { scene: 'fenziqian', tone: 'weiwan', text: '祝新婚快乐！我最近不在本地，就不到场随礼了，改天回去请你喝茶。' },
  { scene: 'fenziqian', tone: 'weiwan', text: '{对方称呼}，咱俩的交情不在礼金上，心意我用别的方式补，祝百年好合！' },
  // ── 被要份子钱 · 直球硬刚 ──
  { scene: 'fenziqian', tone: 'yinggang', text: '咱们上次说话还是五年前，这份子我就不随了，祝幸福。' },
  { scene: 'fenziqian', tone: 'yinggang', text: '不熟的酒席我一律不去也不随，不是针对你，是统一原则。' },
  { scene: 'fenziqian', tone: 'yinggang', text: '份子就免了吧，等你随过我的那天再说。' },
  // ── 被要份子钱 · 发疯文学 ──
  { scene: 'fenziqian', tone: 'fafeng', text: '我随不了一点，我的钱包看到请帖就开始尖叫，现在还在天台蹲着。' },
  { scene: 'fenziqian', tone: 'fafeng', text: '你结婚我随礼，我单身谁随我？我决定给自己随一份，先到先得。' },
  { scene: 'fenziqian', tone: 'fafeng', text: '这个月第四张请帖了，再随下去我就得摆酒回本，到时候你可得来！' },
  // ── 被要份子钱 · 文言文 ──
  { scene: 'fenziqian', tone: 'wenyan', text: '贺仪量力而行，吾力有不逮，唯有心香一瓣，遥祝百年。' },
  { scene: 'fenziqian', tone: 'wenyan', text: '交浅而礼重，非君子所为。吾以贺词代仪，君其纳之。' },
  { scene: 'fenziqian', tone: 'wenyan', text: '十年未通音问，忽奉喜帖。吾唯遥祝，不敢叨扰。' },
  // ── 被要份子钱 · 职场黑话 ──
  { scene: 'fenziqian', tone: 'heihua', text: '咱俩的关系链好久没维护了，这单人情投资我就先不跟了，祝幸福！' },
  { scene: 'fenziqian', tone: 'heihua', text: '随礼预算这个季度已经超支了，你这单我实在排不进去了。' },
  { scene: 'fenziqian', tone: 'heihua', text: '我评估了下咱们的联系频次，这份子钱的 ROI 双方都不高，心意送到！' },

  // ── 被要求帮忙搬家 · 委婉体面 ──
  { scene: 'banjia', tone: 'weiwan', text: '{对方称呼}，那天我真来不了。我出一份搬家师傅的钱，比我这小身板好使多了。' },
  { scene: 'banjia', tone: 'weiwan', text: '我这老腰实在搬不动大件，帮你叫个货拉拉吧，师傅专业还带工具。' },
  { scene: 'banjia', tone: 'weiwan', text: '那天我已经有安排了走不开，等你搬完，我来给你温锅！' },
  // ── 被要求帮忙搬家 · 直球硬刚 ──
  { scene: 'banjia', tone: 'yinggang', text: '搬不了，那天有事。建议直接找搬家公司，一步到位。' },
  { scene: 'banjia', tone: 'yinggang', text: '兄弟情归情，重物归专业，我这次就不上了。' },
  { scene: 'banjia', tone: 'yinggang', text: '不去了。上次帮人搬家腰疼了半个月，我得对自己的腰负责。' },
  // ── 被要求帮忙搬家 · 发疯文学 ──
  { scene: 'banjia', tone: 'fafeng', text: '我的腰椎间盘听到「搬家」两个字已经开始突出了，它比我先拒绝的。' },
  { scene: 'banjia', tone: 'fafeng', text: '大师说我今年不能动土，也不能动别人家的土，冰箱尤其不行。' },
  { scene: 'banjia', tone: 'fafeng', text: '行，我可以去，但我只负责搬空气和喊加油，这两样我是专业的。' },
  // ── 被要求帮忙搬家 · 文言文 ──
  { scene: 'banjia', tone: 'wenyan', text: '吾之筋骨，不堪此任，君宜另请高明。' },
  { scene: 'banjia', tone: 'wenyan', text: '乔迁之喜，吾心往之；搬运之劳，力所不逮。' },
  { scene: 'banjia', tone: 'wenyan', text: '与其借吾之弱躯，不如雇一良夫，事半而功倍。' },
  // ── 被要求帮忙搬家 · 职场黑话 ──
  { scene: 'banjia', tone: 'heihua', text: '搬家这个项目建议外包给专业团队，我这边人力成本高、产出还低。' },
  { scene: 'banjia', tone: 'heihua', text: '我评估了下自己的体力资源池，接不住冰箱这种量级的需求。' },
  { scene: 'banjia', tone: 'heihua', text: '这个活儿和我的能力模型不匹配，我可以赞助一杯奶茶做精神股东。' },

  // ── 被拉去团建 · 委婉体面 ──
  { scene: 'tuanjian', tone: 'weiwan', text: '这次团建我就不去了，家里确实有事。大家玩得开心，照片记得发群里！' },
  { scene: 'tuanjian', tone: 'weiwan', text: '我周末已经有安排了，下次工作日的团建我一定到。' },
  { scene: 'tuanjian', tone: 'weiwan', text: '最近身体不太舒服，剧烈活动参加不了，就不去给大家扫兴啦。' },
  // ── 被拉去团建 · 直球硬刚 ──
  { scene: 'tuanjian', tone: 'yinggang', text: '占用周末的团建我不参加，工作日的我都配合。' },
  { scene: 'tuanjian', tone: 'yinggang', text: '爬山就算了，我的周末只想躺着，这是刚需。' },
  { scene: 'tuanjian', tone: 'yinggang', text: '不去。团建对我来说是加班的一种，还是自费的那种。' },
  // ── 被拉去团建 · 发疯文学 ──
  { scene: 'tuanjian', tone: 'fafeng', text: '团建？我连自己都不想建，你们建吧，建好了发我看看。' },
  { scene: 'tuanjian', tone: 'fafeng', text: '我做了个梦，梦里大巴在盘山路上抛锚了。为了大家的安全，我还是别去了。' },
  { scene: 'tuanjian', tone: 'fafeng', text: '我的 MBTI 是 IIII，纯 I 型，团建半天我得独处一周才能复活。' },
  // ── 被拉去团建 · 文言文 ──
  { scene: 'tuanjian', tone: 'wenyan', text: '众乐乐非吾所长，独乐乐方得其真。诸君尽兴，吾自逍遥。' },
  { scene: 'tuanjian', tone: 'wenyan', text: '山高路远，吾体乏矣，愿诸君尽兴而归。' },
  { scene: 'tuanjian', tone: 'wenyan', text: '聚饮之欢，吾心领之；周末之闲，吾自珍之。' },
  // ── 被拉去团建 · 职场黑话 ──
  { scene: 'tuanjian', tone: 'heihua', text: '这次团建和我的周末规划有排期冲突，名额先释放给更需要的同学。' },
  { scene: 'tuanjian', tone: 'heihua', text: '团建的情绪价值我在工位上已经拿满了，周末就不重复建设了。' },
  { scene: 'tuanjian', tone: 'heihua', text: '我评估了下，这次团建对我的赋能有限，就不占用大巴资源了。' },
]
```

- [ ] **Step 5: build 接入构建期 lint**

`sites/refusal-generator/package.json` 的 build 脚本改为：

```json
"build": "tsc --noEmit && vitest run src/configs/phrases.lint.test.ts && vite build"
```

- [ ] **Step 6: 跑测试确认通过 + 构建核验**

Run: `pnpm --filter @viral/refusal-generator test && pnpm --filter @viral/refusal-generator build`
Expected: lint 测试 4 条全 PASS（120 条、40 组无空洞、span 合计 11）；build 成功且日志里能看到 lint 测试先于 vite build 执行

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(refusal): 8×5×3 话术内容矩阵与构建期 lint"
```

---

### Task 5: 剪贴板双层封装 copy-text

**Files:**
- Create: `sites/refusal-generator/src/lib/copy-text.ts`
- Test: `sites/refusal-generator/src/lib/copy-text.test.ts`

**Interfaces:**
- Produces:
  - `type CopyMethod = 'clipboard-api' | 'exec-command'`
  - `copyViaExecCommand(text: string, doc: Document): boolean` — DOM 层：建隐藏 textarea → select → `doc.execCommand('copy')` → finally 移除 textarea；返回 execCommand 结果
  - `copyText(text: string): Promise<CopyMethod>` — 编排层：`navigator.clipboard?.writeText` 可用则优先；不可用或 reject（微信内置浏览器常见）降级 execCommand；两路都失败 `throw new Error('copy failed')`

- [ ] **Step 1: 写失败测试** `sites/refusal-generator/src/lib/copy-text.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText, copyViaExecCommand } from './copy-text'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

afterEach(() => {
  setClipboard(undefined)
  // jsdom 没有 execCommand，测试里挂的桩要清掉
  delete (document as { execCommand?: unknown }).execCommand
  vi.restoreAllMocks()
})

describe('copyViaExecCommand（DOM 层）', () => {
  it('创建 textarea、执行 copy、随后移除', () => {
    const execSpy = vi.fn().mockReturnValue(true)
    ;(document as { execCommand?: unknown }).execCommand = execSpy
    const ok = copyViaExecCommand('不借。', document)
    expect(ok).toBe(true)
    expect(execSpy).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('execCommand 抛错时 textarea 仍被移除，且返回 false', () => {
    ;(document as { execCommand?: unknown }).execCommand = vi.fn(() => {
      throw new Error('denied')
    })
    expect(copyViaExecCommand('x', document)).toBe(false)
    expect(document.querySelector('textarea')).toBeNull()
  })
})

describe('copyText（编排层）', () => {
  it('clipboard API 可用且成功 → clipboard-api，不碰 execCommand', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    const execSpy = vi.fn()
    ;(document as { execCommand?: unknown }).execCommand = execSpy
    await expect(copyText('好好说不')).resolves.toBe('clipboard-api')
    expect(writeText).toHaveBeenCalledWith('好好说不')
    expect(execSpy).not.toHaveBeenCalled()
  })

  it('clipboard API 缺失 → 降级 exec-command', async () => {
    setClipboard(undefined)
    ;(document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(true)
    await expect(copyText('好好说不')).resolves.toBe('exec-command')
  })

  it('clipboard API reject（微信内核拒绝）→ 降级 exec-command', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowed')) })
    ;(document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(true)
    await expect(copyText('好好说不')).resolves.toBe('exec-command')
  })

  it('两条路都失败 → 抛错', async () => {
    setClipboard(undefined)
    ;(document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(false)
    await expect(copyText('好好说不')).rejects.toThrow('copy failed')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/refusal-generator test src/lib/copy-text.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/refusal-generator/src/lib/copy-text.ts`

```ts
export type CopyMethod = 'clipboard-api' | 'exec-command'

export function copyViaExecCommand(text: string, doc: Document): boolean {
  const textarea = doc.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  doc.body.appendChild(textarea)
  textarea.select()
  let ok = false
  try {
    ok = doc.execCommand('copy')
  } catch {
    ok = false
  } finally {
    doc.body.removeChild(textarea)
  }
  return ok
}

export async function copyText(text: string): Promise<CopyMethod> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'clipboard-api'
    } catch {
      // 微信内置浏览器等环境可能拒绝 clipboard API，走 execCommand 降级
    }
  }
  if (copyViaExecCommand(text, document)) return 'exec-command'
  throw new Error('copy failed')
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/refusal-generator test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(refusal): 剪贴板双层封装（clipboard API + execCommand 降级）"
```

---

### Task 6: SceneGrid 场景九宫格（签名元素 + 许愿格）

**Files:**
- Create: `sites/refusal-generator/src/components/scene-grid.tsx`
- Test: `sites/refusal-generator/src/components/scene-grid.test.tsx`

**Interfaces:**
- Consumes: `SCENES`（Task 4）
- Produces: `<SceneGrid selected={string | null} onSelect={(sceneId: string) => void} />` — 3 列网格，`span: 2` 的场景 tile 用 `col-span-2`（1×1 / 2×1 混排）；选中 tile 内描边场景色 + `aria-pressed`；第 9 格是许愿格 `<a href="mailto:…">`。组件不埋点（埋点在 App 层，Task 10）

- [ ] **Step 1: 写失败测试** `sites/refusal-generator/src/components/scene-grid.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SceneGrid } from './scene-grid'

describe('SceneGrid', () => {
  it('渲染 8 个场景按钮', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(8)
    expect(screen.getByRole('button', { name: /被借钱/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /被拉去团建/ })).toBeInTheDocument()
  })

  it('第 9 格是 mailto 许愿入口', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} />)
    const wish = screen.getByRole('link', { name: /想拒绝别的/ })
    expect(wish.getAttribute('href')).toMatch(/^mailto:afu886\.cn@gmail\.com/)
  })

  it('点击场景回调其 id', async () => {
    const onSelect = vi.fn()
    render(<SceneGrid selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    expect(onSelect).toHaveBeenCalledWith('jieqian')
  })

  it('选中态用 aria-pressed 标注', () => {
    render(<SceneGrid selected="jiaban" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /被叫周末加班/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /被借钱/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('span=2 的场景 tile 带 col-span-2（Bento 节奏）', () => {
    render(<SceneGrid selected={null} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /被借钱/ }).className).toContain('col-span-2')
    expect(screen.getByRole('button', { name: /被拉群砍价/ }).className).not.toContain('col-span-2')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/refusal-generator test src/components/scene-grid.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/refusal-generator/src/components/scene-grid.tsx`

```tsx
import { SCENES } from '../configs/scenes'

const WISH_MAILTO = `mailto:afu886.cn@gmail.com?subject=${encodeURIComponent(
  '【拒绝话术许愿】我想拒绝…',
)}`

interface Props {
  selected: string | null
  onSelect: (sceneId: string) => void
}

export function SceneGrid({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label="选择场景">
      {SCENES.map((scene) => (
        <button
          key={scene.id}
          type="button"
          aria-pressed={selected === scene.id}
          onClick={() => onSelect(scene.id)}
          className={`flex min-h-24 flex-col items-start justify-between rounded-2xl bg-white p-4 text-left shadow-sm ${
            scene.span === 2 ? 'col-span-2' : ''
          }`}
          style={
            selected === scene.id ? { boxShadow: `inset 0 0 0 3px ${scene.color}` } : undefined
          }
        >
          <span aria-hidden className="text-2xl">
            {scene.icon}
          </span>
          <span className="mt-2 text-sm font-medium" style={{ color: scene.color }}>
            {scene.label}
          </span>
        </button>
      ))}
      <a
        href={WISH_MAILTO}
        className="flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#9ca3af] p-4 text-center text-xs text-[#6b7280]"
      >
        想拒绝别的？
        <span className="mt-1 font-medium">写信告诉我</span>
      </a>
    </div>
  )
}
```

（span 合计 11 + 许愿格 1 = 12 单元，3 列恰好 4 行铺满，无空洞；这是 00a 要求的「卡片尺寸有节奏，不全等分」。）

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/refusal-generator test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(refusal): 场景九宫格拼盘与许愿入口"
```

---

### Task 7: TonePicker 语气胶囊 + pickBatch 批次纯函数

**Files:**
- Create: `sites/refusal-generator/src/components/tone-picker.tsx`, `sites/refusal-generator/src/lib/pick-batch.ts`
- Test: `sites/refusal-generator/src/components/tone-picker.test.tsx`, `sites/refusal-generator/src/lib/pick-batch.test.ts`

**Interfaces:**
- Consumes: `TONES`（Task 4）
- Produces:
  - `const BATCH_SIZE = 3`；`pickBatch<T>(list: readonly T[], batchIndex: number): T[]` — 环形取 3 条：起点 `(batchIndex * BATCH_SIZE) % list.length`，不足 3 条时全量返回，不修改入参
  - `<TonePicker selected={string | null} onSelect={(toneId: string) => void} />` — 横向胶囊，选中反色 + `aria-pressed`。组件不埋点
- 注：v1 每组恰好 3 条，PhraseList（Task 8）在 `phrases.length <= BATCH_SIZE` 时不渲染「换一批」按钮；v1.1 扩充文案后按钮自动出现，pickBatch 无需改动

- [ ] **Step 1: 写失败测试**

`sites/refusal-generator/src/lib/pick-batch.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { BATCH_SIZE, pickBatch } from './pick-batch'

const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

describe('pickBatch', () => {
  it('BATCH_SIZE 恒为 3', () => expect(BATCH_SIZE).toBe(3))
  it('第 0 批取前 3 条', () => expect(pickBatch(seven, 0)).toEqual(['a', 'b', 'c']))
  it('第 1 批顺移 3 条', () => expect(pickBatch(seven, 1)).toEqual(['d', 'e', 'f']))
  it('越过末尾时环形回绕', () => expect(pickBatch(seven, 2)).toEqual(['g', 'a', 'b']))
  it('恰好 3 条时每批都是全量', () => {
    expect(pickBatch(['x', 'y', 'z'], 0)).toEqual(['x', 'y', 'z'])
    expect(pickBatch(['x', 'y', 'z'], 5)).toEqual(['x', 'y', 'z'])
  })
  it('不足 3 条时全量返回', () => expect(pickBatch(['x', 'y'], 0)).toEqual(['x', 'y']))
  it('空列表返回空数组', () => expect(pickBatch([], 3)).toEqual([]))
  it('不修改入参（不可变）', () => {
    const input = ['a', 'b', 'c', 'd']
    pickBatch(input, 1)
    expect(input).toEqual(['a', 'b', 'c', 'd'])
  })
})
```

`sites/refusal-generator/src/components/tone-picker.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TonePicker } from './tone-picker'

describe('TonePicker', () => {
  it('渲染 5 个语气胶囊', () => {
    render(<TonePicker selected={null} onSelect={() => {}} />)
    for (const label of ['委婉体面', '直球硬刚', '发疯文学', '文言文', '职场黑话']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('点击回调语气 id', async () => {
    const onSelect = vi.fn()
    render(<TonePicker selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: '文言文' }))
    expect(onSelect).toHaveBeenCalledWith('wenyan')
  })

  it('选中态 aria-pressed', () => {
    render(<TonePicker selected="fafeng" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: '发疯文学' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/refusal-generator test`
Expected: FAIL（两个新模块不存在）

- [ ] **Step 3: 实现**

`sites/refusal-generator/src/lib/pick-batch.ts`：

```ts
export const BATCH_SIZE = 3

export function pickBatch<T>(list: readonly T[], batchIndex: number): T[] {
  if (list.length === 0) return []
  const start = (batchIndex * BATCH_SIZE) % list.length
  const size = Math.min(BATCH_SIZE, list.length)
  const out: T[] = []
  for (let i = 0; i < size; i += 1) {
    out.push(list[(start + i) % list.length])
  }
  return out
}
```

`sites/refusal-generator/src/components/tone-picker.tsx`：

```tsx
import { TONES } from '../configs/tones'

interface Props {
  selected: string | null
  onSelect: (toneId: string) => void
}

export function TonePicker({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="选择语气">
      {TONES.map((tone) => (
        <button
          key={tone.id}
          type="button"
          aria-pressed={selected === tone.id}
          onClick={() => onSelect(tone.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm ${
            selected === tone.id ? 'bg-[#1f2937] text-white' : 'bg-white text-[#1f2937] shadow-sm'
          }`}
        >
          {tone.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/refusal-generator test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(refusal): 语气胶囊与换一批批次纯函数"
```

---

### Task 8: PhraseList 话术列表（称呼个性化 + 复制 + generate/copy 埋点）

**Files:**
- Create: `sites/refusal-generator/src/components/phrase-list.tsx`
- Test: `sites/refusal-generator/src/components/phrase-list.test.tsx`

**Interfaces:**
- Consumes: `renderTemplate` / `track` / `type Phrase`（shared）、`Scene`/`Tone` 类型（Task 4）、`copyText`（Task 5）、`pickBatch`/`BATCH_SIZE`（Task 7）
- Produces: `<PhraseList phrases={readonly Phrase[]} scene={Scene} tone={Tone} renderSaveAction?={(renderedText: string) => ReactNode} />`
  - 出话术即 `track('generate', { scene, tone })`（挂载与换一批各报一次）——generate 的唯一归属地
  - 称呼输入（label「对方称呼」，placeholder「不填就是「亲」」），实时 `renderTemplate` 个性化
  - 每条〔复制〕：成功 → 按钮变「已复制」1.5s + `track('copy', { scene, tone })`（**核心指标**）；失败 → 提示「复制失败了，长按文字也能复制」且不报 copy
  - `renderSaveAction` 插槽拿到**已替换称呼的最终文案**（Task 10 注入 SaveQuoteButton，本组件不依赖它）
  - 「换一批」仅在 `phrases.length > BATCH_SIZE` 时渲染
  - App 层用 `key={scene.id + '-' + tone.id}` 重置本组件内部状态（批次/已复制态），组件内不写重置逻辑

- [ ] **Step 1: 写失败测试** `sites/refusal-generator/src/components/phrase-list.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Phrase } from '@viral/shared'
import { SCENES } from '../configs/scenes'
import { TONES } from '../configs/tones'
import { PhraseList } from './phrase-list'

const scene = SCENES[0] // jieqian
const tone = TONES[0] // weiwan

const three: Phrase[] = [
  { scene: 'jieqian', tone: 'weiwan', text: '{对方称呼}，这事我帮不上。' },
  { scene: 'jieqian', tone: 'weiwan', text: '第二条话术。' },
  { scene: 'jieqian', tone: 'weiwan', text: '第三条话术。' },
]

const seven: Phrase[] = Array.from({ length: 7 }, (_, i) => ({
  scene: 'jieqian',
  tone: 'weiwan',
  text: `候选话术第${i + 1}条。`,
}))

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

describe('PhraseList', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    setClipboard(undefined)
    delete (document as { execCommand?: unknown }).execCommand
    vi.restoreAllMocks()
  })

  it('渲染 3 条候选，未填称呼时占位符显示默认「亲」', () => {
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    expect(screen.getByText('亲，这事我帮不上。')).toBeInTheDocument()
    expect(screen.getByText('第二条话术。')).toBeInTheDocument()
    expect(screen.getByText('第三条话术。')).toBeInTheDocument()
  })

  it('挂载即上报 generate（scene/tone id）', () => {
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    expect(umamiSpy).toHaveBeenCalledWith('generate', { scene: 'jieqian', tone: 'weiwan' })
  })

  it('输入称呼后实时替换', async () => {
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    await userEvent.type(screen.getByLabelText('对方称呼'), '王总')
    expect(screen.getByText('王总，这事我帮不上。')).toBeInTheDocument()
  })

  it('复制成功：按钮变「已复制」且上报 copy', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('copy', { scene: 'jieqian', tone: 'weiwan' })
  })

  it('复制的是替换称呼后的最终文案', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    await userEvent.type(screen.getByLabelText('对方称呼'), '王总')
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(writeText).toHaveBeenCalledWith('王总，这事我帮不上。')
  })

  it('复制两路全失败：出降级提示且不报 copy', async () => {
    setClipboard(undefined)
    ;(document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(false)
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(await screen.findByText('复制失败了，长按文字也能复制')).toBeInTheDocument()
    expect(umamiSpy).not.toHaveBeenCalledWith('copy', expect.anything())
  })

  it('恰好 3 条时不渲染「换一批」', () => {
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    expect(screen.queryByRole('button', { name: '换一批' })).not.toBeInTheDocument()
  })

  it('超过 3 条时「换一批」换内容并再报 generate', async () => {
    render(<PhraseList phrases={seven} scene={scene} tone={tone} />)
    expect(screen.getByText('候选话术第1条。')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '换一批' }))
    expect(screen.getByText('候选话术第4条。')).toBeInTheDocument()
    expect(screen.queryByText('候选话术第1条。')).not.toBeInTheDocument()
    expect(umamiSpy.mock.calls.filter(([e]) => e === 'generate')).toHaveLength(2)
  })

  it('renderSaveAction 插槽拿到替换后的文案', async () => {
    render(
      <PhraseList
        phrases={three}
        scene={scene}
        tone={tone}
        renderSaveAction={(text) => <span data-testid="save-slot">{`卡片:${text}`}</span>}
      />,
    )
    await userEvent.type(screen.getByLabelText('对方称呼'), '哥')
    expect(screen.getAllByTestId('save-slot')[0]).toHaveTextContent('卡片:哥，这事我帮不上。')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/refusal-generator test src/components/phrase-list.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/refusal-generator/src/components/phrase-list.tsx`

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import { renderTemplate, track, type Phrase } from '@viral/shared'
import type { Scene } from '../configs/scenes'
import type { Tone } from '../configs/tones'
import { copyText } from '../lib/copy-text'
import { BATCH_SIZE, pickBatch } from '../lib/pick-batch'

interface Props {
  phrases: readonly Phrase[]
  scene: Scene
  tone: Tone
  renderSaveAction?: (renderedText: string) => ReactNode
}

export function PhraseList({ phrases, scene, tone, renderSaveAction }: Props) {
  const [addressee, setAddressee] = useState('')
  const [batchIndex, setBatchIndex] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)

  useEffect(() => {
    // batchIndex 进依赖：换一批 = 又一次「出话术」，重报 generate
    track('generate', { scene: scene.id, tone: tone.id })
  }, [scene.id, tone.id, batchIndex])

  const batch = pickBatch(phrases, batchIndex)

  const handleCopy = async (renderedText: string, index: number) => {
    try {
      await copyText(renderedText)
      setCopyFailed(false)
      setCopiedIndex(index)
      track('copy', { scene: scene.id, tone: tone.id })
      window.setTimeout(() => setCopiedIndex(null), 1500)
    } catch {
      setCopyFailed(true)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        对方称呼
        <input
          value={addressee}
          onChange={(e) => setAddressee(e.target.value)}
          placeholder="不填就是「亲」"
          className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2"
        />
      </label>
      <ul className="flex flex-col gap-3">
        {batch.map((phrase, index) => {
          const rendered = renderTemplate(phrase.text, addressee)
          return (
            <li
              key={phrase.text}
              className="rounded-2xl bg-white p-4 shadow-sm"
              style={{ borderLeft: `4px solid ${scene.color}` }}
            >
              <p className="text-base leading-relaxed">{rendered}</p>
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => void handleCopy(rendered, index)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: scene.color }}
                >
                  {copiedIndex === index ? '已复制' : '复制'}
                </button>
                {renderSaveAction?.(rendered)}
              </div>
            </li>
          )
        })}
      </ul>
      {copyFailed && <p className="text-xs text-[#6b7280]">复制失败了，长按文字也能复制</p>}
      {phrases.length > BATCH_SIZE && (
        <button
          type="button"
          onClick={() => setBatchIndex((i) => i + 1)}
          className="py-2 text-sm text-[#6b7280]"
        >
          换一批
        </button>
      )}
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/refusal-generator test && pnpm --filter @viral/refusal-generator typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(refusal): 话术列表、称呼个性化与 generate/copy 埋点"
```

---

### Task 9: 「今日拒绝语录」卡三种皮 + 保存流程

**Files:**
- Create: `sites/refusal-generator/src/card/draw-quote-card.ts`, `sites/refusal-generator/src/components/save-quote-button.tsx`, `sites/refusal-generator/src/components/long-press-overlay.tsx`
- Test: `sites/refusal-generator/src/card/draw-quote-card.test.ts`, `sites/refusal-generator/src/components/save-quote-button.test.tsx`

**Interfaces:**
- Consumes: `renderCard`/`saveCard`/`track`/`type DrawFn`（shared）、`installCanvasStub`（Task 3）
- Produces:
  - `interface QuoteCardData { text: string; sceneId: string; sceneLabel: string; sceneColor: string; sceneIndex: number; allSceneColors: readonly string[]; toneId: string; toneLabel: string }`（`text` 是已替换称呼的最终文案）
  - `const CARD_COLORS`（三套皮的色板常量）
  - `wrapByLength(text: string, charsPerLine: number): string[]` — 按 code point 定宽折行（canvas 桩没有 measureText，中文等宽近似足够）
  - `makeQuoteCardDraw(data: QuoteCardData): DrawFn` — 按 toneId 分发：`wenyan` → 仿古竖排皮、`fafeng` → 高饱和 meme 皮、其余 → Bento 标准皮；三张皮都画「九格色块条 + 品牌文字」（签名元素上卡）
  - `<SaveQuoteButton data={QuoteCardData} />` — renderCard → saveCard(`refusal-quote.png`)；成功 `track('save_image', { scene, tone })`；long-press 弹 `<LongPressOverlay>`；异常 `track('export_error')` + 提示「保存失败了，直接截图也一样」
- 绘制约束：只用 canvas 桩支持的 API（fillRect/fillText/clearRect/scale 与 fillStyle/globalAlpha/font/textAlign），不用 strokeRect/measureText/rotate——仿古边框用 4 条细 fillRect 拼

- [ ] **Step 1: 写失败测试**

`sites/refusal-generator/src/card/draw-quote-card.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { makeQuoteCardDraw, wrapByLength, type QuoteCardData } from './draw-quote-card'

const SIZE = { width: 1080, height: 1440 }

const base: QuoteCardData = {
  text: '不借。我的钱也是一分一分挣的。',
  sceneId: 'jieqian',
  sceneLabel: '被借钱',
  sceneColor: '#0d9488',
  sceneIndex: 0,
  allSceneColors: [
    '#0d9488', '#ea580c', '#db2777', '#2563eb', '#7c3aed', '#dc2626', '#d97706', '#16a34a',
  ],
  toneId: 'yinggang',
  toneLabel: '直球硬刚',
}

function fakeCtx() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

const textsOf = (ctx: CanvasRenderingContext2D) =>
  (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))

describe('wrapByLength', () => {
  it('按定宽折行', () => {
    expect(wrapByLength('一二三四五六', 4)).toEqual(['一二三四', '五六'])
  })
  it('不足一行原样一行', () => expect(wrapByLength('短', 10)).toEqual(['短']))
  it('空串返回一个空行', () => expect(wrapByLength('', 10)).toEqual(['']))
  it('按 code point 切，emoji 不劈半', () => {
    expect(wrapByLength('😀😀😀', 2)).toEqual(['😀😀', '😀'])
  })
})

describe('makeQuoteCardDraw · Bento 标准皮（weiwan/yinggang/heihua）', () => {
  it('画正文、标题、场景语气标签与品牌条', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(base)(ctx, SIZE)
    const texts = textsOf(ctx)
    expect(texts.some((t) => t.includes('不借'))).toBe(true)
    expect(texts.some((t) => t.includes('今日拒绝语录'))).toBe(true)
    expect(texts.some((t) => t.includes('被借钱'))).toBe(true)
    expect(texts.some((t) => t.includes('拒绝话术生成器'))).toBe(true)
  })
  it('九格色块条上卡：fillRect ≥ 12 次（背景+卡面+色条+9 小格）', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(base)(ctx, SIZE)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(12)
  })
})

describe('makeQuoteCardDraw · 仿古竖排皮（wenyan）', () => {
  const data: QuoteCardData = {
    ...base,
    toneId: 'wenyan',
    toneLabel: '文言文',
    text: '非吾吝也，实囊中羞涩，爱莫能助。',
  }
  it('竖排：每个字单独 fillText，且落「拒」字印章', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(data)(ctx, SIZE)
    const texts = textsOf(ctx)
    expect(texts).toContain('非')
    expect(texts).toContain('助')
    expect(texts).toContain('拒')
    expect(texts.filter((t) => t.length === 1).length).toBeGreaterThanOrEqual(
      [...data.text].length,
    )
  })
})

describe('makeQuoteCardDraw · 发疯 meme 皮（fafeng）', () => {
  const data: QuoteCardData = {
    ...base,
    toneId: 'fafeng',
    toneLabel: '发疯文学',
    text: '实在抱歉，我的钱在我这儿也是好好的。',
  }
  it('正文双重描绘（洋红错位 + 墨黑主体）', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(data)(ctx, SIZE)
    const line = textsOf(ctx).filter((t) => t.includes('实在抱歉'))
    expect(line.length).toBeGreaterThanOrEqual(2)
  })
  it('带「今日拒绝语录!!!」贴条', () => {
    const ctx = fakeCtx()
    makeQuoteCardDraw(data)(ctx, SIZE)
    expect(textsOf(ctx).some((t) => t.includes('今日拒绝语录!!!'))).toBe(true)
  })
})
```

`sites/refusal-generator/src/components/save-quote-button.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import type { QuoteCardData } from '../card/draw-quote-card'
import { SaveQuoteButton } from './save-quote-button'

const data: QuoteCardData = {
  text: '不借。我的钱也是一分一分挣的。',
  sceneId: 'jieqian',
  sceneLabel: '被借钱',
  sceneColor: '#0d9488',
  sceneIndex: 0,
  allSceneColors: ['#0d9488', '#ea580c'],
  toneId: 'yinggang',
  toneLabel: '直球硬刚',
}

describe('SaveQuoteButton', () => {
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

  it('桌面：点击触发下载并埋点 save_image（带 scene/tone）', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveQuoteButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存卡片' }))
    expect(umamiSpy).toHaveBeenCalledWith('save_image', { scene: 'jieqian', tone: 'yinggang' })
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveQuoteButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存卡片' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveQuoteButton data={data} />)
    await userEvent.click(screen.getByRole('button', { name: '保存卡片' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/refusal-generator test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/refusal-generator/src/card/draw-quote-card.ts`：

```ts
import type { CardSize, DrawFn } from '@viral/shared'

export interface QuoteCardData {
  text: string
  sceneId: string
  sceneLabel: string
  sceneColor: string
  sceneIndex: number
  allSceneColors: readonly string[]
  toneId: string
  toneLabel: string
}

export const CARD_COLORS = {
  bentoBg: '#f2f3f5',
  bentoCard: '#ffffff',
  ink: '#1f2937',
  subtle: '#6b7280',
  paperBg: '#f5eeda',
  paperInk: '#2b2620',
  sealRed: '#b3352c',
  memeBg: '#ffe600',
  memeInk: '#111111',
  memePink: '#ff3d7f',
} as const

const BRAND_TEXT = '拒绝话术生成器 · 好好说不'
const SANS = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const SERIF = '"Songti SC", "Noto Serif SC", "SimSun", serif'

export function wrapByLength(text: string, charsPerLine: number): string[] {
  if (charsPerLine <= 0) return [text]
  const chars = [...text]
  if (chars.length === 0) return ['']
  const lines: string[] = []
  for (let i = 0; i < chars.length; i += charsPerLine) {
    lines.push(chars.slice(i, i + charsPerLine).join(''))
  }
  return lines
}

// 签名元素上卡：九格色块条（8 场景色 + 1 墨色许愿格），当前场景格高亮加高
function drawBrandStrip(
  ctx: CanvasRenderingContext2D,
  size: CardSize,
  data: QuoteCardData,
  textColor: string,
) {
  const tile = 28
  const gap = 10
  const colors = [...data.allSceneColors, CARD_COLORS.ink]
  const totalWidth = colors.length * (tile + gap) - gap
  const x0 = (size.width - totalWidth) / 2
  const y = size.height - 150
  colors.forEach((color, i) => {
    const active = i === data.sceneIndex
    ctx.globalAlpha = active ? 1 : 0.3
    ctx.fillStyle = color
    const h = active ? tile + 10 : tile
    ctx.fillRect(x0 + i * (tile + gap), y - (h - tile), tile, h)
  })
  ctx.globalAlpha = 1
  ctx.fillStyle = textColor
  ctx.font = `400 30px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 60)
}

// Bento 标准皮：冷灰白底 + 白卡 + 场景色条
function drawStandardSkin(ctx: CanvasRenderingContext2D, size: CardSize, data: QuoteCardData) {
  ctx.fillStyle = CARD_COLORS.bentoBg
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.fillStyle = CARD_COLORS.bentoCard
  ctx.fillRect(80, 160, size.width - 160, size.height - 420)
  ctx.fillStyle = data.sceneColor
  ctx.fillRect(80, 160, 24, size.height - 420)
  ctx.textAlign = 'left'
  ctx.fillStyle = CARD_COLORS.subtle
  ctx.font = `400 36px ${SANS}`
  ctx.fillText(`${data.sceneLabel} · ${data.toneLabel}`, 150, 260)
  ctx.fillStyle = CARD_COLORS.ink
  ctx.font = `700 64px ${SANS}`
  ctx.fillText('今日拒绝语录', 150, 380)
  ctx.font = `500 56px ${SANS}`
  wrapByLength(data.text, 13).forEach((line, i) => {
    ctx.fillText(line, 150, 520 + i * 88)
  })
  drawBrandStrip(ctx, size, data, CARD_COLORS.subtle)
}

// 仿古竖排皮：米黄纸 + 墨线边框 + 右起竖排 + 朱红「拒」印
function drawClassicalSkin(ctx: CanvasRenderingContext2D, size: CardSize, data: QuoteCardData) {
  ctx.fillStyle = CARD_COLORS.paperBg
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.fillStyle = CARD_COLORS.paperInk
  ctx.fillRect(60, 60, size.width - 120, 4)
  ctx.fillRect(60, size.height - 224, size.width - 120, 4)
  ctx.fillRect(60, 60, 4, size.height - 280)
  ctx.fillRect(size.width - 64, 60, 4, size.height - 280)
  ctx.textAlign = 'center'
  ctx.font = `500 60px ${SERIF}`
  const columns = wrapByLength(data.text, 12) // 每列 12 字，12*72=864px < 边框内高
  columns.forEach((column, colIndex) => {
    const x = size.width - 200 - colIndex * 96 // 列从右往左
    ;[...column].forEach((char, rowIndex) => {
      ctx.fillStyle = CARD_COLORS.paperInk
      ctx.fillText(char, x, 240 + rowIndex * 72)
    })
  })
  ctx.fillStyle = CARD_COLORS.sealRed
  ctx.fillRect(150, size.height - 440, 120, 120)
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 72px ${SERIF}`
  ctx.fillText('拒', 210, size.height - 352)
  ctx.fillStyle = CARD_COLORS.paperInk
  ctx.font = `400 34px ${SERIF}`
  ctx.fillText(`${data.sceneLabel} · ${data.toneLabel}`, size.width / 2, size.height - 190)
  drawBrandStrip(ctx, size, data, CARD_COLORS.paperInk)
}

// 发疯 meme 皮：荧光黄底 + 洋红贴条 + 双重描绘硬阴影
function drawUnhingedSkin(ctx: CanvasRenderingContext2D, size: CardSize, data: QuoteCardData) {
  ctx.fillStyle = CARD_COLORS.memeBg
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.fillStyle = CARD_COLORS.memePink
  ctx.fillRect(0, 120, size.width, 130)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 72px ${SANS}`
  ctx.fillText('今日拒绝语录!!!', size.width / 2, 210)
  ctx.font = `900 68px ${SANS}`
  wrapByLength(data.text, 13).forEach((line, i) => {
    const y = 430 + i * 96
    ctx.fillStyle = CARD_COLORS.memePink // 洋红错位打底 = 硬阴影
    ctx.fillText(line, size.width / 2 + 6, y + 6)
    ctx.fillStyle = CARD_COLORS.memeInk
    ctx.fillText(line, size.width / 2, y)
  })
  ctx.fillStyle = CARD_COLORS.memeInk
  ctx.fillRect(80, size.height - 270, 460, 70)
  ctx.textAlign = 'left'
  ctx.fillStyle = CARD_COLORS.memeBg
  ctx.font = `700 40px ${SANS}`
  ctx.fillText(`${data.sceneLabel} × ${data.toneLabel}`, 100, size.height - 222)
  drawBrandStrip(ctx, size, data, CARD_COLORS.memeInk)
}

export function makeQuoteCardDraw(data: QuoteCardData): DrawFn {
  return (ctx, size) => {
    if (data.toneId === 'wenyan') {
      drawClassicalSkin(ctx, size, data)
    } else if (data.toneId === 'fafeng') {
      drawUnhingedSkin(ctx, size, data)
    } else {
      drawStandardSkin(ctx, size, data)
    }
  }
}
```

`sites/refusal-generator/src/components/long-press-overlay.tsx`：

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
      <img src={dataUrl} alt="拒绝语录卡" className="max-h-[70vh] w-auto rounded-lg" />
      <p className="text-sm text-white">长按图片保存</p>
      <p className="text-xs text-[#9ca3af]">点击空白处关闭</p>
    </div>
  )
}
```

`sites/refusal-generator/src/components/save-quote-button.tsx`：

```tsx
import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import { makeQuoteCardDraw, type QuoteCardData } from '../card/draw-quote-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  data: QuoteCardData
}

export function SaveQuoteButton({ data }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeQuoteCardDraw(data))
      saveCard(canvas, {
        filename: 'refusal-quote.png',
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image', { scene: data.sceneId, tone: data.toneId })
    } catch {
      setFailed(true)
      track('export_error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSave}
        className="text-sm text-[#6b7280] underline underline-offset-4"
      >
        保存卡片
      </button>
      {failed && <p className="text-xs text-[#6b7280]">保存失败了，直接截图也一样</p>}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/refusal-generator test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(refusal): 今日拒绝语录卡三种皮与保存流程"
```

---

### Task 10: App 组装（选择状态 + scene/tone 埋点 + 页脚声明）

**Files:**
- Modify: `sites/refusal-generator/src/app.tsx`
- Test: `sites/refusal-generator/src/app.test.tsx`

**Interfaces:**
- Consumes: `SceneGrid`（6）、`TonePicker`（7）、`PhraseList`（8）、`SaveQuoteButton`（9）、`SCENES`/`TONES`/`PHRASES`（4）、`track`（shared）
- Produces: `<App />` — 状态 `sceneId: string | null` + `toneId: string | null`；选场景 `track('scene_selected', { scene })`，选语气 `track('tone_selected', { tone })`（矩阵热力）；两者齐备才渲染 PhraseList（`key` 用 `scene.id-tone.id` 重置内部状态），`renderSaveAction` 注入 SaveQuoteButton；页脚免责/定位声明常驻（全站唯一出现位置）

- [ ] **Step 1: 写失败测试** `sites/refusal-generator/src/app.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { App } from './app'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    setClipboard(undefined)
    vi.restoreAllMocks()
  })

  it('初始只有九宫格，无语气胶囊无话术', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /被借钱/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '委婉体面' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('对方称呼')).not.toBeInTheDocument()
  })

  it('选场景：上报 scene_selected 且语气胶囊出现', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    expect(umamiSpy).toHaveBeenCalledWith('scene_selected', { scene: 'jieqian' })
    expect(screen.getByRole('button', { name: '委婉体面' })).toBeInTheDocument()
  })

  it('选语气：上报 tone_selected、出 3 条话术并报 generate', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    await userEvent.click(screen.getByRole('button', { name: '直球硬刚' }))
    expect(umamiSpy).toHaveBeenCalledWith('tone_selected', { tone: 'yinggang' })
    expect(umamiSpy).toHaveBeenCalledWith('generate', { scene: 'jieqian', tone: 'yinggang' })
    expect(screen.getByText('不借。我的钱也是一分一分挣的。')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '复制' })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '保存卡片' })).toHaveLength(3)
  })

  it('复制全链路：点复制上报 copy（核心指标）', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    await userEvent.click(screen.getByRole('button', { name: '直球硬刚' }))
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(umamiSpy).toHaveBeenCalledWith('copy', { scene: 'jieqian', tone: 'yinggang' })
  })

  it('切换场景后话术跟着换', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /被借钱/ }))
    await userEvent.click(screen.getByRole('button', { name: '直球硬刚' }))
    await userEvent.click(screen.getByRole('button', { name: /被拉去团建/ }))
    expect(screen.getByText('占用周末的团建我不参加，工作日的我都配合。')).toBeInTheDocument()
    expect(
      screen.queryByText('不借。我的钱也是一分一分挣的。'),
    ).not.toBeInTheDocument()
  })

  it('页脚免责/定位声明常驻', () => {
    render(<App />)
    expect(screen.getByText(/话术仅供参考/)).toBeInTheDocument()
    expect(screen.getByText(/不上传任何数据/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/refusal-generator test src/app.test.tsx`
Expected: FAIL（app.tsx 还是占位）

- [ ] **Step 3: 实现** `sites/refusal-generator/src/app.tsx`

```tsx
import { useState } from 'react'
import { track } from '@viral/shared'
import { PHRASES } from './configs/phrases'
import { SCENES } from './configs/scenes'
import { TONES } from './configs/tones'
import { PhraseList } from './components/phrase-list'
import { SaveQuoteButton } from './components/save-quote-button'
import { SceneGrid } from './components/scene-grid'
import { TonePicker } from './components/tone-picker'

export function App() {
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [toneId, setToneId] = useState<string | null>(null)

  const scene = SCENES.find((s) => s.id === sceneId) ?? null
  const tone = TONES.find((t) => t.id === toneId) ?? null
  const phrases =
    scene && tone ? PHRASES.filter((p) => p.scene === scene.id && p.tone === tone.id) : []

  const handleSceneSelect = (id: string) => {
    track('scene_selected', { scene: id })
    setSceneId(id)
  }

  const handleToneSelect = (id: string) => {
    track('tone_selected', { tone: id })
    setToneId(id)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">拒绝话术生成器</h1>
        <p className="mt-1 text-sm text-[#6b7280]">选场景、挑语气，一键复制，好好说「不」。</p>
      </header>
      <div className="flex flex-1 flex-col gap-6">
        <SceneGrid selected={sceneId} onSelect={handleSceneSelect} />
        {scene && <TonePicker selected={toneId} onSelect={handleToneSelect} />}
        {scene && tone && (
          <PhraseList
            key={`${scene.id}-${tone.id}`}
            phrases={phrases}
            scene={scene}
            tone={tone}
            renderSaveAction={(renderedText) => (
              <SaveQuoteButton
                data={{
                  text: renderedText,
                  sceneId: scene.id,
                  sceneLabel: scene.label,
                  sceneColor: scene.color,
                  sceneIndex: SCENES.findIndex((s) => s.id === scene.id),
                  allSceneColors: SCENES.map((s) => s.color),
                  toneId: tone.id,
                  toneLabel: tone.label,
                }}
              />
            )}
          />
        )}
      </div>
      <footer className="pt-10 text-center text-xs text-[#9ca3af]">
        话术仅供参考，分寸请自行把握 · 所有内容本地生成，不上传任何数据
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + 全仓核验**

Run: `pnpm -r test && pnpm -r typecheck && pnpm --filter @viral/refusal-generator build`
Expected: 全 PASS，构建成功（build 日志先跑 lint 测试再 vite build）

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(refusal): App 组装、场景语气埋点与页脚免责"
```

---

### Task 11: 上线准备（预算核验 + 部署 + 手工验收）

**Files:**
- Modify: `README.md`（11 移入已上线表）、`sites/refusal-generator/index.html`（umami website-id）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: 体积预算核验**

Run: `pnpm --filter @viral/refusal-generator build`
查看 vite 输出的 gzip 列：JS + CSS gzip 合计须 < 100KB。超了先查依赖是否混入多余包（`pnpm --filter @viral/refusal-generator list --depth 0`）。

- [ ] **Step 2: 核验 zod 未混入站点 bundle**

```bash
grep -rl "ZodError" sites/refusal-generator/dist/assets/ && echo "FAIL: zod 进了 bundle" || echo "OK"
```

Expected: 输出 `OK`（站点运行时对 Phrase 只做 type-only import，schema/lint 只被测试文件引用，tree-shaking 后 zod 不应出现在产物里）。若 FAIL，检查 `src/configs/phrases.ts` 与站点组件是否出现了对 `phraseSchema`/`lintPhraseLibrary` 的运行时 import。

- [ ] **Step 3: 本地真机冒烟**

Run: `pnpm --filter @viral/refusal-generator dev --host`
手机连同一 Wi-Fi 打开 `http://<局域网IP>:5173`，走一遍：选场景 → 选语气 → 填称呼 → 复制（验证 toast/按钮态）→ 保存三种皮的卡（委婉=标准皮、文言文=竖排仿古皮、发疯文学=meme 皮）。

- [ ] **Step 4: 【手工·需用户】创建 umami 站点**

在 umami 后台（与 life-grid 同一账号）Add website → `refusal-generator` → 拿到 website-id → 替换 `sites/refusal-generator/index.html` 里的 `TO_BE_FILLED`。此步骤需要用户账号，执行者停下来向用户要。**替换前不得执行 Step 5。**

- [ ] **Step 5: 【手工·需用户】部署 Cloudflare Pages**

```bash
pnpm dlx wrangler login        # 需要用户浏览器授权
pnpm dlx wrangler pages project create refusal-generator --production-branch main
pnpm --filter @viral/refusal-generator build
pnpm dlx wrangler pages deploy sites/refusal-generator/dist --project-name refusal-generator
```

产出 `https://refusal-generator.pages.dev`（实际子域以 wrangler 输出为准）。

- [ ] **Step 6: 四环境手工验收**

- [ ] iPhone 微信内打开 → 复制成功（clipboard API 被拒时走 execCommand 降级）、保存走长按路径
- [ ] 安卓微信内打开 → 同上
- [ ] iOS Safari → 复制成功、保存走长按路径
- [ ] 桌面 Chrome → 复制成功、卡片直接下载
- [ ] 三种卡片皮各保存一张，九宫格缩略图下品牌条与正文仍可辨识
- [ ] umami 后台能看到 `visit`(pageview) / `scene_selected` / `tone_selected` / `generate` / `copy` / `save_image` 事件
- [ ] 许愿格点击能拉起邮件客户端（收件人 afu886.cn@gmail.com）

- [ ] **Step 7: 更新 README 状态并提交推送**

README：把候选池表中 11 行移到「站点路线图」主表，状态标 `🚀 已上线（<实际 pages.dev 域名>）`；候选池表删除该行。

```bash
git add -A && git commit -m "chore: refusal-generator 上线，更新状态与 umami 配置" && git push
```

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §3 场景九宫格/语气胶囊/3 条候选/称呼变量（Task 6/7/8）、§3 矩阵 8×5×每组 3 条 = 120 条全部成文（Task 4）、§5 语气换皮卡片（文言文竖排仿古/发疯高饱和 meme/标准皮，Task 9 三张皮全实现）、§6 埋点 copy 核心指标 + scene_selected/tone_selected 热力（Task 8/10，复制率口径写进 Global Constraints）、§7 三项测试（模板变量单测 Task 1、文案 lint Task 2/4、微信复制兼容 Task 5 + Task 11 手工验收）、§8 风险（许愿入口 Task 6 mailto；文案质量标准写死在 Task 4 引言）。00a 硬约束（gzip、14px、reduced-motion——本站无动效）与 Bento 落地要点（1×1/2×1 混排）均入 Global Constraints。v2 轻 AI 不在本计划范围（设计文档明确先验证 v1 复制率）。
- **发现的设计文档矛盾/张力**（执行者无需处理，已在计划内消解）：
  1. 11 文档 §1「一句话」只列 4 种语气，§3 矩阵是 5 种（含职场黑话）——按任务指示以 §3 为准。
  2. §3「3 条候选，可换一批」与「每组 3 条」并存：v1 每组恰好 3 条时「换一批」无意义——计划按 `phrases.length > BATCH_SIZE` 隐藏按钮，pickBatch 已支持 v1.1 扩容后自动生效（Task 7/8 注明）。
  3. 00a §1.2 要求签名元素出现在分享卡片上，但 11 文档 §5 卡片规格未提——计划以「九格色块条」补齐到三种皮的品牌条（Task 9 drawBrandStrip）。
  4. 00 §4.3 写的是 umami cloud 脚本，life-grid 实际落地为自托管 `u.js` + `_worker.js` 同源代理——本站随实践（任务指示亦如此），工厂文档口径已过时。
  5. 本站核心指标复制率 15% 与工厂 00 §3.1 保存率 1%/5% 决策线并行——11 文档 §6 已自行声明特殊口径，观察期决策以复制率为主、保存率为辅。
- **占位符扫描**：全文无 TBD/TODO；`TO_BE_FILLED` 是工厂约定的 umami website-id 待填标记（life-grid 同款），由 Task 11 Step 4 手工步骤闭环，且 Step 4 明确「替换前不得部署」。Task 11 两个【手工·需用户】步骤为环境依赖，非占位。
- **类型一致性**：`Phrase`（Task 2 定义，4/8 消费，站点侧均 type-only）、`PhraseLintConfig/PhraseLintIssue`（Task 2 定义，4 消费）、`Scene/Tone`（Task 4 定义，6/7/8/10 消费）、`CopyMethod`（Task 5 定义，8 消费 copyText）、`BATCH_SIZE/pickBatch`（Task 7 定义，8 消费）、`QuoteCardData/makeQuoteCardDraw/wrapByLength`（Task 9 定义，10 消费）、shared 的 `DrawFn/CardSize/renderCard/saveCard/track`（既有 API，9 消费，签名与 `packages/shared/src/index.ts` 逐一核对一致）。
- **canvas 桩约束核对**：三种皮只用 `fillRect/fillText/clearRect/scale` 与 `fillStyle/globalAlpha/font/textAlign`（`test/canvas-stub.ts` 的 RecordingCtx 形状），未用 strokeRect/measureText/rotate/roundRect——仿古边框用 4 条细 fillRect、折行用 `wrapByLength` 定宽近似。
- **内容质检**：120 条逐条复核 ≤80 字（含占位符原文最长 37 字，schema `.max(80)` + lint 双保险）；`{对方称呼}` 出现在 5 条委婉体面档（借钱/砍价/相亲/份子钱/搬家），语法均合法；发疯文学档按「解压看的」定位放飞，其余四档过「敢真的发出去」标准（委婉档给台阶、直球档不辱人、文言档成文言、黑话档带 ROI/排期/对齐味）。
- **埋点隐私**：所有事件 data 只含 scene/tone id 枚举值，称呼输入永不上报（Task 8 实现与测试均如此约束）。





