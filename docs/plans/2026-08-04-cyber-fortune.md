# 赛博求签（08）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 上线站点 08「赛博求签」（S 级，纯前端，复访型）：昵称 + 日期哈希确定性抽签 → 打工人电子黄历签文卡（等级/签诗/宜忌/贵人小人/streak）→ 保存分享。同时把确定性随机工具沉淀进 `packages/shared`。

**Architecture:** 确定性随机基元（fnv1a hash + seed 派生取数序列 + pickOne/pickN 不重复抽取）放 `packages/shared/src/seeded/`——这是架构决策：后续站点（19 MBTI 日历等「同输入同输出」类站点）会复用；签文业务逻辑（等级加权、签池、冲突黑名单、streak、节令皮）全部留在 `sites/cyber-fortune` 站内。所有含日期的计算显式传入 `Date`，时区固定 UTC+8（Date 的 UTC 方法 + 8 小时偏移，全站唯一实现在 `date-utils.ts`）。canvas 只做卡片渲染层，签文结果屏是纯 DOM（竖排靠 `writing-mode: vertical-rl`）。TDD：每个纯函数与组件先写失败测试。

**Tech Stack:** pnpm workspace · Vite · React 19 · TypeScript(strict) · Tailwind v4 · Vitest + Testing Library(jsdom) · Cloudflare Pages（`public/_worker.js` 同源代理 umami 上报）

## Global Constraints

（来自 [08-cyber-fortune.md](../08-cyber-fortune.md)、[00-factory-design.md](../00-factory-design.md)、[00a-style-map.md](../00a-style-map.md) 与 life-grid 实施验证，所有任务默认遵守）

**工程**

- 站点位于 `sites/cyber-fortune`，包名 `@viral/cyber-fortune`；只允许依赖 `@viral/shared` 与 react/react-dom，不引入任何其他运行时依赖
- 包管理只用 pnpm；测试命令统一 `pnpm --filter <pkg> test`
- vitest 配置必须 `globals: true` + `setupFiles: ['./test/setup.ts']`（对齐 life-grid 现状）；站点依赖版本对齐 life-grid：vitest `^3.2.7`、`@testing-library/jest-dom` `^6.10.0`（完整版本表见 Task 3，照抄不升级）。`packages/shared` 现存 vitest `^4.1.10`，不动它的版本
- `public/_worker.js` 与 `public/u.js` 从 `sites/life-grid/public/` 用 `cp` 复制，不改内容；`index.html` 与 life-grid 同款 umami 接法（`/u.js` + `data-host-url="/"`），website-id 先写 `TO_BE_FILLED`，Task 14 手工替换
- favicon 按黄历风现写（黄历纸底 + 朱红边框 + 签筒签支，见 Task 3），不复制 life-grid 的
- 首屏资源 gzip 后 < 100KB；不引入 UI 组件库、不引入日期库、不打包 webfont（系统字族兜底）
- 提交信息用 conventional commits（feat/fix/test/chore/docs），不加 Co-Authored-By
- 不可变数据风格：更新对象一律返回新副本，不原地修改（`pickN` 不得改动传入数组）

**时间与确定性**

- 时区固定 UTC+8：日期键一律经 `dateKeyUTC8(date)`（Date 的 UTC 方法 + 8h 毫秒偏移，实现见 Task 4）；禁止在业务代码用 `getFullYear`/`getMonth`/`getDate` 等本地时区方法生成日期键
- 涉及「今天」的函数一律显式传入 `Date` 参数；`new Date()` 只允许出现在 `app.tsx` 组装层一处
- seed 规则：`fnv1a(normalize(昵称) + '|' + 'YYYY-MM-DD'(UTC+8) + '|' + POOL_VERSION)`；`normalize` = trim + NFC + 英文小写。与设计文档 §5 的差异：拼接处加 `|` 分隔符，防「昵称尾部像日期」的拼接歧义（如 `阿福2` + `026-…`），已在 Self-Review 记录
- 所有抽取（等级/签诗/宜/忌/人物）从同一 seed 派生的**同一个**取数序列按固定顺序取（顺序：等级 → 签诗 → 宜×2 → 忌×2 → 人物×2）；改动顺序即破坏「同人同天同签」，禁止
- `POOL_VERSION` 运维约定：改签池必须同 commit bump 版本号；发布尽量选 UTC+8 凌晨窗口，近似实现设计文档「池子更新次日生效」（客户端纯前端无法强制冻结，这是运维约定，已在 Self-Review 记录）

**内容与合规**

- 内容量：产品设计锁定验证版为签诗 40 / 宜 30 / 忌 30 / 人物 20；只有 D7 复访成立后才扩到 100 / 50 / 50 / 30，扩容不属于本计划
- 等级加权：大吉 15% / 中吉 30% / 小吉 30% / 平 15% / 小凶 10%；无大凶；小凶签诗必须全库最好笑
- 免责声明「签文为程序生成的玩梗内容，不构成任何预测与建议」**只放页脚一处**；分享卡片上不出现（卡片测试显式断言不含）
- 全站去宗教化：内容池与 UI 文案不出现「佛 / 拜 / 神 / 仙 / 菩萨 / 道士 / 烧香 / 开光 / 符咒 / 显灵 / 保佑」等字眼（单字「佛」「拜」「神」「仙」全库禁用），定位「电子黄历文学」；签池红线（医疗/投资/婚恋决策建议式表述）由构建期 lint 扫描（词表见 Task 6）
- 昵称与 streak 只存 localStorage，绝不上传；埋点不带昵称等个人数据

**视觉（新中式黄历，签名元素 = 竖排签诗 + 等级大字）**

- 全站色板（禁止套用 life-grid 的 `#f7f4ec` / `#c8392b` / `#8c8678`）：
  - 黄历纸底 `#f4e8cd`、纸纹线 `#e3d2ab`、墨黑 `#2b2620`、淡墨 `#6f6353`、朱红 `#bc3a23`
  - 等级主色（卡片与结果屏同用，五色互异是「群内对比」的视觉基础）：大吉 `#bc3a23`（朱红）/ 中吉 `#b8722d`（琥珀）/ 小吉 `#3f7a52`（竹青）/ 平 `#6f6353`（淡墨）/ 小凶 `#3e4f88`（靛青）
- 竖排用 `writing-mode: vertical-rl`；签诗每行 ≤ 8 字（lint 兜底），保证移动端行宽不溢出；最小可读字号 14px
- 动效只出现在签名时刻（长按蓄力抖动 + 掉签 1.5s）；尊重 `prefers-reduced-motion`（CSS 全局压掉动画时长，JS 跳过掉签等待）

**埋点与指标**

- 事件：`visit`（umami pageview 自带）、`generate`（= 掉签出结果，data 带 `level`）、`save_image`（保存卡片）、`streak_day`（data 带当前 streak 值，**仅当日首签上报**，同日重复求签不重报，避免复访分布被污染）、`export_error`（卡片导出失败）
- 本站生死指标除保存率外，另一个是 **7 日复访率（预期 > 15%）**：用 umami 里 `streak_day` 事件 `streak ≥ 2` 的占比作为复访 proxy 观察
- 分享卡片固定 1080×1440（3:4），走 shared `renderCard`/`saveCard`

**功能边界（v1 明确不做）**

- 不做补签、不做提醒推送、不做账号；清缓存断 streak 接受，卡片文案不渲染「断签惩罚」概念
- 节令皮系统只做配置结构与命中逻辑（日期区间 → 皮肤 id），皮肤本体（视觉与专属签池）v2 再做；v1 不接 UI 也不上报

**文件全景**（Create 均相对仓库根 `/Users/ahs/Documents/vibe-coding/viral-sites/`）：

```
packages/shared/
  src/seeded/fnv1a.ts (+test)        # FNV-1a 32 位字符串 hash
  src/seeded/sequence.ts (+test)     # seededSequence / pickOne / pickN
  src/index.ts (modify)
sites/cyber-fortune/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
  public/_worker.js  public/u.js     # 从 life-grid cp
  public/favicon.svg                 # 黄历风新写
  test/setup.ts  test/canvas-stub.ts # 桩比 life-grid 多 stroke/rotate 系方法
  src/main.tsx  src/app.tsx (+test)  src/index.css
  src/content/pools.ts (+test)       # 签诗40/宜30/忌30/人物20/冲突对/版本号/等级表
  src/content/blacklist.ts           # 内容红线词表
  src/lib/pool-lint.ts (+test)       # 构建期签池 lint
  src/lib/date-utils.ts (+test)      # UTC+8 日期键
  src/lib/fortune-math.ts (+test)    # 确定性抽签引擎
  src/lib/streak.ts (+test)          # streak 纯逻辑
  src/lib/storage.ts (+test)         # localStorage 封装（昵称/streak）
  src/lib/season.ts (+test)          # 节令皮配置与命中
  src/components/draw-screen.tsx (+test)      # 昵称 + 长按蓄力 + 掉签
  src/components/fortune-view.tsx (+test)     # 签文结果屏
  src/components/save-card-button.tsx (+test)
  src/components/long-press-overlay.tsx
  src/card/draw-fortune-card.ts (+test)       # 1080×1440 黄历卡
```

---

### Task 1: shared·seeded — fnv1a 字符串 hash

**Files:**
- Create: `packages/shared/src/seeded/fnv1a.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/seeded/fnv1a.test.ts`

**Interfaces:**
- Produces: `fnv1a(input: string): number` — FNV-1a 32 位，按 UTF-8 字节计算，返回 uint32（`>>> 0`）；同输入同输出，跨引擎一致（只用整数运算与 `Math.imul`）

- [ ] **Step 1: 写失败测试** `packages/shared/src/seeded/fnv1a.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { fnv1a } from './fnv1a'

describe('fnv1a', () => {
  it('标准测试向量（FNV-1a 32 位参考值）', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
    expect(fnv1a('foobar')).toBe(0xbf9cf968)
  })

  it('中文按 UTF-8 字节参与运算，同输入同输出', () => {
    const first = fnv1a('阿福|2026-08-04|v1')
    const second = fnv1a('阿福|2026-08-04|v1')
    expect(first).toBe(second)
    expect(Number.isInteger(first)).toBe(true)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThanOrEqual(0xffffffff)
  })

  it('不同输入产生不同 hash（抽样）', () => {
    expect(fnv1a('阿福|2026-08-04|v1')).not.toBe(fnv1a('阿福|2026-08-05|v1'))
    expect(fnv1a('阿福|2026-08-04|v1')).not.toBe(fnv1a('阿福|2026-08-04|v2'))
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL（fnv1a 未定义）

- [ ] **Step 3: 实现** `packages/shared/src/seeded/fnv1a.ts`

```ts
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** FNV-1a 32 位 hash，按 UTF-8 字节计算，返回 uint32。 */
export function fnv1a(input: string): number {
  const bytes = new TextEncoder().encode(input)
  let hash = FNV_OFFSET_BASIS
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}
```

`packages/shared/src/index.ts` 追加：

```ts
export { fnv1a } from './seeded/fnv1a'
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): seeded/fnv1a 确定性字符串 hash"
```

---

### Task 2: shared·seeded — 确定性取数序列与抽取（含统计测试）

**Files:**
- Create: `packages/shared/src/seeded/sequence.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/seeded/sequence.test.ts`

**Interfaces:**
- Produces:
  - `type SeededSequence = () => number` — 每次调用返回 `[0, 1)` 的确定性数
  - `seededSequence(seed: number): SeededSequence` — mulberry32，同 seed 同序列
  - `pickOne<T>(next: SeededSequence, pool: readonly T[]): T` — 空池抛错
  - `pickN<T>(next: SeededSequence, pool: readonly T[], n: number): T[]` — 不重复抽取，不改动传入数组；`n > pool.length` 抛错

- [ ] **Step 1: 写失败测试** `packages/shared/src/seeded/sequence.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { pickN, pickOne, seededSequence } from './sequence'

describe('seededSequence', () => {
  it('同 seed 产生完全相同的序列', () => {
    const a = seededSequence(12345)
    const b = seededSequence(12345)
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('不同 seed 序列不同', () => {
    const a = seededSequence(1)
    const b = seededSequence(2)
    expect(Array.from({ length: 5 }, () => a())).not.toEqual(
      Array.from({ length: 5 }, () => b()),
    )
  })

  it('取值均在 [0, 1)', () => {
    const next = seededSequence(999)
    for (let i = 0; i < 1000; i += 1) {
      const v = next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('pickOne', () => {
  it('确定性：同 seed 同结果', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']
    expect(pickOne(seededSequence(7), pool)).toBe(pickOne(seededSequence(7), pool))
  })

  it('空池抛错', () => {
    expect(() => pickOne(seededSequence(1), [])).toThrow('pickOne: empty pool')
  })

  it('分布均匀性：1000 次抽样，10 元素池每个命中 60~140 次（期望 100）', () => {
    const pool = Array.from({ length: 10 }, (_, i) => i)
    const next = seededSequence(42)
    const counts = new Map<number, number>()
    for (let i = 0; i < 1000; i += 1) {
      const v = pickOne(next, pool)
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    for (const item of pool) {
      const c = counts.get(item) ?? 0
      expect(c).toBeGreaterThanOrEqual(60)
      expect(c).toBeLessThanOrEqual(140)
    }
  })
})

describe('pickN', () => {
  it('不重复且长度正确', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f']
    const out = pickN(seededSequence(3), pool, 3)
    expect(out).toHaveLength(3)
    expect(new Set(out).size).toBe(3)
  })

  it('确定性：同 seed 同结果', () => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(pickN(seededSequence(11), pool, 4)).toEqual(pickN(seededSequence(11), pool, 4))
  })

  it('不改动传入数组（不可变）', () => {
    const pool = ['a', 'b', 'c', 'd']
    const snapshot = [...pool]
    pickN(seededSequence(5), pool, 2)
    expect(pool).toEqual(snapshot)
  })

  it('n 超过池子大小抛错', () => {
    expect(() => pickN(seededSequence(1), ['a'], 2)).toThrow('pickN')
  })

  it('分布覆盖：500 次 pickN(3/6)，每个元素入选 180~320 次（期望 250）', () => {
    const pool = [0, 1, 2, 3, 4, 5]
    const next = seededSequence(2026)
    const counts = new Map<number, number>()
    for (let i = 0; i < 500; i += 1) {
      for (const v of pickN(next, pool, 3)) {
        counts.set(v, (counts.get(v) ?? 0) + 1)
      }
    }
    for (const item of pool) {
      const c = counts.get(item) ?? 0
      expect(c).toBeGreaterThanOrEqual(180)
      expect(c).toBeLessThanOrEqual(320)
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/shared test`
Expected: FAIL

- [ ] **Step 3: 实现** `packages/shared/src/seeded/sequence.ts`

```ts
export type SeededSequence = () => number

/** mulberry32：从 uint32 seed 派生确定性 [0,1) 序列，跨引擎一致。 */
export function seededSequence(seed: number): SeededSequence {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickOne<T>(next: SeededSequence, pool: readonly T[]): T {
  if (pool.length === 0) throw new Error('pickOne: empty pool')
  return pool[Math.floor(next() * pool.length)]
}

/** 不重复抽取 n 个；不改动传入数组。 */
export function pickN<T>(next: SeededSequence, pool: readonly T[], n: number): T[] {
  if (n > pool.length) throw new Error(`pickN: need ${n} from pool of ${pool.length}`)
  const rest = [...pool]
  const out: T[] = []
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(next() * rest.length)
    out.push(rest[idx])
    rest.splice(idx, 1)
  }
  return out
}
```

`packages/shared/src/index.ts` 追加：

```ts
export { seededSequence, pickOne, pickN, type SeededSequence } from './seeded/sequence'
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shared): seeded 确定性取数序列与不重复抽取"
```

---

### Task 3: cyber-fortune 站点脚手架

**Files:**
- Create: `sites/cyber-fortune/package.json`, `sites/cyber-fortune/tsconfig.json`, `sites/cyber-fortune/vite.config.ts`, `sites/cyber-fortune/vitest.config.ts`, `sites/cyber-fortune/index.html`, `sites/cyber-fortune/public/favicon.svg`, `sites/cyber-fortune/src/main.tsx`, `sites/cyber-fortune/src/app.tsx`, `sites/cyber-fortune/src/index.css`, `sites/cyber-fortune/test/setup.ts`, `sites/cyber-fortune/test/canvas-stub.ts`
- Copy: `sites/life-grid/public/_worker.js` → `sites/cyber-fortune/public/_worker.js`，`sites/life-grid/public/u.js` → `sites/cyber-fortune/public/u.js`

**Interfaces:**
- Consumes: `@viral/shared`（workspace 依赖）
- Produces: 可 build 的 Vite React 站点；`test/canvas-stub.ts` 的 `installCanvasStub(): RecordingCtx`（比 life-grid 版多 stroke/rotate 系方法，供卡片印章绘制测试）

- [ ] **Step 1: 建包（package.json 版本对齐 life-grid，写死后统一 install）**

`sites/cyber-fortune/package.json`：

```json
{
  "name": "@viral/cyber-fortune",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@viral/shared": "workspace:*",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@testing-library/jest-dom": "^6.10.0",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^6.0.5",
    "jsdom": "^30.0.1",
    "tailwindcss": "^4.3.3",
    "typescript": "^7.0.2",
    "vite": "^8.2.0",
    "vitest": "^3.2.7"
  }
}
```

（build 脚本 Task 6 会加入签池 lint 门禁，此处先与 life-grid 一致。）

Run: `cd /Users/ahs/Documents/vibe-coding/viral-sites && pnpm install`
Expected: 安装成功，workspace 识别 `@viral/cyber-fortune`

- [ ] **Step 2: 配置文件**

`sites/cyber-fortune/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client", "@testing-library/jest-dom"] },
  "include": ["src", "test"]
}
```

`sites/cyber-fortune/vite.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`sites/cyber-fortune/vitest.config.ts`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
})
```

`sites/cyber-fortune/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: 复制公共静态文件 + 新写 favicon**

Run:

```bash
mkdir -p /Users/ahs/Documents/vibe-coding/viral-sites/sites/cyber-fortune/public
cp /Users/ahs/Documents/vibe-coding/viral-sites/sites/life-grid/public/_worker.js \
   /Users/ahs/Documents/vibe-coding/viral-sites/sites/life-grid/public/u.js \
   /Users/ahs/Documents/vibe-coding/viral-sites/sites/cyber-fortune/public/
```

`sites/cyber-fortune/public/favicon.svg`（黄历风：纸底 + 朱红框 + 签筒里一支朱头签）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#f4e8cd"/>
  <rect x="5" y="5" width="54" height="54" fill="none" stroke="#bc3a23" stroke-width="4"/>
  <rect x="22" y="30" width="20" height="22" rx="4" fill="none" stroke="#2b2620" stroke-width="4"/>
  <rect x="29" y="12" width="6" height="24" rx="2" fill="#2b2620"/>
  <rect x="27" y="8" width="10" height="8" rx="2" fill="#bc3a23"/>
</svg>
```

- [ ] **Step 4: index.html / 样式 / 入口**

`sites/cyber-fortune/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f4e8cd" />
    <title>赛博求签 — 打工人电子黄历，一天一签</title>
    <meta
      name="description"
      content="输入昵称求一支今日签：宜摸鱼，忌当出头鸟，今日贵人是食堂阿姨。签文为程序生成的玩梗内容，每天一签，连着求还有惊喜。"
    />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <!-- umami 自托管脚本 + 同源上报（data-host-url="/" → POST /api/send，由 _worker.js 代理转发）。
         website-id 上线前由 Task 14 手工步骤替换 TO_BE_FILLED。 -->
    <script defer src="/u.js" data-website-id="TO_BE_FILLED" data-host-url="/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`sites/cyber-fortune/src/index.css`：

```css
@import 'tailwindcss';

:root {
  color-scheme: light;
  --cf-paper: #f4e8cd;
  --cf-paper-line: #e3d2ab;
  --cf-ink: #2b2620;
  --cf-ink-faded: #6f6353;
  --cf-vermilion: #bc3a23;
}

body {
  background-color: var(--cf-paper);
  /* 黄历纸：细横纹铺底，纯 CSS 不用图 */
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0 30px,
    rgba(227, 210, 171, 0.55) 30px 31px
  );
  color: var(--cf-ink);
  font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

.font-serif-cn {
  font-family: 'Songti SC', 'Noto Serif SC', 'SimSun', serif;
}

/* 竖排签诗：vertical-rl 下块级子元素从右往左排，首行在最右，符合传统阅读序 */
.vertical-text {
  writing-mode: vertical-rl;
  letter-spacing: 0.18em;
}

/* 签筒 */
.cf-tube {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 7rem;
  height: 8rem;
  border: 3px solid var(--cf-ink);
  border-radius: 0 0 2.5rem 2.5rem;
  background: var(--cf-paper);
  color: var(--cf-vermilion);
  box-shadow: inset 0 -10px 0 rgba(227, 210, 171, 0.7);
}

.cf-stick {
  display: block;
  width: 0.5rem;
  height: 3.5rem;
  border-radius: 0.25rem 0.25rem 0 0;
  background: var(--cf-ink);
}

.cf-stick-tall {
  height: 4.5rem;
  background: var(--cf-vermilion);
}

.cf-fall-stick {
  width: 0.5rem;
  height: 4.5rem;
  border-radius: 0.25rem;
  background: var(--cf-vermilion);
  animation: cf-fall 1.5s ease-in forwards;
}

/* 「虔诚」印章（结果屏 DOM 版） */
.cf-stamp {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border: 3px solid var(--cf-vermilion);
  border-radius: 0.25rem;
  color: var(--cf-vermilion);
  font-weight: 700;
  transform: rotate(-12deg);
}

@keyframes cf-shake {
  0%,
  100% {
    rotate: 0deg;
  }
  25% {
    rotate: -3deg;
  }
  75% {
    rotate: 3deg;
  }
}

@keyframes cf-fall {
  from {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  to {
    transform: translateY(140px) rotate(18deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

`sites/cyber-fortune/src/main.tsx`：

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

`sites/cyber-fortune/src/app.tsx`（占位，Task 13 替换）：

```tsx
export function App() {
  return <main className="mx-auto min-h-dvh max-w-md px-6 py-10">赛博求签</main>
}
```

`sites/cyber-fortune/test/canvas-stub.ts`（比 life-grid 版多 stroke/rotate 系方法，卡片印章需要）：

```ts
import { vi } from 'vitest'

export interface RecordingCtx {
  fillRect: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  strokeRect: ReturnType<typeof vi.fn>
  scale: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  translate: ReturnType<typeof vi.fn>
  rotate: ReturnType<typeof vi.fn>
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  globalAlpha: number
  font: string
  textAlign: string
}

export function makeRecordingCtx(): RecordingCtx {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  }
}

export function installCanvasStub(): RecordingCtx {
  const ctx = makeRecordingCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}
```

- [ ] **Step 5: 验证构建**

Run: `pnpm --filter @viral/cyber-fortune build`
Expected: 构建成功，产出 `sites/cyber-fortune/dist/`，其中含 `_worker.js`、`u.js`、`favicon.svg`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): 站点脚手架（黄历纸样式/umami/公共 worker）"
```

---

### Task 4: date-utils — UTC+8 日期键

**Files:**
- Create: `sites/cyber-fortune/src/lib/date-utils.ts`
- Test: `sites/cyber-fortune/src/lib/date-utils.test.ts`

**Interfaces:**
- Produces:
  - `dateKeyUTC8(now: Date): string` — 返回该时刻在 UTC+8 时区的 `YYYY-MM-DD`；实现 = 时间戳 +8h 后取 UTC 字段，与运行环境本地时区无关
  - `yesterdayKeyUTC8(now: Date): string` — 该时刻 UTC+8「昨天」的日期键（-24h 后取键，天然处理跨月/跨年）

- [ ] **Step 1: 写失败测试** `sites/cyber-fortune/src/lib/date-utils.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { dateKeyUTC8, yesterdayKeyUTC8 } from './date-utils'

describe('dateKeyUTC8', () => {
  it('UTC 15:59 仍是 UTC+8 的当天 23:59', () => {
    expect(dateKeyUTC8(new Date(Date.UTC(2026, 7, 3, 15, 59)))).toBe('2026-08-03')
  })

  it('UTC 16:00 已是 UTC+8 的次日 00:00（换签时刻）', () => {
    expect(dateKeyUTC8(new Date(Date.UTC(2026, 7, 3, 16, 0)))).toBe('2026-08-04')
  })

  it('月/日补零', () => {
    expect(dateKeyUTC8(new Date(Date.UTC(2026, 0, 5, 4, 0)))).toBe('2026-01-05')
  })

  it('跨年边界：UTC 12-31 16:00 → UTC+8 01-01', () => {
    expect(dateKeyUTC8(new Date(Date.UTC(2025, 11, 31, 16, 0)))).toBe('2026-01-01')
  })
})

describe('yesterdayKeyUTC8', () => {
  it('普通日期', () => {
    expect(yesterdayKeyUTC8(new Date(Date.UTC(2026, 7, 4, 4, 0)))).toBe('2026-08-03')
  })

  it('跨月：9-01 的昨天是 8-31', () => {
    expect(yesterdayKeyUTC8(new Date(Date.UTC(2026, 8, 1, 4, 0)))).toBe('2026-08-31')
  })

  it('跨年：UTC+8 的 2026-01-01 昨天是 2025-12-31', () => {
    expect(yesterdayKeyUTC8(new Date(Date.UTC(2025, 11, 31, 16, 0)))).toBe('2025-12-31')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/cyber-fortune/src/lib/date-utils.ts`

```ts
const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** 该时刻在 UTC+8 的日期键 YYYY-MM-DD；与运行环境本地时区无关。 */
export function dateKeyUTC8(now: Date): string {
  const shifted = new Date(now.getTime() + UTC8_OFFSET_MS)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 该时刻在 UTC+8 的「昨天」日期键；-24h 后取键，天然处理跨月/跨年。 */
export function yesterdayKeyUTC8(now: Date): string {
  return dateKeyUTC8(new Date(now.getTime() - DAY_MS))
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): UTC+8 日期键纯函数"
```

---

### Task 5: 签文内容池（核心资产，内容全部成文）

**Files:**
- Create: `sites/cyber-fortune/src/content/pools.ts`
- Test: `sites/cyber-fortune/src/content/pools.test.ts`

**Interfaces:**
- Produces（后续任务大量依赖，签名必须一致）:
  - `type FortuneLevel = '大吉' | '中吉' | '小吉' | '平' | '小凶'`
  - `interface LevelMeta { id: FortuneLevel; weight: number; accent: string }`
  - `const LEVELS: readonly LevelMeta[]`（顺序即权重表顺序，权重合计 100）
  - `levelMeta(id: FortuneLevel): LevelMeta`
  - `interface Poem { id: string; level: FortuneLevel; lines: readonly [string, string] }`
  - `interface PoolItem { id: string; text: string }`
  - `interface ConflictPair { yi: string; ji: string }`（按 id 引用）
  - `interface Pools { poems: readonly Poem[]; yi: readonly PoolItem[]; ji: readonly PoolItem[]; people: readonly PoolItem[]; conflicts: readonly ConflictPair[] }`
  - `const POOL_VERSION = 'v1'`、`const POOLS: Pools`
- 内容规格：签诗 40（大吉 6 / 中吉 10 / 小吉 10 / 平 6 / 小凶 8，每行 ≤ 8 字）、宜 30、忌 30、人物 20；冲突对 4 组（含设计文档例子「宜准点下班 × 忌准点下班」的同文互斥）

- [ ] **Step 1: 写失败测试** `sites/cyber-fortune/src/content/pools.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { LEVELS, POOLS, POOL_VERSION, levelMeta } from './pools'

describe('签池形状', () => {
  it('首发规模：签诗 40 / 宜 30 / 忌 30 / 人物 20', () => {
    expect(POOLS.poems).toHaveLength(40)
    expect(POOLS.yi).toHaveLength(30)
    expect(POOLS.ji).toHaveLength(30)
    expect(POOLS.people).toHaveLength(20)
  })

  it('签诗等级分布：大吉6 / 中吉10 / 小吉10 / 平6 / 小凶8', () => {
    const count = (level: string) => POOLS.poems.filter((p) => p.level === level).length
    expect(count('大吉')).toBe(6)
    expect(count('中吉')).toBe(10)
    expect(count('小吉')).toBe(10)
    expect(count('平')).toBe(6)
    expect(count('小凶')).toBe(8)
  })

  it('等级权重表：顺序与权重符合设计（15/30/30/15/10，合计 100）', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['大吉', '中吉', '小吉', '平', '小凶'])
    expect(LEVELS.map((l) => l.weight)).toEqual([15, 30, 30, 15, 10])
    expect(LEVELS.reduce((sum, l) => sum + l.weight, 0)).toBe(100)
  })

  it('等级五色互异（群内对比的视觉基础）', () => {
    expect(new Set(LEVELS.map((l) => l.accent)).size).toBe(5)
  })

  it('levelMeta 按 id 取回元数据', () => {
    expect(levelMeta('小凶').weight).toBe(10)
  })

  it('全库 id 唯一', () => {
    const ids = [
      ...POOLS.poems.map((p) => p.id),
      ...POOLS.yi.map((i) => i.id),
      ...POOLS.ji.map((i) => i.id),
      ...POOLS.people.map((i) => i.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('冲突对引用的 id 都存在，且含「宜准点下班 × 忌准点下班」同文互斥例', () => {
    const yiIds = new Set(POOLS.yi.map((i) => i.id))
    const jiIds = new Set(POOLS.ji.map((i) => i.id))
    for (const pair of POOLS.conflicts) {
      expect(yiIds.has(pair.yi)).toBe(true)
      expect(jiIds.has(pair.ji)).toBe(true)
    }
    const texts = POOLS.conflicts.map((pair) => {
      const yi = POOLS.yi.find((i) => i.id === pair.yi)!
      const ji = POOLS.ji.find((i) => i.id === pair.ji)!
      return `${yi.text}×${ji.text}`
    })
    expect(texts).toContain('准点下班×准点下班')
  })

  it('版本号为 v1（进 seed，改池必须 bump）', () => {
    expect(POOL_VERSION).toBe('v1')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/cyber-fortune/src/content/pools.ts`（内容即代码，逐字录入）

```ts
export type FortuneLevel = '大吉' | '中吉' | '小吉' | '平' | '小凶'

export interface LevelMeta {
  id: FortuneLevel
  weight: number
  accent: string
}

export interface Poem {
  id: string
  level: FortuneLevel
  lines: readonly [string, string]
}

export interface PoolItem {
  id: string
  text: string
}

export interface ConflictPair {
  yi: string
  ji: string
}

export interface Pools {
  poems: readonly Poem[]
  yi: readonly PoolItem[]
  ji: readonly PoolItem[]
  people: readonly PoolItem[]
  conflicts: readonly ConflictPair[]
}

/** 进 seed；改任何池必须同 commit bump（v1 → v2 → …），并选 UTC+8 凌晨窗口发布。 */
export const POOL_VERSION = 'v1'

/** 顺序即加权抽取顺序；accent 为该等级在结果屏与卡片上的主色。 */
export const LEVELS: readonly LevelMeta[] = [
  { id: '大吉', weight: 15, accent: '#bc3a23' },
  { id: '中吉', weight: 30, accent: '#b8722d' },
  { id: '小吉', weight: 30, accent: '#3f7a52' },
  { id: '平', weight: 15, accent: '#6f6353' },
  { id: '小凶', weight: 10, accent: '#3e4f88' },
]

export function levelMeta(id: FortuneLevel): LevelMeta {
  const meta = LEVELS.find((l) => l.id === id)
  if (!meta) throw new Error(`unknown level: ${id}`)
  return meta
}

const POEMS: readonly Poem[] = [
  // ---- 大吉 ×6 ----
  { id: 'p01', level: '大吉', lines: ['摸鱼不见影', '绩效自然来'] },
  { id: 'p02', level: '大吉', lines: ['会议全取消', '工资照样发'] },
  { id: 'p03', level: '大吉', lines: ['老板今出差', '全组静悄悄'] },
  { id: 'p04', level: '大吉', lines: ['需求一夜蒸发', '代码一次跑通'] },
  { id: 'p05', level: '大吉', lines: ['诸事皆顺遂', '红灯自变绿'] },
  { id: 'p06', level: '大吉', lines: ['电梯一按即至', '外卖未点先到'] },
  // ---- 中吉 ×10 ----
  { id: 'p07', level: '中吉', lines: ['班照常上', '钱照常赚'] },
  { id: 'p08', level: '中吉', lines: ['小事有惊喜', '大事不出错'] },
  { id: 'p09', level: '中吉', lines: ['奶茶半价日', '正好轮到你'] },
  { id: 'p10', level: '中吉', lines: ['群消息九十九', '无一是找你'] },
  { id: 'p11', level: '中吉', lines: ['踩点进工位', '考勤未记迟'] },
  { id: 'p12', level: '中吉', lines: ['午睡无人扰', '醒来无新活'] },
  { id: 'p13', level: '中吉', lines: ['周报凑满行', '领导已读过'] },
  { id: 'p14', level: '中吉', lines: ['地铁有空位', '工位有阳光'] },
  { id: 'p15', level: '中吉', lines: ['今日份好运', '够用到下班'] },
  { id: 'p16', level: '中吉', lines: ['摸鱼有分寸', '进退两从容'] },
  // ---- 小吉 ×10 ----
  { id: 'p17', level: '小吉', lines: ['食堂加鸡腿', '今日小确幸'] },
  { id: 'p18', level: '小吉', lines: ['快递提前到', '拆前先偷乐'] },
  { id: 'p19', level: '小吉', lines: ['小赚一杯奶茶', '小亏一根头发'] },
  { id: 'p20', level: '小吉', lines: ['消息免打扰', '快乐多三分'] },
  { id: 'p21', level: '小吉', lines: ['运气小好', '别拿去开会'] },
  { id: 'p22', level: '小吉', lines: ['打印机不卡纸', '今日已是上签'] },
  { id: 'p23', level: '小吉', lines: ['微雨不湿鞋', '小事不上心'] },
  { id: 'p24', level: '小吉', lines: ['绿萝发新芽', '你也在长大'] },
  { id: 'p25', level: '小吉', lines: ['耳机电量满格', '通勤脚下生风'] },
  { id: 'p26', level: '小吉', lines: ['小运一桩', '藏好慢用'] },
  // ---- 平 ×6 ----
  { id: 'p27', level: '平', lines: ['不好也不坏', '又是一天过'] },
  { id: 'p28', level: '平', lines: ['今日无事', '便是好事'] },
  { id: 'p29', level: '平', lines: ['风平浪静', '适合发呆'] },
  { id: 'p30', level: '平', lines: ['运势走平线', '心态别学它'] },
  { id: 'p31', level: '平', lines: ['平平无奇', '稳稳当当'] },
  { id: 'p32', level: '平', lines: ['无功也无过', '下班不拖堂'] },
  // ---- 小凶 ×8（全库最好笑：坏运势 + 好文案 = 最强截图欲） ----
  { id: 'p33', level: '小凶', lines: ['开口易翻车', '全天嗯嗯嗯'] },
  { id: 'p34', level: '小凶', lines: ['水逆不找你', '找你是甲方'] },
  { id: 'p35', level: '小凶', lines: ['行走要小心', '锅从天上来'] },
  { id: 'p36', level: '小凶', lines: ['今日易点名', '摄像头慢开'] },
  { id: 'p37', level: '小凶', lines: ['奶茶必洒', '白衣勿穿'] },
  { id: 'p38', level: '小凶', lines: ['手滑发错群', '撤回来不及'] },
  { id: 'p39', level: '小凶', lines: ['咖啡泼键盘', '文档未保存'] },
  { id: 'p40', level: '小凶', lines: ['小凶仅一日', '明日再来签'] },
]

const YI_POOL: readonly PoolItem[] = [
  { id: 'y01', text: '摸鱼' },
  { id: 'y02', text: '带薪喝水' },
  { id: 'y03', text: '已读不回' },
  { id: 'y04', text: '准点下班' },
  { id: 'y05', text: '带薪如厕' },
  { id: 'y06', text: '午睡十分钟' },
  { id: 'y07', text: '假装忙碌' },
  { id: 'y08', text: '请年假' },
  { id: 'y09', text: '整理工位' },
  { id: 'y10', text: '给绿萝浇水' },
  { id: 'y11', text: '点贵的外卖' },
  { id: 'y12', text: '穿舒服的鞋' },
  { id: 'y13', text: '戴耳机隔音' },
  { id: 'y14', text: '提前去热饭' },
  { id: 'y15', text: '夸同事好看' },
  { id: 'y16', text: '在群里发梗图' },
  { id: 'y17', text: '清理收藏夹' },
  { id: 'y18', text: '发起奶茶拼单' },
  { id: 'y19', text: '早点睡' },
  { id: 'y20', text: '喝热水' },
  { id: 'y21', text: '拍下班的晚霞' },
  { id: 'y22', text: '心算日薪' },
  { id: 'y23', text: '白日做梦' },
  { id: 'y24', text: '原谅自己' },
  { id: 'y25', text: '夸夸自己' },
  { id: 'y26', text: '收藏吃灰' },
  { id: 'y27', text: '重启试试' },
  { id: 'y28', text: '窗边发呆' },
  { id: 'y29', text: '群设免打扰' },
  { id: 'y30', text: '蹭同事零食' },
]

const JI_POOL: readonly PoolItem[] = [
  { id: 'j01', text: '摸鱼' },
  { id: 'j02', text: '准点下班' },
  { id: 'j03', text: '当出头鸟' },
  { id: 'j04', text: '在群里发言' },
  { id: 'j05', text: '点开工作消息' },
  { id: 'j06', text: '主动汇报' },
  { id: 'j07', text: '自愿加班' },
  { id: 'j08', text: '开摄像头' },
  { id: 'j09', text: '回“在吗”' },
  { id: 'j10', text: '秒回消息' },
  { id: 'j11', text: '夸下海口' },
  { id: 'j12', text: '主持会议' },
  { id: 'j13', text: '教人做事' },
  { id: 'j14', text: '接锅' },
  { id: 'j15', text: '对齐颗粒度' },
  { id: 'j16', text: '打探工资' },
  { id: 'j17', text: '跟杠精讲理' },
  { id: 'j18', text: '试新发型' },
  { id: 'j19', text: '穿白衣吃面' },
  { id: 'j20', text: '睡前喝咖啡' },
  { id: 'j21', text: '点最辣的' },
  { id: 'j22', text: '清空购物车' },
  { id: 'j23', text: '看体重秤' },
  { id: 'j24', text: '翻旧聊天记录' },
  { id: 'j25', text: '和导航赌气' },
  { id: 'j26', text: '剪自己刘海' },
  { id: 'j27', text: '深夜发朋友圈' },
  { id: 'j28', text: '手滑点赞' },
  { id: 'j29', text: '和同事抢电梯' },
  { id: 'j30', text: '当众演示' },
]

const PEOPLE_POOL: readonly PoolItem[] = [
  { id: 'r01', text: '食堂阿姨' },
  { id: 'r02', text: '上一个离职的同事' },
  { id: 'r03', text: '电梯里的陌生人' },
  { id: 'r04', text: '快递站小哥' },
  { id: 'r05', text: '楼下保安大叔' },
  { id: 'r06', text: '茶水间偶遇的大佬' },
  { id: 'r07', text: '前台小姐姐' },
  { id: 'r08', text: '修电脑的IT同事' },
  { id: 'r09', text: '总在加班的那位' },
  { id: 'r10', text: '总抢会议室的人' },
  { id: 'r11', text: '群里潜水最深的人' },
  { id: 'r12', text: '朋友圈第一个点赞的人' },
  { id: 'r13', text: '外卖备注里的商家' },
  { id: 'r14', text: '地铁对面打盹的人' },
  { id: 'r15', text: '多年未联系的老同学' },
  { id: 'r16', text: '楼道里遛狗的邻居' },
  { id: 'r17', text: '深夜便利店店员' },
  { id: 'r18', text: '共享文档匿名访客' },
  { id: 'r19', text: '昨天的自己' },
  { id: 'r20', text: '网线对面的网友' },
]

/**
 * 宜忌语义冲突黑名单：同一支签内，宜 X 与忌 Y 互斥。
 * 规则一（同文互斥）：同一件事同时出现在宜与忌（准点下班、摸鱼）。
 * 规则二（蕴含互斥）：宜的行为必然要做忌所禁止的事（发梗图/拼单 都需要在群里发言）。
 * 新增内容时若两池出现同类语义，必须在此登记冲突对——lint（Task 6）校验 id 有效性。
 */
const CONFLICT_PAIRS: readonly ConflictPair[] = [
  { yi: 'y01', ji: 'j01' }, // 宜摸鱼 × 忌摸鱼
  { yi: 'y04', ji: 'j02' }, // 宜准点下班 × 忌准点下班
  { yi: 'y16', ji: 'j04' }, // 宜在群里发梗图 × 忌在群里发言
  { yi: 'y18', ji: 'j04' }, // 宜发起奶茶拼单 × 忌在群里发言
]

export const POOLS: Pools = {
  poems: POEMS,
  yi: YI_POOL,
  ji: JI_POOL,
  people: PEOPLE_POOL,
  conflicts: CONFLICT_PAIRS,
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): 首发签池内容（签诗40/宜30/忌30/人物20/冲突对）"
```

---

### Task 6: 内容红线 lint（构建期门禁）

**Files:**
- Create: `sites/cyber-fortune/src/content/blacklist.ts`, `sites/cyber-fortune/src/lib/pool-lint.ts`
- Modify: `sites/cyber-fortune/package.json`（build 脚本加入测试门禁）
- Test: `sites/cyber-fortune/src/lib/pool-lint.test.ts`

**Interfaces:**
- Consumes: `Pools`/`POOLS`（Task 5）
- Produces:
  - `CONTENT_BLACKLIST: readonly string[]`（红线词表）
  - `interface LintViolation { where: string; text: string; rule: string }`
  - `lintPools(pools: Pools): LintViolation[]` — 检查：红线词、字数超限（签诗行 ≤8 / 宜忌 ≤8 / 人物 ≤12）、池内重复文本、冲突对 id 完整性；干净返回 `[]`
- 门禁方式：lint 以单测形式断言 `lintPools(POOLS)` 为空；build 脚本改为 `tsc --noEmit && vitest run && vite build`，任何红线违规都会挡住构建

- [ ] **Step 1: 写失败测试** `sites/cyber-fortune/src/lib/pool-lint.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { POOLS } from '../content/pools'
import { lintPools } from './pool-lint'

const cleanBase = {
  poems: [{ id: 'p1', level: '平', lines: ['风平浪静', '适合发呆'] }],
  yi: [{ id: 'y1', text: '摸鱼' }],
  ji: [{ id: 'j1', text: '接锅' }],
  people: [{ id: 'r1', text: '食堂阿姨' }],
  conflicts: [],
} as const

describe('lintPools', () => {
  it('真实签池零违规（构建期门禁）', () => {
    expect(lintPools(POOLS)).toEqual([])
  })

  it('红线词命中（投资类「买入」）', () => {
    const bad = { ...cleanBase, yi: [{ id: 'y1', text: '逢低买入' }] }
    const hits = lintPools(bad)
    expect(hits.some((v) => v.rule === 'blacklist' && v.text === '逢低买入')).toBe(true)
  })

  it('红线词命中（宗教单字「神」）', () => {
    const bad = { ...cleanBase, people: [{ id: 'r1', text: '财神爷' }] }
    expect(lintPools(bad).some((v) => v.rule === 'blacklist')).toBe(true)
  })

  it('签诗行超 8 字命中长度规则', () => {
    const bad = {
      ...cleanBase,
      poems: [{ id: 'p1', level: '平', lines: ['这一行签诗有九个字', '短'] }],
    } as const
    expect(lintPools(bad).some((v) => v.rule === 'length')).toBe(true)
  })

  it('池内重复文本命中', () => {
    const bad = {
      ...cleanBase,
      yi: [
        { id: 'y1', text: '摸鱼' },
        { id: 'y2', text: '摸鱼' },
      ],
    }
    expect(lintPools(bad).some((v) => v.rule === 'duplicate')).toBe(true)
  })

  it('冲突对引用不存在的 id 命中完整性规则', () => {
    const bad = { ...cleanBase, conflicts: [{ yi: 'y1', ji: 'j999' }] }
    expect(lintPools(bad).some((v) => v.rule === 'conflict-integrity')).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/cyber-fortune/src/content/blacklist.ts`：

```ts
/**
 * 内容红线词表（构建期 lint 扫描全部签池文本）。
 * 依据设计文档 §8：去宗教化（无佛/拜/神/仙等字眼）；
 * 不涉医疗、投资、婚恋决策的「建议式」表述。
 * 单字条目（佛/拜/神/仙/庙）意味着全库连相关复合词一起禁用——
 * 内容创作时绕开（如不用「仿佛」「拜托」「提神」）。
 */
export const CONTENT_BLACKLIST: readonly string[] = [
  // 宗教
  '佛',
  '拜',
  '神',
  '仙',
  '庙',
  '菩萨',
  '道士',
  '道观',
  '烧香',
  '符咒',
  '开光',
  '显灵',
  '保佑',
  '转运珠',
  // 投资
  '买入',
  '卖出',
  '抄底',
  '加仓',
  '清仓',
  '梭哈',
  '炒股',
  '股票',
  '基金',
  '理财',
  '贷款',
  '彩票',
  // 医疗
  '治病',
  '吃药',
  '停药',
  '服药',
  '偏方',
  '手术',
  '诊断',
  '输液',
  '药方',
  // 婚恋决策
  '结婚',
  '离婚',
  '分手',
  '求婚',
  '表白',
  '相亲',
  '备孕',
]
```

`sites/cyber-fortune/src/lib/pool-lint.ts`：

```ts
import { CONTENT_BLACKLIST } from '../content/blacklist'
import type { Pools } from '../content/pools'

export interface LintViolation {
  where: string
  text: string
  rule: 'blacklist' | 'length' | 'duplicate' | 'conflict-integrity'
}

const MAX_POEM_LINE = 8
const MAX_ITEM_TEXT = 8
const MAX_PERSON_TEXT = 12

function checkBlacklist(where: string, text: string): LintViolation[] {
  return CONTENT_BLACKLIST.filter((word) => text.includes(word)).map(() => ({
    where,
    text,
    rule: 'blacklist' as const,
  }))
}

function checkLength(where: string, text: string, max: number): LintViolation[] {
  return Array.from(text).length > max ? [{ where, text, rule: 'length' }] : []
}

function checkDuplicates(where: string, texts: readonly string[]): LintViolation[] {
  const seen = new Set<string>()
  const out: LintViolation[] = []
  for (const text of texts) {
    if (seen.has(text)) out.push({ where, text, rule: 'duplicate' })
    seen.add(text)
  }
  return out
}

export function lintPools(pools: Pools): LintViolation[] {
  const violations: LintViolation[] = []

  for (const poem of pools.poems) {
    for (const line of poem.lines) {
      violations.push(...checkBlacklist(`poems/${poem.id}`, line))
      violations.push(...checkLength(`poems/${poem.id}`, line, MAX_POEM_LINE))
    }
  }
  for (const item of pools.yi) {
    violations.push(...checkBlacklist(`yi/${item.id}`, item.text))
    violations.push(...checkLength(`yi/${item.id}`, item.text, MAX_ITEM_TEXT))
  }
  for (const item of pools.ji) {
    violations.push(...checkBlacklist(`ji/${item.id}`, item.text))
    violations.push(...checkLength(`ji/${item.id}`, item.text, MAX_ITEM_TEXT))
  }
  for (const person of pools.people) {
    violations.push(...checkBlacklist(`people/${person.id}`, person.text))
    violations.push(...checkLength(`people/${person.id}`, person.text, MAX_PERSON_TEXT))
  }

  violations.push(...checkDuplicates('yi', pools.yi.map((i) => i.text)))
  violations.push(...checkDuplicates('ji', pools.ji.map((i) => i.text)))
  violations.push(...checkDuplicates('people', pools.people.map((i) => i.text)))
  violations.push(
    ...checkDuplicates('poems', pools.poems.map((p) => p.lines.join('，'))),
  )

  const yiIds = new Set(pools.yi.map((i) => i.id))
  const jiIds = new Set(pools.ji.map((i) => i.id))
  for (const pair of pools.conflicts) {
    if (!yiIds.has(pair.yi) || !jiIds.has(pair.ji)) {
      violations.push({
        where: 'conflicts',
        text: `${pair.yi}×${pair.ji}`,
        rule: 'conflict-integrity',
      })
    }
  }

  return violations
}
```

注意 `pool-lint.test.ts` 的 `cleanBase` 里 poem `level: '平'` 依赖 `as const` 收窄；`lintPools` 参数类型为 `Pools`，测试对象若报类型不匹配，用 `satisfies`/`as Pools` 修正到编译通过为止（不改实现签名）。

`sites/cyber-fortune/package.json` 的 build 脚本改为（lint 与全部单测成为构建门禁）：

```json
"build": "tsc --noEmit && vitest run && vite build"
```

- [ ] **Step 4: 跑测试 + 构建确认门禁生效**

Run: `pnpm --filter @viral/cyber-fortune test && pnpm --filter @viral/cyber-fortune build`
Expected: 测试全 PASS；build 成功且日志里能看到 vitest 先行执行

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): 签池内容红线 lint 并接入构建门禁"
```

---

### Task 7: fortune-math — 确定性抽签引擎（含权重统计测试）

**Files:**
- Create: `sites/cyber-fortune/src/lib/fortune-math.ts`
- Test: `sites/cyber-fortune/src/lib/fortune-math.test.ts`

**Interfaces:**
- Consumes: `fnv1a`/`seededSequence`/`pickOne`/`pickN`（shared，Task 1/2）、`POOLS`/`POOL_VERSION`/`LEVELS`（Task 5）、`dateKeyUTC8`（Task 4）
- Produces:
  - `normalizeNickname(raw: string): string` — trim + NFC + toLowerCase（英文小写化，中文不受影响）
  - `fortuneSeed(nickname: string, dateKey: string, version?: string): number` — `fnv1a(normalize(nickname) + '|' + dateKey + '|' + version)`，version 默认 `POOL_VERSION`
  - `interface Fortune { dateKey: string; nickname: string; level: FortuneLevel; poem: Poem; yi: readonly [PoolItem, PoolItem]; ji: readonly [PoolItem, PoolItem]; guiren: PoolItem; xiaoren: PoolItem }`
  - `drawFortune(nickname: string, date: Date): Fortune` — 纯函数；固定抽取顺序：加权等级 → 该等级签诗 → 宜×2 → 忌×2（先按冲突黑名单过滤再抽） → 人物×2（第一个贵人、第二个小人，天然不重复）

- [ ] **Step 1: 写失败测试** `sites/cyber-fortune/src/lib/fortune-math.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { POOLS } from '../content/pools'
import { drawFortune, fortuneSeed, normalizeNickname } from './fortune-math'

// UTC+8 的 2026-08-04 中午
const D = new Date(Date.UTC(2026, 7, 4, 4, 0))

describe('normalizeNickname', () => {
  it('trim + 英文小写', () => {
    expect(normalizeNickname('  AFu ')).toBe('afu')
  })

  it('NFC 归一：组合字符与预组合字符等价', () => {
    expect(normalizeNickname('café')).toBe(normalizeNickname('café'))
  })
})

describe('fortuneSeed', () => {
  it('大小写/空白不敏感（同人同签的前提）', () => {
    expect(fortuneSeed(' AFu ', '2026-08-04')).toBe(fortuneSeed('afu', '2026-08-04'))
  })

  it('日期或版本号不同则 seed 不同', () => {
    expect(fortuneSeed('afu', '2026-08-04')).not.toBe(fortuneSeed('afu', '2026-08-05'))
    expect(fortuneSeed('afu', '2026-08-04', 'v1')).not.toBe(
      fortuneSeed('afu', '2026-08-04', 'v2'),
    )
  })
})

describe('drawFortune 确定性', () => {
  it('同人同天同签（两次独立调用完全一致 = 跨设备一致）', () => {
    expect(drawFortune('阿福', D)).toEqual(drawFortune('阿福', D))
  })

  it('昵称归一化后等价：「 AFu 」与「afu」同签', () => {
    const a = drawFortune(' AFu ', D)
    const b = drawFortune('afu', D)
    expect(a.poem).toEqual(b.poem)
    expect(a.yi).toEqual(b.yi)
    expect(a.ji).toEqual(b.ji)
  })

  it('结果字段完整且签诗等级与抽中等级一致', () => {
    const f = drawFortune('阿福', D)
    expect(f.dateKey).toBe('2026-08-04')
    expect(f.nickname).toBe('阿福')
    expect(f.poem.level).toBe(f.level)
    expect(f.yi).toHaveLength(2)
    expect(f.ji).toHaveLength(2)
  })
})

describe('drawFortune 约束扫描（500 个昵称）', () => {
  const fortunes = Array.from({ length: 500 }, (_, i) => drawFortune(`打工人${i}`, D))

  it('宜/忌各自不重复，贵人 ≠ 小人', () => {
    for (const f of fortunes) {
      expect(f.yi[0].id).not.toBe(f.yi[1].id)
      expect(f.ji[0].id).not.toBe(f.ji[1].id)
      expect(f.guiren.id).not.toBe(f.xiaoren.id)
    }
  })

  it('宜忌冲突黑名单生效：任何签都不含冲突对', () => {
    for (const f of fortunes) {
      const yiIds = new Set(f.yi.map((i) => i.id))
      const jiIds = new Set(f.ji.map((i) => i.id))
      for (const pair of POOLS.conflicts) {
        expect(yiIds.has(pair.yi) && jiIds.has(pair.ji)).toBe(false)
      }
    }
  })
})

describe('等级权重分布（2000 个昵称统计测试）', () => {
  it('大吉≈15% 中吉≈30% 小吉≈30% 平≈15% 小凶≈10%（各 ±5pp）', () => {
    const counts: Record<string, number> = {}
    for (let i = 0; i < 2000; i += 1) {
      const f = drawFortune(`用户${i}`, D)
      counts[f.level] = (counts[f.level] ?? 0) + 1
    }
    expect(counts['大吉']).toBeGreaterThanOrEqual(200)
    expect(counts['大吉']).toBeLessThanOrEqual(400)
    expect(counts['中吉']).toBeGreaterThanOrEqual(500)
    expect(counts['中吉']).toBeLessThanOrEqual(700)
    expect(counts['小吉']).toBeGreaterThanOrEqual(500)
    expect(counts['小吉']).toBeLessThanOrEqual(700)
    expect(counts['平']).toBeGreaterThanOrEqual(200)
    expect(counts['平']).toBeLessThanOrEqual(400)
    expect(counts['小凶']).toBeGreaterThanOrEqual(100)
    expect(counts['小凶']).toBeLessThanOrEqual(300)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/cyber-fortune/src/lib/fortune-math.ts`

```ts
import { fnv1a, pickN, pickOne, seededSequence, type SeededSequence } from '@viral/shared'
import {
  LEVELS,
  POOLS,
  POOL_VERSION,
  type FortuneLevel,
  type Poem,
  type PoolItem,
} from '../content/pools'
import { dateKeyUTC8 } from './date-utils'

export interface Fortune {
  dateKey: string
  nickname: string
  level: FortuneLevel
  poem: Poem
  yi: readonly [PoolItem, PoolItem]
  ji: readonly [PoolItem, PoolItem]
  guiren: PoolItem
  xiaoren: PoolItem
}

/** trim + NFC + 英文小写：换设备、变大小写、复制粘贴多空格都不换签。 */
export function normalizeNickname(raw: string): string {
  return raw.trim().normalize('NFC').toLowerCase()
}

/** `|` 分隔防拼接歧义（见 Global Constraints）。version 进 seed：改池 bump 后签面整体轮换。 */
export function fortuneSeed(
  nickname: string,
  dateKey: string,
  version: string = POOL_VERSION,
): number {
  return fnv1a(`${normalizeNickname(nickname)}|${dateKey}|${version}`)
}

function pickLevel(next: SeededSequence): FortuneLevel {
  const total = LEVELS.reduce((sum, l) => sum + l.weight, 0)
  let roll = next() * total
  for (const level of LEVELS) {
    roll -= level.weight
    if (roll < 0) return level.id
  }
  return LEVELS[LEVELS.length - 1].id
}

/**
 * 确定性抽签。抽取顺序固定：等级 → 签诗 → 宜×2 → 忌×2 → 人物×2。
 * 改动顺序会改变所有人的签，禁止。
 */
export function drawFortune(nickname: string, date: Date): Fortune {
  const dateKey = dateKeyUTC8(date)
  const next = seededSequence(fortuneSeed(nickname, dateKey))

  const level = pickLevel(next)
  const poem = pickOne(next, POOLS.poems.filter((p) => p.level === level))

  const [yi1, yi2] = pickN(next, POOLS.yi, 2)
  const yiIds = new Set([yi1.id, yi2.id])
  const bannedJi = new Set(
    POOLS.conflicts.filter((pair) => yiIds.has(pair.yi)).map((pair) => pair.ji),
  )
  const jiCandidates = POOLS.ji.filter((item) => !bannedJi.has(item.id))
  const [ji1, ji2] = pickN(next, jiCandidates, 2)

  const [guiren, xiaoren] = pickN(next, POOLS.people, 2)

  return {
    dateKey,
    nickname: nickname.trim(),
    level,
    poem,
    yi: [yi1, yi2],
    ji: [ji1, ji2],
    guiren,
    xiaoren,
  }
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/cyber-fortune test && pnpm --filter @viral/cyber-fortune typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): 确定性抽签引擎（加权等级/冲突过滤/权重统计测试）"
```

---

### Task 8: streak 纯逻辑 + localStorage 封装

**Files:**
- Create: `sites/cyber-fortune/src/lib/streak.ts`, `sites/cyber-fortune/src/lib/storage.ts`
- Test: `sites/cyber-fortune/src/lib/streak.test.ts`, `sites/cyber-fortune/src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `dateKeyUTC8`/`yesterdayKeyUTC8`(Task 4)
- Produces:
  - `interface StreakState { lastDate: string; count: number }`
  - `const DEVOUT_STREAK = 7`（≥7 天出「虔诚」印章）
  - `advanceStreak(prev: StreakState | null, now: Date): { state: StreakState; isRepeat: boolean }` — 纯函数不可变：当天重复 → 原状态 + `isRepeat: true`；昨天求过 → count+1；其余 → 重置 1
  - `loadStreak(): StreakState | null` / `saveStreak(state): void` / `loadNickname(): string | null` / `saveNickname(nickname): void` — localStorage 封装；坏 JSON / 非法形状 / 存储异常一律安全降级（load 返回 null，save 静默）

- [ ] **Step 1: 写失败测试**

`sites/cyber-fortune/src/lib/streak.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { advanceStreak } from './streak'

// UTC+8 的 2026-08-04
const NOW = new Date(Date.UTC(2026, 7, 4, 4, 0))

describe('advanceStreak', () => {
  it('首次求签：count = 1', () => {
    expect(advanceStreak(null, NOW)).toEqual({
      state: { lastDate: '2026-08-04', count: 1 },
      isRepeat: false,
    })
  })

  it('昨天求过：连续 +1', () => {
    expect(advanceStreak({ lastDate: '2026-08-03', count: 3 }, NOW)).toEqual({
      state: { lastDate: '2026-08-04', count: 4 },
      isRepeat: false,
    })
  })

  it('当天重复求签：不重复计数，isRepeat = true', () => {
    const prev = { lastDate: '2026-08-04', count: 4 }
    expect(advanceStreak(prev, NOW)).toEqual({ state: prev, isRepeat: true })
  })

  it('中断（前天求过）：清零重置为 1', () => {
    expect(advanceStreak({ lastDate: '2026-08-02', count: 9 }, NOW).state.count).toBe(1)
  })

  it('跨月连续：8-31 → 9-01 算连续', () => {
    const sep1 = new Date(Date.UTC(2026, 8, 1, 4, 0))
    expect(advanceStreak({ lastDate: '2026-08-31', count: 5 }, sep1).state.count).toBe(6)
  })

  it('跨年连续：12-31 → 01-01 算连续', () => {
    const jan1 = new Date(Date.UTC(2025, 11, 31, 16, 0)) // UTC+8 已是 2026-01-01
    expect(advanceStreak({ lastDate: '2025-12-31', count: 2 }, jan1).state.count).toBe(3)
  })

  it('UTC+8 边界：UTC 16:00 已换日，昨天的记录算连续', () => {
    const boundary = new Date(Date.UTC(2026, 7, 3, 16, 0)) // UTC+8 2026-08-04 00:00
    expect(advanceStreak({ lastDate: '2026-08-03', count: 1 }, boundary).state.count).toBe(2)
  })

  it('不可变：不修改传入的 prev', () => {
    const prev = { lastDate: '2026-08-03', count: 3 }
    advanceStreak(prev, NOW)
    expect(prev).toEqual({ lastDate: '2026-08-03', count: 3 })
  })
})
```

`sites/cyber-fortune/src/lib/storage.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadNickname, loadStreak, saveNickname, saveStreak } from './storage'

describe('storage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('streak 存取往返', () => {
    saveStreak({ lastDate: '2026-08-04', count: 3 })
    expect(loadStreak()).toEqual({ lastDate: '2026-08-04', count: 3 })
  })

  it('无记录返回 null', () => {
    expect(loadStreak()).toBeNull()
  })

  it('坏 JSON 返回 null（不抛错）', () => {
    localStorage.setItem('cf.streak', '{oops')
    expect(loadStreak()).toBeNull()
  })

  it('形状非法返回 null（日期格式/负数）', () => {
    localStorage.setItem('cf.streak', JSON.stringify({ lastDate: '昨天', count: 3 }))
    expect(loadStreak()).toBeNull()
    localStorage.setItem('cf.streak', JSON.stringify({ lastDate: '2026-08-04', count: -1 }))
    expect(loadStreak()).toBeNull()
  })

  it('存储异常静默（隐私模式配额）', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveStreak({ lastDate: '2026-08-04', count: 1 })).not.toThrow()
    expect(() => saveNickname('阿福')).not.toThrow()
  })

  it('昵称存取往返（记住上次的昵称）', () => {
    expect(loadNickname()).toBeNull()
    saveNickname('阿福')
    expect(loadNickname()).toBe('阿福')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/cyber-fortune/src/lib/streak.ts`：

```ts
import { dateKeyUTC8, yesterdayKeyUTC8 } from './date-utils'

export interface StreakState {
  lastDate: string
  count: number
}

export interface StreakAdvance {
  state: StreakState
  isRepeat: boolean
}

/** 连续求签 ≥ 此天数，卡片加「虔诚」印章。 */
export const DEVOUT_STREAK = 7

/**
 * 纯函数推进 streak：当天重复不计数；昨天求过 +1；否则重置 1。
 * 不做补签（设计文档 §6 明确不做）。
 */
export function advanceStreak(prev: StreakState | null, now: Date): StreakAdvance {
  const todayKey = dateKeyUTC8(now)
  if (prev && prev.lastDate === todayKey) {
    return { state: prev, isRepeat: true }
  }
  if (prev && prev.lastDate === yesterdayKeyUTC8(now)) {
    return { state: { lastDate: todayKey, count: prev.count + 1 }, isRepeat: false }
  }
  return { state: { lastDate: todayKey, count: 1 }, isRepeat: false }
}
```

`sites/cyber-fortune/src/lib/storage.ts`：

```ts
import type { StreakState } from './streak'

const STREAK_KEY = 'cf.streak'
const NICKNAME_KEY = 'cf.nickname'
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

/** 读 streak；坏 JSON、非法形状、存储不可用一律返回 null（明天重新开始，无惩罚概念）。 */
export function loadStreak(): StreakState | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { lastDate, count } = parsed as { lastDate?: unknown; count?: unknown }
    if (typeof lastDate !== 'string' || !DATE_KEY_RE.test(lastDate)) return null
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return null
    return { lastDate, count }
  } catch {
    return null
  }
}

export function saveStreak(state: StreakState): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(state))
  } catch {
    // 隐私模式/配额满：静默，streak 丢失可接受
  }
}

export function loadNickname(): string | null {
  try {
    return localStorage.getItem(NICKNAME_KEY)
  } catch {
    return null
  }
}

export function saveNickname(nickname: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname)
  } catch {
    // 静默
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): streak 纯逻辑与 localStorage 安全封装"
```

---

### Task 9: 节令皮配置结构与命中逻辑（v1 边界：不做皮肤本体）

**Files:**
- Create: `sites/cyber-fortune/src/lib/season.ts`
- Test: `sites/cyber-fortune/src/lib/season.test.ts`

**Interfaces:**
- Produces:
  - `type SkinRule = { type: 'annual'; from: string; to: string } | { type: 'monthly'; day: number }`（`from`/`to` 为 `MM-DD`，闭区间，**不允许跨年**——跨年节令拆成两条 annual 规则）
  - `interface SeasonSkin { id: string; name: string; rules: readonly SkinRule[] }`
  - `SEASON_SKINS: readonly SeasonSkin[]`（新年签 01-20~02-10、高考签 06-05~06-10、发薪日签每月 10/15 号；数组顺序即命中优先级）
  - `activeSkinId(dateKey: string, skins?: readonly SeasonSkin[]): string | null`
- **v1 边界（写死）**：只交付配置结构 + 命中纯函数与测试；不接 UI、不上报埋点、不做专属签池与皮肤视觉，全部留给 v2。此任务的产出是「热点快反的插座」。

- [ ] **Step 1: 写失败测试** `sites/cyber-fortune/src/lib/season.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { activeSkinId, SEASON_SKINS } from './season'

describe('activeSkinId', () => {
  it('新年签区间命中（含首尾闭区间）', () => {
    expect(activeSkinId('2026-01-20')).toBe('new-year')
    expect(activeSkinId('2026-02-01')).toBe('new-year')
    expect(activeSkinId('2026-02-10')).toBe('new-year')
    expect(activeSkinId('2026-02-11')).toBeNull()
  })

  it('高考签区间命中', () => {
    expect(activeSkinId('2026-06-05')).toBe('gaokao')
    expect(activeSkinId('2026-06-10')).toBe('gaokao')
    expect(activeSkinId('2026-06-11')).toBeNull()
  })

  it('发薪日签：每月 10 号与 15 号命中', () => {
    expect(activeSkinId('2026-03-10')).toBe('payday')
    expect(activeSkinId('2026-03-15')).toBe('payday')
    expect(activeSkinId('2026-03-16')).toBeNull()
  })

  it('优先级：02-10 同时是新年区间和发薪日，数组前者（新年）胜出', () => {
    expect(activeSkinId('2026-02-10')).toBe('new-year')
    expect(SEASON_SKINS[0].id).toBe('new-year')
  })

  it('普通日期不命中', () => {
    expect(activeSkinId('2026-08-04')).toBeNull()
  })

  it('自定义皮配置可注入（热点快反用）', () => {
    const skins = [{ id: 'x', name: 'X', rules: [{ type: 'monthly' as const, day: 4 }] }]
    expect(activeSkinId('2026-08-04', skins)).toBe('x')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/cyber-fortune/src/lib/season.ts`

```ts
/**
 * 节令皮系统 v1：只有配置结构与命中逻辑。
 * 皮肤本体（视觉替换、专属签池）v2 再做——设计文档 §4「皮 = 配置 + 专属池，不改引擎」。
 * annual 的 from/to 为 MM-DD 闭区间，不允许跨年；跨年节令（如跨 12-31 的）拆成两条规则。
 */
export type SkinRule =
  | { type: 'annual'; from: string; to: string }
  | { type: 'monthly'; day: number }

export interface SeasonSkin {
  id: string
  name: string
  rules: readonly SkinRule[]
}

/** 数组顺序即命中优先级（新年 > 高考 > 发薪日）。 */
export const SEASON_SKINS: readonly SeasonSkin[] = [
  { id: 'new-year', name: '新年签', rules: [{ type: 'annual', from: '01-20', to: '02-10' }] },
  { id: 'gaokao', name: '高考签', rules: [{ type: 'annual', from: '06-05', to: '06-10' }] },
  {
    id: 'payday',
    name: '发薪日签',
    rules: [
      { type: 'monthly', day: 10 },
      { type: 'monthly', day: 15 },
    ],
  },
]

/** dateKey 为 UTC+8 的 YYYY-MM-DD（来自 date-utils）；MM-DD 零填充下字符串比较即日期比较。 */
export function activeSkinId(
  dateKey: string,
  skins: readonly SeasonSkin[] = SEASON_SKINS,
): string | null {
  const monthDay = dateKey.slice(5)
  const day = Number(dateKey.slice(8, 10))
  for (const skin of skins) {
    const hit = skin.rules.some((rule) =>
      rule.type === 'annual' ? rule.from <= monthDay && monthDay <= rule.to : rule.day === day,
    )
    if (hit) return skin.id
  }
  return null
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): 节令皮配置结构与命中逻辑（皮肤本体留 v2）"
```

---

### Task 10: DrawScreen — 昵称输入 + 长按签筒蓄力 + 掉签动效

**Files:**
- Create: `sites/cyber-fortune/src/components/draw-screen.tsx`
- Test: `sites/cyber-fortune/src/components/draw-screen.test.tsx`

**Interfaces:**
- Consumes: `loadNickname`（Task 8）
- Produces: `<DrawScreen onDraw={(nickname: string) => void} />` —
  - 昵称输入框（label「怎么称呼你」，maxLength 12，初值取 `loadNickname()`）
  - 签筒按钮（aria-label「签筒」，`data-phase` ∈ `idle | charging | falling`）：`pointerdown` 开始蓄力（按住时长驱动 `scale` 变大 + `cf-shake` 抖动，1200ms 蓄满）；`pointerup`/`pointerleave` 松手 → 进入 `falling`，掉签动效 1.5s 后回调 `onDraw(nickname.trim())`
  - 空昵称按签筒：提示「先留个昵称，签才认得你」，不触发流程
  - `prefers-reduced-motion`：JS 跳过 1.5s 等待（CSS 端 Task 3 已全局压掉动画）

- [ ] **Step 1: 写失败测试** `sites/cyber-fortune/src/components/draw-screen.test.tsx`

计时器驱动的交互用 `fireEvent`（同步派发）配合假计时器，不用 `userEvent`（其内部依赖真实延时）：

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DrawScreen } from './draw-screen'

describe('DrawScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('记住上次昵称：localStorage 有值时输入框预填', () => {
    localStorage.setItem('cf.nickname', '老王')
    render(<DrawScreen onDraw={vi.fn()} />)
    expect(screen.getByLabelText('怎么称呼你')).toHaveValue('老王')
  })

  it('空昵称按签筒：出提示，不进入蓄力，也不触发 onDraw', () => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    const tube = screen.getByRole('button', { name: '签筒' })
    fireEvent.pointerDown(tube)
    expect(screen.getByText('先留个昵称，签才认得你')).toBeInTheDocument()
    expect(tube).toHaveAttribute('data-phase', 'idle')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(onDraw).not.toHaveBeenCalled()
  })

  it('完整流程：按下蓄力 → 松手掉签 → 1.5s 后回调昵称', () => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    const tube = screen.getByRole('button', { name: '签筒' })

    fireEvent.pointerDown(tube)
    expect(tube).toHaveAttribute('data-phase', 'charging')
    act(() => {
      vi.advanceTimersByTime(600)
    })

    fireEvent.pointerUp(tube)
    expect(tube).toHaveAttribute('data-phase', 'falling')
    expect(onDraw).not.toHaveBeenCalled() // 动效未播完

    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(onDraw).toHaveBeenCalledExactlyOnceWith('阿福')
  })

  it('昵称首尾空格被 trim 后回调', () => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: ' 阿福 ' } })
    const tube = screen.getByRole('button', { name: '签筒' })
    fireEvent.pointerDown(tube)
    fireEvent.pointerUp(tube)
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(onDraw).toHaveBeenCalledExactlyOnceWith('阿福')
  })

  it('falling 阶段重复按压无效（不双触发）', () => {
    const onDraw = vi.fn()
    render(<DrawScreen onDraw={onDraw} />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    const tube = screen.getByRole('button', { name: '签筒' })
    fireEvent.pointerDown(tube)
    fireEvent.pointerUp(tube)
    fireEvent.pointerDown(tube)
    fireEvent.pointerUp(tube)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(onDraw).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/cyber-fortune/src/components/draw-screen.tsx`

```tsx
import { useEffect, useRef, useState } from 'react'
import { loadNickname } from '../lib/storage'

const CHARGE_FULL_MS = 1200
const FALL_MS = 1500
const CHARGE_TICK_MS = 50
const MAX_NICKNAME_LEN = 12

type Phase = 'idle' | 'charging' | 'falling'

interface Props {
  onDraw: (nickname: string) => void
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export function DrawScreen({ onDraw }: Props) {
  const [nickname, setNickname] = useState(() => loadNickname() ?? '')
  const [phase, setPhase] = useState<Phase>('idle')
  const [charge, setCharge] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const chargeTimer = useRef<number | null>(null)
  const pressStart = useRef(0)

  useEffect(
    () => () => {
      if (chargeTimer.current !== null) window.clearInterval(chargeTimer.current)
    },
    [],
  )

  const startCharge = () => {
    if (phase !== 'idle') return
    if (!nickname.trim()) {
      setHint('先留个昵称，签才认得你')
      return
    }
    setHint(null)
    setPhase('charging')
    setCharge(0)
    pressStart.current = Date.now()
    chargeTimer.current = window.setInterval(() => {
      setCharge(Math.min(1, (Date.now() - pressStart.current) / CHARGE_FULL_MS))
    }, CHARGE_TICK_MS)
  }

  const release = () => {
    if (phase !== 'charging') return
    if (chargeTimer.current !== null) {
      window.clearInterval(chargeTimer.current)
      chargeTimer.current = null
    }
    setPhase('falling')
    const wait = prefersReducedMotion() ? 0 : FALL_MS
    window.setTimeout(() => onDraw(nickname.trim()), wait)
  }

  return (
    <section className="flex flex-col items-center gap-6">
      <h1 className="font-serif-cn text-3xl">赛博求签</h1>
      <p className="text-center text-sm" style={{ color: 'var(--cf-ink-faded)' }}>
        打工人电子黄历。长按签筒蓄力，松手掉签——同名同天，签必相同。
      </p>
      <label className="flex w-full flex-col gap-2 text-sm">
        怎么称呼你
        <input
          type="text"
          value={nickname}
          maxLength={MAX_NICKNAME_LEN}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="写个昵称，明天接着签"
          className="rounded-md border bg-transparent px-3 py-2"
          style={{ borderColor: 'var(--cf-paper-line)' }}
        />
      </label>
      {hint && (
        <p className="text-sm" style={{ color: 'var(--cf-vermilion)' }}>
          {hint}
        </p>
      )}
      <button
        type="button"
        aria-label="签筒"
        data-phase={phase}
        onPointerDown={startCharge}
        onPointerUp={release}
        onPointerLeave={release}
        className="relative flex touch-none select-none flex-col items-center pt-10"
        style={
          phase === 'charging'
            ? {
                transform: `scale(${1 + charge * 0.08})`,
                animation: 'cf-shake 0.3s infinite',
              }
            : undefined
        }
      >
        <span aria-hidden className="absolute top-0 flex gap-1">
          <i className="cf-stick" />
          <i className="cf-stick cf-stick-tall" />
          <i className="cf-stick" />
        </span>
        <span className="cf-tube font-serif-cn text-3xl">签</span>
      </button>
      {phase === 'falling' && <div aria-hidden className="cf-fall-stick" />}
      <p className="text-xs" style={{ color: 'var(--cf-ink-faded)' }}>
        按住签筒蓄力，松手掉签
      </p>
    </section>
  )
}
```

（`onPointerLeave` 也走 `release`：手指按住拖出签筒视为松手，避免卡在 charging。）

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): 求签屏（昵称记忆/长按蓄力/掉签动效）"
```

---

### Task 11: FortuneView — 签文结果屏（竖排签诗 + 等级大字）

**Files:**
- Create: `sites/cyber-fortune/src/components/fortune-view.tsx`
- Test: `sites/cyber-fortune/src/components/fortune-view.test.tsx`

**Interfaces:**
- Consumes: `Fortune`/`drawFortune`（Task 7）、`levelMeta`（Task 5）、`DEVOUT_STREAK`（Task 8）
- Produces: `<FortuneView fortune={Fortune} streak={number} isRepeat={boolean} onRestart={() => void}>{children}</FortuneView>` —
  - 签名元素：等级大字（等级主色）+ 竖排签诗（`.vertical-text`，两行，首行在右）
  - 宜×2 / 忌×2、贵人/小人、「连续求签第 N 天」；streak ≥ 7 加「虔诚」印章
  - `isRepeat` 时顶部提示「心诚，一天一签」（把 hash 约束讲成产品设定）
  - `children` 插槽放保存按钮（Task 12 注入，本组件不依赖它）；「回到签筒」按钮触发 `onRestart`

- [ ] **Step 1: 写失败测试** `sites/cyber-fortune/src/components/fortune-view.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { drawFortune } from '../lib/fortune-math'
import { FortuneView } from './fortune-view'

const FORTUNE = drawFortune('阿福', new Date(Date.UTC(2026, 7, 4, 4, 0)))

describe('FortuneView', () => {
  it('渲染等级大字、竖排签诗两行、宜忌与贵人小人', () => {
    render(<FortuneView fortune={FORTUNE} streak={1} isRepeat={false} onRestart={() => {}} />)
    expect(screen.getByText(FORTUNE.level)).toBeInTheDocument()
    expect(screen.getByText(FORTUNE.poem.lines[0])).toBeInTheDocument()
    expect(screen.getByText(FORTUNE.poem.lines[1])).toBeInTheDocument()
    for (const item of [...FORTUNE.yi, ...FORTUNE.ji]) {
      expect(screen.getByText(item.text)).toBeInTheDocument()
    }
    expect(screen.getByText(new RegExp(FORTUNE.guiren.text))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(FORTUNE.xiaoren.text))).toBeInTheDocument()
  })

  it('签诗容器使用竖排样式类', () => {
    render(<FortuneView fortune={FORTUNE} streak={1} isRepeat={false} onRestart={() => {}} />)
    expect(screen.getByLabelText('签诗')).toHaveClass('vertical-text')
  })

  it('streak 文案与虔诚印章：第 6 天无章，第 7 天有章', () => {
    const { rerender } = render(
      <FortuneView fortune={FORTUNE} streak={6} isRepeat={false} onRestart={() => {}} />,
    )
    expect(screen.getByText(/连续求签第 6 天/)).toBeInTheDocument()
    expect(screen.queryByText('虔诚')).not.toBeInTheDocument()
    rerender(<FortuneView fortune={FORTUNE} streak={7} isRepeat={false} onRestart={() => {}} />)
    expect(screen.getByText('虔诚')).toBeInTheDocument()
  })

  it('当天重复求签提示「心诚，一天一签」', () => {
    render(<FortuneView fortune={FORTUNE} streak={3} isRepeat={true} onRestart={() => {}} />)
    expect(screen.getByText('心诚，一天一签')).toBeInTheDocument()
  })

  it('首次求签不出现重复提示', () => {
    render(<FortuneView fortune={FORTUNE} streak={1} isRepeat={false} onRestart={() => {}} />)
    expect(screen.queryByText('心诚，一天一签')).not.toBeInTheDocument()
  })

  it('children 插槽渲染，回到签筒触发 onRestart', async () => {
    const onRestart = vi.fn()
    render(
      <FortuneView fortune={FORTUNE} streak={1} isRepeat={false} onRestart={onRestart}>
        <button>保存今日签</button>
      </FortuneView>,
    )
    expect(screen.getByText('保存今日签')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '回到签筒' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/cyber-fortune/src/components/fortune-view.tsx`

```tsx
import type { ReactNode } from 'react'
import { levelMeta } from '../content/pools'
import type { Fortune } from '../lib/fortune-math'
import { DEVOUT_STREAK } from '../lib/streak'

interface Props {
  fortune: Fortune
  streak: number
  isRepeat: boolean
  onRestart: () => void
  children?: ReactNode
}

export function FortuneView({ fortune, streak, isRepeat, onRestart, children }: Props) {
  const accent = levelMeta(fortune.level).accent
  return (
    <section className="flex flex-col items-center gap-6">
      {isRepeat && (
        <p className="text-sm font-medium" style={{ color: 'var(--cf-vermilion)' }}>
          心诚，一天一签
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--cf-ink-faded)' }}>
        {fortune.dateKey} · {fortune.nickname} 的今日签
      </p>
      <p className="font-serif-cn text-7xl font-bold" style={{ color: accent }}>
        {fortune.level}
      </p>
      <div className="vertical-text font-serif-cn h-56 text-xl leading-relaxed" aria-label="签诗">
        <p>{fortune.poem.lines[0]}</p>
        <p>{fortune.poem.lines[1]}</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-4 text-base">
        <div className="flex flex-col gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded font-serif-cn text-lg text-white"
            style={{ backgroundColor: 'var(--cf-vermilion)' }}
          >
            宜
          </span>
          <ul className="flex flex-col gap-1">
            {fortune.yi.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded font-serif-cn text-lg text-white"
            style={{ backgroundColor: 'var(--cf-ink)' }}
          >
            忌
          </span>
          <ul className="flex flex-col gap-1">
            {fortune.ji.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-sm">
        今日贵人：{fortune.guiren.text} · 今日小人：{fortune.xiaoren.text}
      </p>
      <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--cf-ink-faded)' }}>
        连续求签第 {streak} 天
        {streak >= DEVOUT_STREAK && <span className="cf-stamp font-serif-cn">虔诚</span>}
      </p>
      <div className="flex w-full flex-col gap-3">
        {children}
        <button
          type="button"
          onClick={onRestart}
          className="py-2 text-sm"
          style={{ color: 'var(--cf-ink-faded)' }}
        >
          回到签筒
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): 签文结果屏（竖排签诗/等级配色/虔诚印章）"
```

---

### Task 12: 分享卡片 — 黄历卡绘制 + 保存流程

**Files:**
- Create: `sites/cyber-fortune/src/card/draw-fortune-card.ts`, `sites/cyber-fortune/src/components/save-card-button.tsx`, `sites/cyber-fortune/src/components/long-press-overlay.tsx`
- Test: `sites/cyber-fortune/src/card/draw-fortune-card.test.ts`, `sites/cyber-fortune/src/components/save-card-button.test.tsx`

**Interfaces:**
- Consumes: `renderCard`/`saveCard`/`track`/`DrawFn`（shared）、`Fortune`（Task 7）、`levelMeta`（Task 5）、`DEVOUT_STREAK`（Task 8）、`installCanvasStub`/`makeRecordingCtx`（Task 3）
- Produces:
  - `makeFortuneCardDraw(fortune: Fortune, streak: number): DrawFn` — 1080×1440 黄历卡：纸底 + 朱红双线框 + 常驻小印「签」（§7 印章美学）+ 等级大字（该等级主色，群内对比基础）+ 竖排签诗（canvas 逐字竖绘，右列在前）+ 宜/忌 + 贵人/小人 + 「连续求签第 N 天」+ streak ≥ 7 的旋转「虔诚」大印 + 品牌条；**卡上无免责声明**（只在页脚，显式测试）
  - `<SaveCardButton fortune={Fortune} streak={number} />` — 点击：renderCard → saveCard；成功 `track('save_image')`；long-press 策略弹 `<LongPressOverlay dataUrl onClose />`；异常 `track('export_error')` + 提示「保存失败了，直接截图也一样」

- [ ] **Step 1: 写失败测试**

`sites/cyber-fortune/src/card/draw-fortune-card.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { LEVELS } from '../content/pools'
import { drawFortune } from '../lib/fortune-math'
import { makeFortuneCardDraw } from './draw-fortune-card'

const SIZE = { width: 1080, height: 1440 }
const FORTUNE = drawFortune('阿福', new Date(Date.UTC(2026, 7, 4, 4, 0)))

function drawnTexts(streak: number): string[] {
  const ctx = makeRecordingCtx()
  makeFortuneCardDraw(FORTUNE, streak)(ctx as never, SIZE)
  return ctx.fillText.mock.calls.map((c) => String(c[0]))
}

describe('makeFortuneCardDraw', () => {
  it('绘制核心要素：等级/昵称/日期/宜忌标签/贵人小人/品牌条', () => {
    const texts = drawnTexts(1)
    expect(texts).toContain(FORTUNE.level)
    expect(texts.some((t) => t.includes('阿福'))).toBe(true)
    expect(texts.some((t) => t.includes('2026-08-04'))).toBe(true)
    expect(texts).toContain('宜')
    expect(texts).toContain('忌')
    expect(texts.some((t) => t.includes(FORTUNE.guiren.text))).toBe(true)
    expect(texts.some((t) => t.includes(FORTUNE.xiaoren.text))).toBe(true)
    expect(texts.some((t) => t.includes('赛博求签'))).toBe(true)
  })

  it('签诗逐字竖绘：两行的每个字都被单独绘制', () => {
    const texts = drawnTexts(1)
    for (const line of FORTUNE.poem.lines) {
      for (const ch of Array.from(line)) {
        expect(texts).toContain(ch)
      }
    }
  })

  it('streak 文案上卡；≥7 天加「虔诚」印章，<7 不加', () => {
    expect(drawnTexts(3).some((t) => t.includes('连续求签第 3 天'))).toBe(true)
    expect(drawnTexts(3)).not.toContain('虔诚')
    expect(drawnTexts(7)).toContain('虔诚')
  })

  it('常驻小印「签」在卡上（黄历印章美学）', () => {
    expect(drawnTexts(1)).toContain('签')
  })

  it('合规：卡片上不出现免责声明（免责只在页脚一处）', () => {
    expect(drawnTexts(1).join('')).not.toContain('不构成任何预测')
  })

  it('等级五色互异（多人晒签一眼可比）', () => {
    expect(new Set(LEVELS.map((l) => l.accent)).size).toBe(5)
  })
})
```

`sites/cyber-fortune/src/components/save-card-button.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { drawFortune } from '../lib/fortune-math'
import { SaveCardButton } from './save-card-button'

const FORTUNE = drawFortune('阿福', new Date(Date.UTC(2026, 7, 4, 4, 0)))

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

  it('桌面：点击触发下载并埋点 save_image', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton fortune={FORTUNE} streak={1} />)
    await userEvent.click(screen.getByRole('button', { name: '保存今日签' }))
    expect(umamiSpy).toHaveBeenCalledWith('save_image', undefined)
  })

  it('微信：点击弹出长按提示层', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(<SaveCardButton fortune={FORTUNE} streak={1} />)
    await userEvent.click(screen.getByRole('button', { name: '保存今日签' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示降级文案', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<SaveCardButton fortune={FORTUNE} streak={1} />)
    await userEvent.click(screen.getByRole('button', { name: '保存今日签' }))
    expect(umamiSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现**

`sites/cyber-fortune/src/card/draw-fortune-card.ts`：

```ts
import type { DrawFn } from '@viral/shared'
import { levelMeta } from '../content/pools'
import type { Fortune } from '../lib/fortune-math'
import { DEVOUT_STREAK } from '../lib/streak'

export const CARD_COLORS = {
  paper: '#f4e8cd',
  ink: '#2b2620',
  faded: '#6f6353',
  vermilion: '#bc3a23',
} as const

const BRAND_TEXT = '赛博求签 · 电子黄历'
const SERIF = '"Songti SC", "Noto Serif SC", "SimSun", serif'
const SANS = '-apple-system, "PingFang SC", sans-serif'

function drawVerticalLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  yStart: number,
  step: number,
): void {
  Array.from(text).forEach((ch, i) => ctx.fillText(ch, x, yStart + i * step))
}

function drawSeal(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  angle: number,
  fontPx: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.strokeStyle = CARD_COLORS.vermilion
  ctx.lineWidth = Math.max(4, Math.floor(size / 18))
  ctx.strokeRect(-size / 2, -size / 2, size, size)
  ctx.fillStyle = CARD_COLORS.vermilion
  ctx.font = `700 ${fontPx}px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.fillText(text, 0, fontPx / 3)
  ctx.restore()
}

function drawLabelBox(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  bg: string,
): void {
  ctx.fillStyle = bg
  ctx.fillRect(x, y, 72, 72)
  ctx.fillStyle = CARD_COLORS.paper
  ctx.font = `700 48px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.fillText(label, x + 36, y + 52)
}

export function makeFortuneCardDraw(fortune: Fortune, streak: number): DrawFn {
  return (ctx, size) => {
    const accent = levelMeta(fortune.level).accent

    // 黄历纸底 + 朱红双线框
    ctx.fillStyle = CARD_COLORS.paper
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.strokeStyle = CARD_COLORS.vermilion
    ctx.lineWidth = 6
    ctx.strokeRect(28, 28, size.width - 56, size.height - 56)
    ctx.lineWidth = 2
    ctx.strokeRect(48, 48, size.width - 96, size.height - 96)

    // 日期行
    ctx.textAlign = 'center'
    ctx.fillStyle = CARD_COLORS.faded
    ctx.font = `400 34px ${SANS}`
    ctx.fillText(`${fortune.dateKey} · 打工人黄历`, size.width / 2, 130)

    // 常驻小印「签」（右上角）
    drawSeal(ctx, '签', size.width - 150, 170, 110, Math.PI / 24, 52)

    // 等级大字（该等级主色）
    ctx.fillStyle = accent
    ctx.font = `700 220px ${SERIF}`
    ctx.textAlign = 'center'
    ctx.fillText(fortune.level, size.width / 2, 400)

    // 昵称行
    ctx.fillStyle = CARD_COLORS.ink
    ctx.font = `400 44px ${SANS}`
    ctx.fillText(`${fortune.nickname} 的今日签`, size.width / 2, 490)

    // 竖排签诗：右列在前（传统阅读序）。
    // 起点 580 / 步进 64：即使签诗行到 lint 上限 8 字（580 + 8×64 = 1092），也不会撞上 y=1120 的宜/忌区。
    ctx.font = `400 60px ${SERIF}`
    ctx.fillStyle = CARD_COLORS.ink
    drawVerticalLine(ctx, fortune.poem.lines[0], size.width / 2 + 80, 580, 64)
    drawVerticalLine(ctx, fortune.poem.lines[1], size.width / 2 - 80, 580, 64)

    // 宜 / 忌
    drawLabelBox(ctx, '宜', 200, 1120, CARD_COLORS.vermilion)
    drawLabelBox(ctx, '忌', 620, 1120, CARD_COLORS.ink)
    ctx.fillStyle = CARD_COLORS.ink
    ctx.font = `400 38px ${SANS}`
    ctx.textAlign = 'left'
    ctx.fillText(fortune.yi[0].text, 300, 1150)
    ctx.fillText(fortune.yi[1].text, 300, 1200)
    ctx.fillText(fortune.ji[0].text, 720, 1150)
    ctx.fillText(fortune.ji[1].text, 720, 1200)

    // 贵人 / 小人
    ctx.textAlign = 'center'
    ctx.font = `400 36px ${SANS}`
    ctx.fillText(
      `贵人：${fortune.guiren.text} · 小人：${fortune.xiaoren.text}`,
      size.width / 2,
      1280,
    )

    // streak + 虔诚印章
    ctx.fillStyle = CARD_COLORS.faded
    ctx.font = `400 32px ${SANS}`
    ctx.fillText(`连续求签第 ${streak} 天`, size.width / 2, 1340)
    if (streak >= DEVOUT_STREAK) {
      drawSeal(ctx, '虔诚', 880, 1300, 150, -Math.PI / 14, 52)
    }

    // 品牌条（卡上不放免责声明——免责只在页脚一处）
    ctx.fillStyle = CARD_COLORS.faded
    ctx.font = `400 30px ${SANS}`
    ctx.textAlign = 'center'
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 70)
  }
}
```

`sites/cyber-fortune/src/components/long-press-overlay.tsx`：

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
      <img src={dataUrl} alt="今日签文卡" className="max-h-[70vh] w-auto rounded-lg" />
      <p className="text-sm text-white">长按图片保存</p>
      <p className="text-xs text-white/60">点击空白处关闭</p>
    </div>
  )
}
```

`sites/cyber-fortune/src/components/save-card-button.tsx`：

```tsx
import { useState } from 'react'
import { renderCard, saveCard, track } from '@viral/shared'
import type { Fortune } from '../lib/fortune-math'
import { makeFortuneCardDraw } from '../card/draw-fortune-card'
import { LongPressOverlay } from './long-press-overlay'

interface Props {
  fortune: Fortune
  streak: number
}

export function SaveCardButton({ fortune, streak }: Props) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleSave = () => {
    try {
      const canvas = renderCard(makeFortuneCardDraw(fortune, streak))
      saveCard(canvas, {
        filename: 'cyber-fortune.png',
        onLongPress: (dataUrl) => setOverlayUrl(dataUrl),
      })
      track('save_image')
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
        className="rounded-lg py-3 font-medium"
        style={{ backgroundColor: 'var(--cf-vermilion)', color: 'var(--cf-paper)' }}
      >
        保存今日签
      </button>
      {failed && (
        <p className="text-center text-sm" style={{ color: 'var(--cf-ink-faded)' }}>
          保存失败了，直接截图也一样
        </p>
      )}
      {overlayUrl && <LongPressOverlay dataUrl={overlayUrl} onClose={() => setOverlayUrl(null)} />}
    </>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + typecheck**

Run: `pnpm --filter @viral/cyber-fortune test && pnpm --filter @viral/cyber-fortune typecheck`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): 黄历分享卡绘制与双路径保存（等级五色/虔诚印章）"
```

---

### Task 13: App 组装（状态机 + generate / streak_day 埋点 + 页脚免责）

**Files:**
- Modify: `sites/cyber-fortune/src/app.tsx`
- Test: `sites/cyber-fortune/src/app.test.tsx`

**Interfaces:**
- Consumes: `DrawScreen`（10）、`FortuneView`（11）、`SaveCardButton`（12）、`drawFortune`（7）、`advanceStreak`（8）、`loadStreak`/`saveStreak`/`saveNickname`（8）、`track`（shared）
- Produces: `<App />` —
  - 状态机 `{ screen: 'draw' } | { screen: 'result'; fortune; streak; isRepeat }`
  - 掉签回调里（全站唯一 `new Date()`）：抽签 → 推进并持久化 streak → 记住昵称 → `track('generate', { level })`；**仅当日首签** `track('streak_day', { streak })`
  - 页脚常驻两行（全站唯一免责位置）：隐私声明 + 「签文为程序生成的玩梗内容，不构成任何预测与建议」

- [ ] **Step 1: 写失败测试** `sites/cyber-fortune/src/app.test.tsx`

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { App } from './app'

function drawOnce() {
  const tube = screen.getByRole('button', { name: '签筒' })
  fireEvent.pointerDown(tube)
  fireEvent.pointerUp(tube)
  act(() => {
    vi.advanceTimersByTime(1600)
  })
}

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    installCanvasStub()
    vi.useFakeTimers()
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('完整流程：求签 → 结果屏 + generate/streak_day 埋点', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    drawOnce()
    expect(screen.getByText(/连续求签第 1 天/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存今日签' })).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('generate', { level: expect.any(String) })
    expect(umamiSpy).toHaveBeenCalledWith('streak_day', { streak: 1 })
  })

  it('同天重复求签：出「心诚，一天一签」，streak_day 不重报，generate 照报', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    drawOnce()
    fireEvent.click(screen.getByRole('button', { name: '回到签筒' }))
    drawOnce() // 昵称已记住，直接再求
    expect(screen.getByText('心诚，一天一签')).toBeInTheDocument()
    expect(screen.getByText(/连续求签第 1 天/)).toBeInTheDocument()
    const calls = (name: string) => umamiSpy.mock.calls.filter((c) => c[0] === name).length
    expect(calls('generate')).toBe(2)
    expect(calls('streak_day')).toBe(1)
  })

  it('昵称持久化：回到签筒后输入框仍是上次昵称', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
    drawOnce()
    fireEvent.click(screen.getByRole('button', { name: '回到签筒' }))
    expect(screen.getByLabelText('怎么称呼你')).toHaveValue('阿福')
  })

  it('页脚常驻免责声明与隐私声明（全站唯一免责位置）', () => {
    render(<App />)
    expect(
      screen.getByText('签文为程序生成的玩梗内容，不构成任何预测与建议'),
    ).toBeInTheDocument()
    expect(screen.getByText(/只存在这台设备/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @viral/cyber-fortune test`
Expected: FAIL

- [ ] **Step 3: 实现** `sites/cyber-fortune/src/app.tsx`（整体替换占位）

```tsx
import { useState } from 'react'
import { track } from '@viral/shared'
import { drawFortune, type Fortune } from './lib/fortune-math'
import { advanceStreak, type StreakState } from './lib/streak'
import { loadStreak, saveNickname, saveStreak } from './lib/storage'
import { DrawScreen } from './components/draw-screen'
import { FortuneView } from './components/fortune-view'
import { SaveCardButton } from './components/save-card-button'

type Screen =
  | { screen: 'draw' }
  | { screen: 'result'; fortune: Fortune; streak: StreakState; isRepeat: boolean }

export function App() {
  const [state, setState] = useState<Screen>({ screen: 'draw' })

  const handleDraw = (nickname: string) => {
    const now = new Date() // 全站唯一允许取当前时间的位置
    const fortune = drawFortune(nickname, now)
    const advanced = advanceStreak(loadStreak(), now)
    saveStreak(advanced.state)
    saveNickname(nickname)
    track('generate', { level: fortune.level })
    if (!advanced.isRepeat) track('streak_day', { streak: advanced.state.count })
    setState({ screen: 'result', fortune, streak: advanced.state, isRepeat: advanced.isRepeat })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex-1">
        {state.screen === 'draw' ? (
          <DrawScreen onDraw={handleDraw} />
        ) : (
          <FortuneView
            fortune={state.fortune}
            streak={state.streak.count}
            isRepeat={state.isRepeat}
            onRestart={() => setState({ screen: 'draw' })}
          >
            <SaveCardButton fortune={state.fortune} streak={state.streak.count} />
          </FortuneView>
        )}
      </div>
      <footer
        className="flex flex-col gap-1 pt-10 text-center text-xs"
        style={{ color: 'var(--cf-ink-faded)' }}
      >
        <p>昵称与求签记录只存在这台设备上，不会上传</p>
        <p>签文为程序生成的玩梗内容，不构成任何预测与建议</p>
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + 全仓核验**

Run: `pnpm -r test && pnpm -r typecheck && pnpm --filter @viral/cyber-fortune build`
Expected: 全 PASS（含 life-grid 回归），构建成功

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(cyber-fortune): App 状态机组装与 generate/streak_day 埋点"
```

---

### Task 14: 上线准备（gzip 核验 + 真机冒烟 + 手工部署）

**Files:**
- Modify: `README.md`（站点状态表 08 行）、`sites/cyber-fortune/index.html`（umami website-id）

**Interfaces:**
- Consumes: 全部前置任务

- [ ] **Step 1: 体积预算核验**

Run:

```bash
pnpm --filter @viral/cyber-fortune build
find /Users/ahs/Documents/vibe-coding/viral-sites/sites/cyber-fortune/dist/assets \
  \( -name '*.js' -o -name '*.css' \) -exec sh -c 'gzip -c "$1" | wc -c' _ {} \;
```

Expected: vite 输出的 gzip 列与上述复核相符，JS + CSS gzip 合计 < 100KB（react-dom 之外无其他运行时依赖，签池内容为纯文本，正常应在 70KB 内）。超了先查 `pnpm --filter @viral/cyber-fortune list --depth 0` 是否混入多余依赖。

- [ ] **Step 2: 本地手机真机冒烟**

Run: `pnpm --filter @viral/cyber-fortune dev --host`
手机连同一 Wi-Fi 打开 `http://<局域网IP>:5173`，核验清单：

- [ ] 昵称输入 → 长按签筒有蓄力动画 → 松手掉签 1.5s → 出签文卡
- [ ] 同昵称再求一次 → 同一支签 + 「心诚，一天一签」
- [ ] 换昵称 → 不同签；换回原昵称 → 原签（同天确定性）
- [ ] 竖排签诗在窄屏（375px 宽）不溢出、不换行错乱
- [ ] 保存卡片 → 图上等级颜色与结果屏一致

- [ ] **Step 3: 【手工·需用户】创建 umami 站点**

在 umami 后台（与 life-grid 同一账号）Add website → 拿到 website-id → 替换 `sites/cyber-fortune/index.html` 中的 `TO_BE_FILLED`。此步骤需要用户账号，执行者停下来向用户要。

- [ ] **Step 4: 【手工·需用户】部署 Cloudflare Pages**

```bash
pnpm dlx wrangler login        # 需要用户浏览器授权
pnpm dlx wrangler pages project create cyber-fortune --production-branch main
pnpm --filter @viral/cyber-fortune build
pnpm dlx wrangler pages deploy sites/cyber-fortune/dist --project-name cyber-fortune
```

产出 `https://cyber-fortune.pages.dev`（实际域名以 wrangler 输出为准，可能带随机后缀，如 life-grid 实际是 `life-grid-7on.pages.dev`）。拿到实际域名后，把 `draw-fortune-card.ts` 的 `BRAND_TEXT` 更新为 `赛博求签 · <实际域名>` 并重新 build + deploy——卡片是传播载体，图上必须带可回流的站点地址（工厂原则：图能传，链接传不动）。

- [ ] **Step 5: 四环境手工验收 + 指标就位**

- [ ] iPhone 微信内打开 → 保存走长按路径，图能存到相册
- [ ] 安卓微信内打开 → 同上
- [ ] iOS Safari → 长按路径
- [ ] 桌面 Chrome → 直接下载
- [ ] umami 后台能看到 pageview / `generate`（带 level）/ `streak_day`（带 streak）/ `save_image` 事件
- [ ] 次日复访自测：第二天再求一签，`streak_day` 报 `streak: 2`，卡片显示「连续求签第 2 天」
- [ ] 指标口径确认：保存率 = save_image ÷ pageview；**7 日复访率（生死指标，预期 > 15%）= streak_day 中 streak ≥ 2 的事件占比**，观察 7 天后按工厂 SOP 决策

- [ ] **Step 6: 更新 README 状态并提交推送**

README「候选池」表中 08 行状态注明 `🚀 已上线（cyber-fortune.pages.dev）`（如需要可把 08 行上移到主路线图表，格式对齐 01 行）。

```bash
git add -A && git commit -m "chore: cyber-fortune 上线，更新状态与 umami 配置" && git push
```

---

## Self-Review 记录

- **Spec 覆盖**：设计文档 §3 用户流程（Task 10/11/13：昵称记忆、长按蓄力、掉签 1.5s、「心诚，一天一签」）、§4 签文结构（Task 5 内容池 + 冲突黑名单；等级加权 15/30/30/15/10 于 Task 7 并配统计测试）、§5 hash 确定性（Task 1/2/4/7：fnv1a、同 seed 序列、normalize、版本号进 seed、UTC+8 显式日期）、§6 streak（Task 8：连续/中断/当天不重复计数/跨月跨年、≥7 虔诚印章；不做补签提醒）、§7 分享卡片（Task 12：1080×1440、等级五色、竖排签诗、印章）、§8 合规（去宗教化词表 + 建议式表述红线 lint 于 Task 6 且入构建门禁；免责声明页脚唯一，卡片以测试断言不含）、§9 埋点（Task 13：generate/save_image/streak_day + 7 日复访率口径写入 Task 14）、§10 测试（各任务 TDD 全覆盖：确定性/权重分布/冲突生效/节令区间/时区/streak/签池 lint）、节令皮（Task 9 只做配置与命中，v2 边界写明）。
- **发现的设计文档矛盾与处置**：
  1. §5 seed 拼接式无分隔符，存在「昵称尾部 + 日期头部」拼接歧义 → 实现加 `|` 分隔符（Global Constraints 注明偏离）。
  2. §5「池子更新次日生效」在纯前端无法机制化冻结（版本号在 seed 里，当天 bump 当天生效）→ 降级为运维约定：改池同 commit bump `POOL_VERSION` + UTC+8 凌晨窗口发布。
  3. §4 组合空间按 30² 计人物（允许贵人=小人）→ 实现取不重复 2 人（贵人≠小人更符合产品直觉，组合数变 30×29，量级不变）。
  4. §7「朱红印章」为常驻视觉元素 vs §6「虔诚」印章为 streak ≥7 专属 → 二者并存：常驻右上角小印「签」承担黄历印章美学，「虔诚」大印仅 ≥7 出现，测试分别断言。
  5. §9 未定义同天重复求签时 `streak_day` 是否重报 → 定为仅当日首签上报，防止复访分布被重复求签污染（Task 13 测试锁定）。
  6. 内容量：产品设计与本计划统一为验证版 40/30/30/20；D7 复访成立后再单独立项扩到 100/50/50/30，改池须 bump 版本号。
- **占位符扫描**：无 TBD/TODO；`TO_BE_FILLED`（umami website-id）与 Task 14 两个【手工·需用户】步骤为既定流程（与 life-grid 计划同款），非占位。签池 120 条内容全部逐字成文于 Task 5。
- **类型一致性**：`FortuneLevel`/`Poem`/`PoolItem`/`Pools`/`LEVELS`（Task 5 定义，6/7/11/12 消费）、`Fortune`（Task 7 定义，11/12/13 消费）、`StreakState`/`DEVOUT_STREAK`（Task 8 定义，11/12/13 消费）、`fnv1a`/`seededSequence`/`pickOne`/`pickN`/`SeededSequence`（Task 1/2 定义，7 消费）、`DrawFn`/`renderCard`/`saveCard`/`track`（shared 现有导出，12/13 消费，签名与 `packages/shared/src/index.ts` 逐一核对一致）、`RecordingCtx`（Task 3 定义，12/13 测试消费）。
- **约束复核**：全部业务纯函数显式传 `Date`，`new Date()` 仅 `app.tsx` 一处；`pickN` 不改传入数组；埋点不带昵称；色板与 life-grid 零重合；vitest `globals: true` + setupFiles 对齐 life-grid 实况；build 门禁含签池 lint；冲突过滤后忌池候选最少 28 条（宜同时命中 y16+y18 只 ban j04），`pickN(…, 2)` 永不越界。
