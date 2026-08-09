# 四站 UI 验收问题修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `life-grid`、`tacit-test`、`refusal-generator`、`cyber-fortune` 在 2026-08-05 UI 验收中确认的移动端信息层级、分享卡、横向溢出和键盘可用性问题，并为拒绝话术的 AI v2 留下安全、受触发条件约束的后续方案。

**Architecture:** 每个站保持独立，不跨站 import；本轮只在现有组件和分享卡绘制层做局部修复。`life-grid` 先把关键数字移到格子图之前，并修复分享卡格子超出 1080×1440 画布的问题；`tacit-test` 在挑战卡中加入能打开当前挑战链接的二维码；`refusal-generator` 改为无横向滚动的语气布局、站内自定义场景和更聚焦的卡片；`cyber-fortune` 为长按交互补齐键盘路径。AI v2 不进入默认执行范围，只有满足产品文档的复制率门槛并具备 Workers 安全管线后才启用。

**Tech Stack:** pnpm workspace · Vite 8 · React 19 · TypeScript(strict) · Tailwind v4 · Vitest + Testing Library(jsdom) · Canvas 2D · Cloudflare Pages

## Global Constraints

- 开始前必须完整阅读仓库根目录 `AGENTS.md`、本计划、`docs/00-factory-design.md`、`docs/00a-style-map.md`，以及当前任务对应的产品文档。
- 当前工作区不是干净仓库；已有修改和未跟踪文件都属于用户。禁止使用 `git reset --hard`、`git checkout --`、`git clean`、`git stash` 或任何批量回滚命令。
- 禁止使用 `git add .`、`git add -A`；每次只暂存当前 Task 明确列出的文件。
- 不修改 `sites/mental-state`、`sites/internet-age`，也不顺手重构 `packages/shared`。
- 保留四个站现有视觉方向：人生方格纸、默契手绘、拒绝 Bento、赛博黄历；禁止统一成同一套模板。
- 移动端基准视口为 `390×844`；桌面回归视口为 `1280×900`。
- 所有分享卡仍为 `1080×1440`；任何 `fillRect`、`fillText` 的关键内容不得落到画布外。
- 页面和下载卡只保留帮助用户理解结果、完成分享或继续操作的信息；不得用装饰性说明填空白。
- 小字号正文和背景的对比度必须达到 `4.5:1`；大字号文字必须达到 `3:1`。
- 埋点禁止包含昵称、生日、答题答案、自定义处境、称呼、挑战 payload、完整 URL 或 AI 返回正文。
- AI Key 永远不能出现在前端代码、Vite 环境变量、页面源码、日志、埋点或错误消息中。
- 每个 Task 遵循 TDD：先写失败测试并确认失败，再实现最小改动，再跑当前包的 test、typecheck、build。
- 每个 Task 完成后运行 `git diff --check`；只有当前 Task 的验证通过后才允许提交。
- 不部署、不创建 Cloudflare 资源、不写入生产 secret，除非用户另行明确授权。

---

## Audit Facts To Preserve

本计划只处理已经复现或能够从源码确认的问题：

1. `life-grid` 结果页先出现约一整屏密集格子，`47.1%` 等关键数字在格子之后；下载卡的格子高度超过画布，百分比和关键文案被裁掉。
2. `tacit-test` 挑战卡没有二维码或链接，单独分享图片后，接收者无法进入挑战。
3. `refusal-generator` 在 `390px` 宽度下把第五个语气“职场黑话”放到屏幕外，并显示横向滚动条。
4. `refusal-generator` 第九格使用 `mailto:`，把用户带离站内；用户无法直接输入自己的处境并拿到结果。
5. `refusal-generator` 标准分享卡正文集中在上半部，底部色块没有含义且造成注意力分散。
6. `cyber-fortune` 的签筒只有 pointer 事件；键盘聚焦后按 Enter/Space 不会求签。
7. 默契、人生和拒绝站的部分辅助文字对比度只有约 `2.3:1–3.3:1`。

验收截图中出现的粉色翻译悬浮按钮属于浏览器扩展，不是站点代码，禁止围绕它修改页面。

---

## File Map

### Task 1 · 人生进度条

- Modify: `sites/life-grid/src/components/result-screen.tsx`
- Modify: `sites/life-grid/src/components/result-screen.test.tsx`
- Modify: `sites/life-grid/src/card/draw-life-card.ts`
- Modify: `sites/life-grid/src/card/draw-life-card.test.ts`

### Task 2 · 默契挑战卡可回流

- Modify: `sites/tacit-test/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `sites/tacit-test/src/card/qr-matrix.ts`
- Create: `sites/tacit-test/src/card/qr-matrix.test.ts`
- Modify: `sites/tacit-test/src/card/draw-invite-card.ts`
- Modify: `sites/tacit-test/src/card/draw-invite-card.test.ts`
- Modify: `sites/tacit-test/src/components/invite-screen.tsx`
- Modify: `sites/tacit-test/src/components/invite-screen.test.tsx`

### Task 3 · 拒绝话术移动端布局与站内自定义场景

- Create: `sites/refusal-generator/src/configs/custom-phrases.ts`
- Create: `sites/refusal-generator/src/lib/custom-scene.ts`
- Create: `sites/refusal-generator/src/lib/custom-scene.test.ts`
- Create: `sites/refusal-generator/src/components/custom-scene-form.tsx`
- Create: `sites/refusal-generator/src/components/custom-scene-form.test.tsx`
- Modify: `sites/refusal-generator/src/components/scene-grid.tsx`
- Modify: `sites/refusal-generator/src/components/scene-grid.test.tsx`
- Modify: `sites/refusal-generator/src/components/tone-picker.tsx`
- Modify: `sites/refusal-generator/src/components/tone-picker.test.tsx`
- Modify: `sites/refusal-generator/src/app.tsx`
- Modify: `sites/refusal-generator/src/app.test.tsx`

### Task 4 · 拒绝话术分享卡聚焦

- Modify: `sites/refusal-generator/src/card/draw-quote-card.ts`
- Modify: `sites/refusal-generator/src/card/draw-quote-card.test.ts`
- Modify: `sites/refusal-generator/src/app.tsx`

### Task 5 · 赛博求签键盘路径

- Modify: `sites/cyber-fortune/src/components/draw-screen.tsx`
- Modify: `sites/cyber-fortune/src/components/draw-screen.test.tsx`

### Task 6 · 小字号对比度

- Modify: `sites/tacit-test/src/app.tsx`
- Modify: `sites/tacit-test/src/components/home-screen.tsx`
- Modify: `sites/tacit-test/src/components/nickname-screen.tsx`
- Modify: `sites/tacit-test/src/components/invite-screen.tsx`
- Modify: `sites/tacit-test/src/components/compare-screen.tsx`
- Modify: `sites/tacit-test/src/components/copy-link-button.tsx`
- Modify: `sites/tacit-test/src/components/save-card-button.tsx`
- Modify: `sites/tacit-test/src/components/long-press-overlay.tsx`
- Modify: `sites/life-grid/src/app.tsx`
- Modify: `sites/life-grid/src/components/input-screen.tsx`
- Modify: `sites/life-grid/src/components/result-screen.tsx`
- Modify: `sites/life-grid/src/components/save-card-button.tsx`
- Modify: `sites/life-grid/src/components/long-press-overlay.tsx`
- Modify: `sites/refusal-generator/src/app.tsx`
- Modify: `sites/refusal-generator/src/components/scene-grid.tsx`
- Modify: `sites/refusal-generator/src/components/phrase-list.tsx`
- Modify: `sites/refusal-generator/src/components/long-press-overlay.tsx`

### Task 7 · AI v2（有条件执行，默认跳过）

- Deferred; see the dedicated gate and architecture at the end of this plan.

---

## Task 0: 记录基线并保护用户工作区

**Files:** None.

- [ ] **Step 1: 记录工作区与最近提交**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: 命令成功；把已有修改列表写入执行日志。不要清理、暂存或提交这些文件。

- [ ] **Step 2: 跑四个目标包的基线**

Run:

```bash
pnpm --filter @viral/life-grid test
pnpm --filter @viral/tacit-test test
pnpm --filter @viral/refusal-generator test
pnpm --filter @viral/cyber-fortune test
pnpm --filter @viral/life-grid typecheck
pnpm --filter @viral/tacit-test typecheck
pnpm --filter @viral/refusal-generator typecheck
pnpm --filter @viral/cyber-fortune typecheck
```

Expected: 全部通过。若基线已有失败，记录失败测试与错误文本；只修与本计划直接相关的失败。

---

## Task 1: 修复人生进度条结果层级与卡片越界

**Files:**

- Modify: `sites/life-grid/src/components/result-screen.tsx`
- Modify: `sites/life-grid/src/components/result-screen.test.tsx`
- Modify: `sites/life-grid/src/card/draw-life-card.ts`
- Modify: `sites/life-grid/src/card/draw-life-card.test.ts`

**Interfaces:**

- Consumes: `computeStats(input: LifeInput): LifeStats`、`buildCopyLines(stats): CopyLine[]`、`GRID_COLS = 52`。
- Produces: 页面首屏摘要；只在分享卡内部使用的“年份为列、星期为行”布局；不改变 `LifeStats` 公共类型。

- [ ] **Step 1: 为结果摘要先于格子图写失败测试**

在 `result-screen.test.tsx` 增加：

```tsx
it('关键百分比在格子图之前，首屏先给结论', () => {
  render(<ResultScreen input={INPUT} onRestart={() => {}} />)
  const summary = screen.getByTestId('life-summary')
  const grid = screen.getByLabelText('人生格子图')
  expect(summary).toHaveTextContent(/你的人生已经走过/)
  expect(summary).toHaveTextContent(/%/)
  expect(summary.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('摘要只突出百分比、见父母次数和春节数', () => {
  render(<ResultScreen input={INPUT} onRestart={() => {}} />)
  const summary = screen.getByTestId('life-summary')
  expect(summary).toHaveTextContent(/还能见父母大约/)
  expect(summary).toHaveTextContent(/个春节/)
  expect(summary).not.toHaveTextContent(/工作日/)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm --filter @viral/life-grid test -- src/components/result-screen.test.tsx
```

Expected: FAIL，原因是找不到 `life-summary`。

- [ ] **Step 3: 调整结果页层级**

将 `ResultScreen` 的内容顺序固定为“摘要 → 格子 → 次要数字 → 操作”。实现逻辑使用现有 `CopyLine.id`，不要复制计算公式：

```tsx
const stats = computeStats(input)
const lines = buildCopyLines(stats)
const byId = new Map(lines.map((line) => [line.id, line.text]))
const secondaryIds = ['weeks', 'workdays', 'blank'] as const

return (
  <section className="flex flex-col gap-7">
    <header data-testid="life-summary" className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-[#6d675b]">你的人生已经走过</p>
        <p className="mt-1 text-6xl font-semibold text-[#c8392b]">{stats.percent}%</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm leading-relaxed">
        <p className="rounded-lg border border-[#d9d2c0] p-3">{byId.get('parents')}</p>
        <p className="rounded-lg border border-[#d9d2c0] p-3">{byId.get('festivals')}</p>
      </div>
    </header>

    <LifeGridCanvas weeksLived={stats.weeksLived} totalWeeks={stats.totalWeeks} />

    <ul className="flex flex-col gap-3">
      {secondaryIds.flatMap((id, index) => {
        const text = byId.get(id)
        return text ? [
          <li
            key={id}
            className="animate-[fade-in_0.6s_ease-out_both] text-base leading-relaxed"
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            {text}
          </li>,
        ] : []
      })}
    </ul>

    <div className="flex flex-col gap-3">
      {children}
      <button type="button" onClick={onRestart} className="py-2 text-sm text-[#6d675b]">
        重新计算
      </button>
    </div>
  </section>
)
```

彩蛋模式只有 `bonus` 时，摘要改为显示 `bonus` 文案，不渲染不存在的 `parents`、`festivals`。

- [ ] **Step 4: 为分享卡全部绘制内容在画布内写失败测试**

把 `fakeCtx` 保留为 recording context，并增加：

```ts
it('全部格子与关键文字都落在 1080×1440 画布内', () => {
  const ctx = fakeCtx()
  makeLifeCardDraw(stats)(ctx, { width: 1080, height: 1440 })

  for (const [x, y, width, height] of (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls) {
    expect(x).toBeGreaterThanOrEqual(0)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(x + width).toBeLessThanOrEqual(1080)
    expect(y + height).toBeLessThanOrEqual(1440)
  }

  const texts = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
  expect(texts.some(([text]) => String(text) === '38.6%')).toBe(true)
  expect(texts.some(([text]) => String(text).includes('还能见父母'))).toBe(true)
  expect(texts.every(([, , y]) => Number(y) >= 0 && Number(y) <= 1440)).toBe(true)
})
```

- [ ] **Step 5: 运行测试确认旧版卡片越界**

Run:

```bash
pnpm --filter @viral/life-grid test -- src/card/draw-life-card.test.ts
```

Expected: FAIL；旧实现中格子 `y + height` 超过 `1440`。

- [ ] **Step 6: 为卡片使用“年份为列、星期为行”的有界布局**

在 `draw-life-card.ts` 内加入卡片专用布局。页面继续使用原来的 `layoutLifeGrid`，不要改共享页面含义：

```ts
interface CardCell {
  row: number
  col: number
  state: 'past' | 'current' | 'future'
}

export function layoutLifeCardGrid(weeksLived: number, totalWeeks: number) {
  const rows = 52
  const cols = Math.ceil(totalWeeks / rows)
  const cells: CardCell[] = []
  for (let index = 0; index < totalWeeks; index += 1) {
    cells.push({
      row: index % rows,
      col: Math.floor(index / rows),
      state: index < weeksLived
        ? 'past'
        : index === weeksLived && weeksLived < totalWeeks
          ? 'current'
          : 'future',
    })
  }
  return { rows, cols, cells }
}
```

卡片固定布局：标题 `y=100`，百分比 `y=255`，格子区域顶点 `y=390`、最大宽 `900`、最大高 `620`，两条关键结论位于 `1080–1210`，品牌条位于 `1370`。格子尺寸必须同时受宽高约束：

```ts
const layout = layoutLifeCardGrid(stats.weeksLived, stats.totalWeeks)
const gap = 2
const cell = Math.max(
  2,
  Math.floor(
    Math.min(
      (900 - (layout.cols - 1) * gap) / layout.cols,
      (620 - (layout.rows - 1) * gap) / layout.rows,
    ),
  ),
)
const gridWidth = layout.cols * cell + (layout.cols - 1) * gap
const gridHeight = layout.rows * cell + (layout.rows - 1) * gap
const originX = (size.width - gridWidth) / 2
const originY = 390 + (620 - gridHeight) / 2
```

卡片必须绘制：`我的人生进度条`、大号百分比、`一格是一个星期`、完整格子、父母见面结论、剩余空白周数、品牌条。删除旧的 `gridBottom + 160` 推导，避免再次越界。

- [ ] **Step 7: 运行当前包验证**

Run:

```bash
pnpm --filter @viral/life-grid test
pnpm --filter @viral/life-grid typecheck
pnpm --filter @viral/life-grid build
git diff --check
```

Expected: 全部通过。

- [ ] **Step 8: 提交 Task 1**

```bash
git add sites/life-grid/src/components/result-screen.tsx \
  sites/life-grid/src/components/result-screen.test.tsx \
  sites/life-grid/src/card/draw-life-card.ts \
  sites/life-grid/src/card/draw-life-card.test.ts
git diff --cached --name-only
git commit -m "fix(life-grid): prioritize results and fit share card"
```

---

## Task 2: 让默契挑战卡本身可以打开挑战

**Files:**

- Modify: `sites/tacit-test/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `sites/tacit-test/src/card/qr-matrix.ts`
- Create: `sites/tacit-test/src/card/qr-matrix.test.ts`
- Modify: `sites/tacit-test/src/card/draw-invite-card.ts`
- Modify: `sites/tacit-test/src/card/draw-invite-card.test.ts`
- Modify: `sites/tacit-test/src/components/invite-screen.tsx`
- Modify: `sites/tacit-test/src/components/invite-screen.test.tsx`

**Interfaces:**

- Consumes: 已生成的精确挑战 URL `url`。
- Produces: `createQrMatrix(value: string): QrMatrix`；`makeInviteCardDraw(quiz, nickname, url): DrawFn`。

- [ ] **Step 1: 安装二维码依赖**

Run:

```bash
pnpm --filter @viral/tacit-test add qrcode
pnpm --filter @viral/tacit-test add -D @types/qrcode
```

Expected: 只修改 `sites/tacit-test/package.json` 和 `pnpm-lock.yaml`。

- [ ] **Step 2: 为二维码矩阵写失败测试**

创建 `qr-matrix.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { createQrMatrix } from './qr-matrix'

describe('createQrMatrix', () => {
  it('同一挑战链接生成稳定的方形矩阵', () => {
    const first = createQrMatrix('https://example.com/c?d=abc')
    const second = createQrMatrix('https://example.com/c?d=abc')
    expect(first.size).toBeGreaterThanOrEqual(21)
    expect(first.size).toBe(second.size)
    expect(first.darkModules).toEqual(second.darkModules)
    expect(first.darkModules.length).toBeGreaterThan(0)
  })

  it('不同挑战链接产生不同矩阵', () => {
    expect(createQrMatrix('https://example.com/c?d=a').darkModules)
      .not.toEqual(createQrMatrix('https://example.com/c?d=b').darkModules)
  })
})
```

- [ ] **Step 3: 实现同步二维码矩阵适配层**

创建 `qr-matrix.ts`：

```ts
import QRCode from 'qrcode'

export interface QrMatrix {
  size: number
  darkModules: ReadonlyArray<readonly [row: number, col: number]>
}

export function createQrMatrix(value: string): QrMatrix {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  const darkModules: Array<readonly [number, number]> = []
  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let col = 0; col < qr.modules.size; col += 1) {
      if (qr.modules.get(row, col)) darkModules.push([row, col])
    }
  }
  return { size: qr.modules.size, darkModules }
}
```

- [ ] **Step 4: 为挑战卡必须包含二维码和 CTA 写失败测试**

更新 `draw-invite-card.test.ts`：

```ts
const URL = 'https://example.com/c?d=challenge-payload'

it('卡片含扫码行动文案，并绘制二维码模块', () => {
  const ctx = makeRecordingCtx()
  makeInviteCardDraw('friend', '阿福', URL)(ctx as never, SIZE)
  const texts = ctx.fillText.mock.calls.map((call) => String(call[0]))
  expect(texts).toContain('扫码答题，看看我们到底多默契')
  expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(100)
})
```

把本文件里所有 `makeInviteCardDraw` 调用改为三个参数，删除不再使用的 `ANSWERS`、`STYLE_REMARKS` 以及“风格锐评”断言。

- [ ] **Step 5: 重排挑战卡，二维码成为唯一主要行动入口**

把签名改为：

```ts
export function makeInviteCardDraw(
  quiz: QuizId,
  nickname: string,
  url: string,
): DrawFn
```

在 `draw-invite-card.ts` 增加二维码绘制函数：

```ts
function drawQr(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  boxSize: number,
) {
  const qr = createQrMatrix(value)
  const quiet = 4
  const moduleSize = Math.floor(boxSize / (qr.size + quiet * 2))
  const actual = moduleSize * (qr.size + quiet * 2)
  const startX = x + (boxSize - actual) / 2 + quiet * moduleSize
  const startY = y + (boxSize - actual) / 2 + quiet * moduleSize

  ctx.fillStyle = PALETTE.paper
  ctx.fillRect(x, y, boxSize, boxSize)
  ctx.fillStyle = PALETTE.ink
  for (const [row, col] of qr.darkModules) {
    ctx.fillRect(
      startX + col * moduleSize,
      startY + row * moduleSize,
      moduleSize,
      moduleSize,
    )
  }
}
```

卡片内容顺序固定为：标题、发起人昵称、题库宣言、CTA、`360×360` 二维码、题库名、品牌条。删除下载卡中的长篇“答题风格”段落；页面上仍可保留这段结果。二维码必须编码传入的完整 `url`，不得只编码站点首页。

同步从 `draw-invite-card.ts` 删除不再使用的 `styleRemark` import；`InviteScreen` 页面本身继续使用 `styleRemark(payload.a)`，不要删页面结果。

- [ ] **Step 6: 把当前挑战 URL 传给卡片绘制器**

在 `invite-screen.tsx` 修改：

```tsx
<SaveCardButton
  draw={makeInviteCardDraw(payload.q, payload.n, url)}
  filename="tacit-invite.png"
  label="保存可扫码挑战卡"
  cardId="invite"
/>
```

在 `invite-screen.test.tsx` 断言新按钮文案存在，并确认传入 `url` 的页面仍保留“复制挑战链接”。

- [ ] **Step 7: 运行当前包验证**

Run:

```bash
pnpm --filter @viral/tacit-test test
pnpm --filter @viral/tacit-test typecheck
pnpm --filter @viral/tacit-test build
git diff --check
```

Expected: 全部通过；构建后确认二维码依赖没有把首屏 gzip 推到 `100KB` 以上。若超过预算，停止并报告，不要换成手写二维码算法。

- [ ] **Step 8: 提交 Task 2**

```bash
git add sites/tacit-test/package.json pnpm-lock.yaml \
  sites/tacit-test/src/card/qr-matrix.ts \
  sites/tacit-test/src/card/qr-matrix.test.ts \
  sites/tacit-test/src/card/draw-invite-card.ts \
  sites/tacit-test/src/card/draw-invite-card.test.ts \
  sites/tacit-test/src/components/invite-screen.tsx \
  sites/tacit-test/src/components/invite-screen.test.tsx
git diff --cached --name-only
git commit -m "fix(tacit-test): add scannable challenge card"
```

---

## Task 3: 修复拒绝话术语气溢出，并加入站内自定义场景

**Files:**

- Create: `sites/refusal-generator/src/configs/custom-phrases.ts`
- Create: `sites/refusal-generator/src/lib/custom-scene.ts`
- Create: `sites/refusal-generator/src/lib/custom-scene.test.ts`
- Create: `sites/refusal-generator/src/components/custom-scene-form.tsx`
- Create: `sites/refusal-generator/src/components/custom-scene-form.test.tsx`
- Modify: `sites/refusal-generator/src/components/scene-grid.tsx`
- Modify: `sites/refusal-generator/src/components/scene-grid.test.tsx`
- Modify: `sites/refusal-generator/src/components/tone-picker.tsx`
- Modify: `sites/refusal-generator/src/components/tone-picker.test.tsx`
- Modify: `sites/refusal-generator/src/app.tsx`
- Modify: `sites/refusal-generator/src/app.test.tsx`

**Interfaces:**

- Produces: `CUSTOM_SCENE`、`buildCustomPhrases(toneId, situation): Phrase[]`。
- The custom fallback remains local and deterministic; it does not call AI and does not upload the user's text.

- [ ] **Step 1: 为五个语气全部可见写失败测试**

在 `tone-picker.test.tsx` 增加：

```tsx
it('使用两行网格，不依赖横向滚动发现第五项', () => {
  render(<TonePicker selected={null} onSelect={() => {}} />)
  const group = screen.getByRole('group', { name: '选择语气' })
  expect(group.className).toContain('grid')
  expect(group.className).toContain('grid-cols-3')
  expect(group.className).not.toContain('overflow-x-auto')
})
```

- [ ] **Step 2: 改成三列两行语气布局**

用下面实现替换 `TonePicker` 的返回内容：

```tsx
return (
  <div className="grid grid-cols-3 gap-2" role="group" aria-label="选择语气">
    {TONES.map((tone) => (
      <button
        key={tone.id}
        type="button"
        aria-pressed={selected === tone.id}
        onClick={() => onSelect(tone.id)}
        className={`min-h-11 rounded-full px-3 py-2 text-sm ${
          selected === tone.id
            ? 'bg-[#1f2937] text-white'
            : 'bg-white text-[#1f2937] shadow-sm'
        }`}
      >
        {tone.label}
      </button>
    ))}
  </div>
)
```

- [ ] **Step 3: 为自定义处境标准化和本地兜底写失败测试**

创建 `custom-scene.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { buildCustomPhrases, normalizeSituation } from './custom-scene'

describe('normalizeSituation', () => {
  it('trim 并限制 40 个 code point', () => {
    expect(normalizeSituation(`  ${'事'.repeat(70)}  `)).toBe('事'.repeat(40))
  })
  it('空输入返回空串', () => expect(normalizeSituation('   ')).toBe(''))
})

describe('buildCustomPhrases', () => {
  it('每种语气生成 3 条，保留称呼变量并写入具体处境', () => {
    const phrases = buildCustomPhrases('weiwan', '同事让我替他背锅')
    expect(phrases).toHaveLength(3)
    expect(phrases.every((phrase) => phrase.scene === 'custom')).toBe(true)
    expect(phrases.every((phrase) => phrase.tone === 'weiwan')).toBe(true)
    expect(phrases.some((phrase) => phrase.text.includes('同事让我替他背锅'))).toBe(true)
    expect(phrases.some((phrase) => phrase.text.includes('{对方称呼}'))).toBe(true)
  })

  it('五种语气各有且只有 3 条本地兜底', () => {
    for (const tone of ['weiwan', 'yinggang', 'fafeng', 'wenyan', 'heihua']) {
      expect(buildCustomPhrases(tone, '临时安排')).toHaveLength(3)
    }
  })
})
```

- [ ] **Step 4: 写完五种语气的 15 条本地兜底模板**

创建 `custom-phrases.ts`。模板必须是精修成品，不得写占位说明：

```ts
export const CUSTOM_PHRASES: Readonly<Record<string, readonly string[]>> = {
  weiwan: [
    '{对方称呼}，关于“{具体处境}”这件事，我这次确实不方便答应，希望你理解。',
    '谢谢你想到我，不过“{具体处境}”我接不下来，还是请你另找合适的人吧。',
    '这件事我认真想过了，还是只能拒绝，不想先答应再耽误你。',
  ],
  yinggang: [
    '“{具体处境}”这件事我不做，请别再替我安排。',
    '不行，这件事超出我的边界了，我的答案就是不。',
    '这次帮不了，也不打算勉强自己答应。',
  ],
  fafeng: [
    '我刚把“{具体处境}”拿给我的精神状态看了一眼，它当场申请了离职。',
    '这事不是我不想答应，是我的灵魂听完已经开始装死了。',
    '收到，但我的能力、时间和良心刚刚一致投了反对票。',
  ],
  wenyan: [
    '“{具体处境}”一事，力所不逮，恕难从命。',
    '承蒙相托，然此事非吾所能应，望另请高明。',
    '此请虽厚，吾意已决，不敢勉强应承。',
  ],
  heihua: [
    '“{具体处境}”这个需求与我当前排期冲突，暂时无法承接。',
    '这件事不在我的职责和资源范围内，建议重新匹配负责人。',
    '我评估过投入产出比，这个需求先不进入执行阶段。',
  ],
}
```

创建 `custom-scene.ts`：

```ts
import type { Phrase } from '@viral/shared'
import { CUSTOM_PHRASES } from '../configs/custom-phrases'
import type { Scene } from '../configs/scenes'

export const CUSTOM_SCENE: Scene = {
  id: 'custom',
  label: '自定义场景',
  icon: '✍️',
  color: '#475569',
  span: 1,
}

export function normalizeSituation(raw: string): string {
  return [...raw.trim()].slice(0, 40).join('')
}

export function buildCustomPhrases(toneId: string, rawSituation: string): Phrase[] {
  const situation = normalizeSituation(rawSituation)
  if (!situation) return []
  const templates = CUSTOM_PHRASES[toneId] ?? []
  return templates.map((template) => ({
    scene: CUSTOM_SCENE.id,
    tone: toneId,
    text: template.split('{具体处境}').join(situation),
  }))
}
```

- [ ] **Step 5: 创建站内自定义场景表单**

`CustomSceneForm` 接口固定为：

```tsx
interface Props {
  initialValue?: string
  onSubmit: (situation: string) => void
}
```

实现完整内容：

```tsx
import { useState } from 'react'
import { normalizeSituation } from '../lib/custom-scene'

export function CustomSceneForm({ initialValue = '', onSubmit }: Props) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState(false)

  const submit = () => {
    const normalized = normalizeSituation(value)
    if (!normalized) {
      setError(true)
      return
    }
    setError(false)
    onSubmit(normalized)
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <label className="flex flex-col gap-2 text-sm font-medium">
        描述你想拒绝的具体事情
        <textarea
          value={value}
          maxLength={40}
          rows={3}
          onChange={(event) => setValue(event.target.value)}
          placeholder="例如：同事让我替他背锅"
          className="resize-none rounded-xl border border-[#d1d5db] px-3 py-2 font-normal"
        />
      </label>
      <div className="mt-2 flex items-center justify-between text-xs text-[#606774]">
        <span>{error ? '先写清楚你想拒绝什么' : '内容只在本地处理'}</span>
        <span>{[...value].length}/40</span>
      </div>
      <button
        type="button"
        onClick={submit}
        className="mt-3 min-h-11 w-full rounded-xl bg-[#475569] px-4 py-2 font-medium text-white"
      >
        继续选语气
      </button>
    </section>
  )
}
```

组件测试必须覆盖空输入报错、40 字限制和有效提交。

- [ ] **Step 6: 把第九格从 mailto 改成按钮**

`SceneGrid` Props 增加：

```ts
onCustomSelect: () => void
```

删除 `WISH_MAILTO` 和 `<a>`，换成：

```tsx
<button
  type="button"
  aria-pressed={selected === 'custom'}
  onClick={onCustomSelect}
  className="flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#9ca3af] p-4 text-center text-xs text-[#606774]"
>
  没有你的场景？
  <span className="mt-1 font-medium">自己输入</span>
</button>
```

更新 `scene-grid.test.tsx`：第九格必须是 button，不再存在 `mailto:` link；点击后调用 `onCustomSelect`。

- [ ] **Step 7: 在 App 中接通自定义场景本地流程**

增加状态：

```ts
const [customDraftOpen, setCustomDraftOpen] = useState(false)
const [customSituation, setCustomSituation] = useState('')
```

行为固定为：

1. 点击预设场景：关闭自定义表单，清空自定义处境，保持现有预设逻辑。
2. 点击第九格：`sceneId='custom'`、`toneId=null`、打开表单；调用 `track('custom_scene_opened', { mode: 'local' })`，不得带文本。
3. 提交处境：保存标准化后的文本、关闭表单、显示五个语气；调用 `track('custom_scene_submitted', { mode: 'local' })`，不得带文本。
4. 选语气：调用 `buildCustomPhrases(tone.id, customSituation)`，然后复用 `PhraseList`、复制和保存卡片。
5. 自定义场景的 `SaveQuoteButton` 使用 `CUSTOM_SCENE` 的 label/color；不把处境写入埋点。

`App` 的 scene/phrases 推导使用：

```ts
const scene = sceneId === CUSTOM_SCENE.id
  ? CUSTOM_SCENE
  : SCENES.find((item) => item.id === sceneId) ?? null

const phrases = scene && tone
  ? scene.id === CUSTOM_SCENE.id
    ? buildCustomPhrases(tone.id, customSituation)
    : PHRASES.filter((phrase) => phrase.scene === scene.id && phrase.tone === tone.id)
  : []
```

更新页脚为：

```tsx
<footer className="pt-10 text-center text-xs text-[#606774]">
  话术仅供参考，分寸请自行把握 · 所有内容本地处理，不上传任何数据
</footer>
```

- [ ] **Step 8: 增加 App 全流程测试**

在 `app.test.tsx` 增加：

```tsx
it('自定义场景：站内输入 → 选语气 → 得到 3 条本地话术', async () => {
  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: /自己输入/ }))
  await userEvent.type(
    screen.getByLabelText('描述你想拒绝的具体事情'),
    '同事让我替他背锅',
  )
  await userEvent.click(screen.getByRole('button', { name: '继续选语气' }))
  await userEvent.click(screen.getByRole('button', { name: '委婉体面' }))

  expect(screen.getAllByRole('button', { name: '复制' })).toHaveLength(3)
  expect(screen.getByText(/同事让我替他背锅/)).toBeInTheDocument()
  expect(umamiSpy).toHaveBeenCalledWith('custom_scene_opened', { mode: 'local' })
  expect(umamiSpy).toHaveBeenCalledWith('custom_scene_submitted', { mode: 'local' })
  expect(JSON.stringify(umamiSpy.mock.calls)).not.toContain('同事让我替他背锅')
})
```

- [ ] **Step 9: 运行当前包验证**

Run:

```bash
pnpm --filter @viral/refusal-generator test
pnpm --filter @viral/refusal-generator typecheck
pnpm --filter @viral/refusal-generator build
git diff --check
```

Expected: 全部通过；`phrases.lint.test.ts` 仍只验证原来的 8×5 预设矩阵，自定义兜底单独由 `custom-scene.test.ts` 验证。

- [ ] **Step 10: 提交 Task 3**

```bash
git add sites/refusal-generator/src/configs/custom-phrases.ts \
  sites/refusal-generator/src/lib/custom-scene.ts \
  sites/refusal-generator/src/lib/custom-scene.test.ts \
  sites/refusal-generator/src/components/custom-scene-form.tsx \
  sites/refusal-generator/src/components/custom-scene-form.test.tsx \
  sites/refusal-generator/src/components/scene-grid.tsx \
  sites/refusal-generator/src/components/scene-grid.test.tsx \
  sites/refusal-generator/src/components/tone-picker.tsx \
  sites/refusal-generator/src/components/tone-picker.test.tsx \
  sites/refusal-generator/src/app.tsx \
  sites/refusal-generator/src/app.test.tsx
git diff --cached --name-only
git commit -m "feat(refusal-generator): add in-page custom scenarios"
```

---

## Task 4: 收紧拒绝话术分享卡，删除无意义色块

**Files:**

- Modify: `sites/refusal-generator/src/card/draw-quote-card.ts`
- Modify: `sites/refusal-generator/src/card/draw-quote-card.test.ts`
- Modify: `sites/refusal-generator/src/app.tsx`

- [ ] **Step 1: 写失败测试，禁止无含义色块条**

把标准皮测试改为：

```ts
it('标准皮只画背景、正文卡和场景色条，不画九格调色板', () => {
  const ctx = fakeCtx()
  makeQuoteCardDraw(base)(ctx, SIZE)
  const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls
  expect(calls.length).toBeLessThan(10)
})

it('短正文也垂直落在卡片视觉中心区域', () => {
  const ctx = fakeCtx()
  makeQuoteCardDraw({ ...base, text: '不借。' })(ctx, SIZE)
  const bodyCall = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    .find(([text]) => text === '不借。')
  expect(bodyCall?.[2]).toBeGreaterThanOrEqual(620)
  expect(bodyCall?.[2]).toBeLessThanOrEqual(900)
})
```

- [ ] **Step 2: 简化 QuoteCardData**

从 `QuoteCardData` 删除：

```ts
sceneIndex: number
allSceneColors: readonly string[]
```

同步删除 `app.tsx` 中传给 `SaveQuoteButton` 的 `sceneIndex`、`allSceneColors`，并从 `draw-quote-card.test.ts` 的 `base` fixture 删除这两项。

- [ ] **Step 3: 用纯品牌条替换颜色样本**

删除旧 `drawBrandStrip` 的色块循环，改为：

```ts
function drawBrand(
  ctx: CanvasRenderingContext2D,
  size: CardSize,
  textColor: string,
) {
  ctx.globalAlpha = 1
  ctx.fillStyle = textColor
  ctx.font = `400 30px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 70)
}
```

标准皮正文使用动态起点：

```ts
const lines = wrapByLength(data.text, 13)
const lineHeight = 88
const bodyCenterY = 760
const firstBaseline = bodyCenterY - ((lines.length - 1) * lineHeight) / 2
lines.forEach((line, index) => {
  ctx.fillText(line, 150, firstBaseline + index * lineHeight)
})
```

标准皮、文言文皮、发疯文学皮都调用 `drawBrand`。不要改变三套皮肤的核心视觉。

- [ ] **Step 4: 运行当前包验证并提交**

Run:

```bash
pnpm --filter @viral/refusal-generator test
pnpm --filter @viral/refusal-generator typecheck
pnpm --filter @viral/refusal-generator build
git diff --check
```

Commit:

```bash
git add sites/refusal-generator/src/card/draw-quote-card.ts \
  sites/refusal-generator/src/card/draw-quote-card.test.ts \
  sites/refusal-generator/src/app.tsx
git commit -m "fix(refusal-generator): focus exported quote cards"
```

---

## Task 5: 为赛博求签补齐键盘求签路径

**Files:**

- Modify: `sites/cyber-fortune/src/components/draw-screen.tsx`
- Modify: `sites/cyber-fortune/src/components/draw-screen.test.tsx`

- [ ] **Step 1: 写 Enter 和 Space 的失败测试**

在 `draw-screen.test.tsx` 增加：

```tsx
it.each(['Enter', ' '])('键盘 %s 可以完成求签', (key) => {
  const onDraw = vi.fn()
  render(<DrawScreen onDraw={onDraw} />)
  fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '阿福' } })
  const tube = screen.getByRole('button', { name: '签筒' })

  fireEvent.keyDown(tube, { key })
  expect(tube).toHaveAttribute('data-phase', 'charging')
  fireEvent.keyUp(tube, { key })
  expect(tube).toHaveAttribute('data-phase', 'falling')

  act(() => vi.advanceTimersByTime(1500))
  expect(onDraw).toHaveBeenCalledExactlyOnceWith('阿福')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm --filter @viral/cyber-fortune test -- src/components/draw-screen.test.tsx
```

Expected: FAIL，键盘事件不会改变 phase。

- [ ] **Step 3: 增加键盘和 pointer cancel 处理**

在组件中增加：

```ts
const isActivationKey = (key: string) => key === 'Enter' || key === ' '

const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
  if (!isActivationKey(event.key) || event.repeat) return
  event.preventDefault()
  startCharge()
}

const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
  if (!isActivationKey(event.key)) return
  event.preventDefault()
  release()
}
```

同时把文件首行 React import 改为：

```ts
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
```

签筒按钮增加：

```tsx
onPointerCancel={release}
onKeyDown={handleKeyDown}
onKeyUp={handleKeyUp}
aria-describedby="fortune-draw-hint"
```

把重复文案收紧为：

```tsx
<p className="text-center text-sm" style={{ color: 'var(--cf-ink-faded)' }}>
  打工人电子黄历。同名同天，签必相同。
</p>
```

签筒下面保留唯一操作说明：

```tsx
<p id="fortune-draw-hint" className="text-xs" style={{ color: 'var(--cf-ink-faded)' }}>
  长按签筒蓄力；也可用 Enter 或空格键求签
</p>
```

- [ ] **Step 4: 验证并提交**

Run:

```bash
pnpm --filter @viral/cyber-fortune test
pnpm --filter @viral/cyber-fortune typecheck
pnpm --filter @viral/cyber-fortune build
git diff --check
```

Commit:

```bash
git add sites/cyber-fortune/src/components/draw-screen.tsx \
  sites/cyber-fortune/src/components/draw-screen.test.tsx
git commit -m "fix(cyber-fortune): support keyboard drawing"
```

---

## Task 6: 提高辅助文字对比度，不改变品牌配色

**Files:** See Task 6 file map above.

- [ ] **Step 1: 机械替换文本颜色**

只改文字，不改人生格子 `GRID_COLORS.past`、边框或背景：

```text
tacit-test:
  文本 #9b948a → #6f6a62
  背景 #fdfbf4 上对比度约 5.18:1

life-grid:
  文本 #8c8678 / #a29b8a → #6d675b
  背景 #f7f4ec 上对比度约 5.11:1
  保留 GRID_COLORS.past = #8c8678

refusal-generator:
  页面辅助文字 #6b7280 / #9ca3af → #606774
  背景 #f2f3f5 上对比度约 5.13:1
  保留 #9ca3af 作为非文本虚线边框

cyber-fortune:
  不修改；#6f6353 在 #f4e8cd 上已达到 4.5:1 以上
```

- [ ] **Step 2: 用固定脚本复核对比度**

Run:

```bash
node - <<'NODE'
function luminance(hex) {
  const rgb = hex.match(/\w\w/g).map((value) => parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}
function ratio(foreground, background) {
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
for (const [foreground, background] of [
  ['6f6a62', 'fdfbf4'],
  ['6d675b', 'f7f4ec'],
  ['606774', 'f2f3f5'],
  ['6f6353', 'f4e8cd'],
]) {
  const value = ratio(foreground, background)
  if (value < 4.5) throw new Error(`${foreground}/${background}: ${value}`)
  console.log(`${foreground}/${background}: ${value.toFixed(2)}:1`)
}
NODE
```

Expected: 四组全部 ≥ `4.5:1`。

- [ ] **Step 3: 跑四站回归并提交**

Run:

```bash
pnpm --filter @viral/life-grid test
pnpm --filter @viral/tacit-test test
pnpm --filter @viral/refusal-generator test
pnpm --filter @viral/cyber-fortune test
pnpm --filter @viral/life-grid typecheck
pnpm --filter @viral/tacit-test typecheck
pnpm --filter @viral/refusal-generator typecheck
pnpm --filter @viral/cyber-fortune typecheck
git diff --check
```

Commit only the Task 6 files:

```bash
git add sites/tacit-test/src/app.tsx \
  sites/tacit-test/src/components/home-screen.tsx \
  sites/tacit-test/src/components/nickname-screen.tsx \
  sites/tacit-test/src/components/invite-screen.tsx \
  sites/tacit-test/src/components/compare-screen.tsx \
  sites/tacit-test/src/components/copy-link-button.tsx \
  sites/tacit-test/src/components/save-card-button.tsx \
  sites/tacit-test/src/components/long-press-overlay.tsx \
  sites/life-grid/src/app.tsx \
  sites/life-grid/src/components/input-screen.tsx \
  sites/life-grid/src/components/result-screen.tsx \
  sites/life-grid/src/components/save-card-button.tsx \
  sites/life-grid/src/components/long-press-overlay.tsx \
  sites/refusal-generator/src/app.tsx \
  sites/refusal-generator/src/components/scene-grid.tsx \
  sites/refusal-generator/src/components/phrase-list.tsx \
  sites/refusal-generator/src/components/long-press-overlay.tsx
git diff --cached --name-only
git commit -m "fix(ui): improve secondary text contrast"
```

在执行 `git add` 后必须检查暂存清单；若包含本 Task 以外文件，先用 `git restore --staged <path>` 取消错误暂存，禁止提交混合改动。

---

## Task 7: AI v2 触发方案（默认不执行）

本 Task 只在以下条件全部满足时执行：

1. `docs/11-refusal-generator.md` 规定的 v1 复制率 `copy / visit > 15%` 已有真实七日数据支持。
2. 用户明确授权产生 LLM 接口成本。
3. 03 AI 判官的 Workers 管线已经实现，具备输入/输出过滤、按 IP 限流、缓存、预算计数和每日熔断。
4. 用户已经选择模型供应商，并准备通过 `wrangler secret put` 写入密钥。

条件不满足时，外部模型必须在报告中写：`Task 7 跳过：AI v2 触发条件未满足`，不能把 Key 写进 `VITE_*`、`.env` 或前端代码。

触发后的架构固定为：

```text
CustomSceneForm
  → POST /api/refusal/generate
  → Cloudflare Worker：schema 校验、60 字截断、敏感词过滤
  → IP + 日期限流（默认 3 次/日）
  → 标准化输入 hash 缓存
  → 每日预算检查（默认 ¥50/日，80% 告警）
  → LLM 输出 { phrases: [string, string, string] }
  → 输出 schema + 内容过滤
  → 前端 PhraseList
  → 任何失败都回退 Task 3 的 3 条本地模板
```

AI 接口契约：

```ts
interface RefusalGenerateRequest {
  situation: string // 1..60 个 code point
  tone: 'weiwan' | 'yinggang' | 'fafeng' | 'wenyan' | 'heihua'
}

interface RefusalGenerateResponse {
  phrases: [string, string, string] // 每条 1..80 个 code point
  source: 'ai' | 'fallback'
}
```

Workers secrets/bindings：

```text
LLM_API_KEY       secret，只能由 wrangler secret put 写入
LLM_API_BASE_URL  secret 或 Worker var
LLM_MODEL         Worker var
RATE_LIMIT_SALT   secret
AI_GUARD_KV       KV binding，用于限流、缓存和预算计数
```

前端只允许埋点：`custom_ai_requested`、`custom_ai_succeeded`、`custom_ai_fallback`、`custom_ai_rate_limited`；payload 只能包含 `tone`，不得包含 `situation` 或返回正文。

不要在本修复计划中自行实现一套不带限流和预算熔断的简化 Worker。

---

## Task 8: 四站视觉与导出卡最终验收

**Files:** None unless a preceding Task fails acceptance; fixes must return to the owning Task and rerun its tests.

- [ ] **Step 1: 运行完整自动化验证**

Run:

```bash
pnpm --filter @viral/life-grid test
pnpm --filter @viral/tacit-test test
pnpm --filter @viral/refusal-generator test
pnpm --filter @viral/cyber-fortune test
pnpm --filter @viral/life-grid typecheck
pnpm --filter @viral/tacit-test typecheck
pnpm --filter @viral/refusal-generator typecheck
pnpm --filter @viral/cyber-fortune typecheck
pnpm --filter @viral/life-grid build
pnpm --filter @viral/tacit-test build
pnpm --filter @viral/refusal-generator build
pnpm --filter @viral/cyber-fortune build
git diff --check
```

Expected: 全部通过。

- [ ] **Step 2: 启动四站本地预览**

分别在独立终端运行：

```bash
pnpm --filter @viral/life-grid exec vite --host 127.0.0.1 --port 4170
pnpm --filter @viral/tacit-test exec vite --host 127.0.0.1 --port 4171
pnpm --filter @viral/refusal-generator exec vite --host 127.0.0.1 --port 4173
pnpm --filter @viral/cyber-fortune exec vite --host 127.0.0.1 --port 4174
```

- [ ] **Step 3: `390×844` 移动端验收**

必须逐项确认：

```text
life-grid
- 输入生日后，百分比和两条关键结论出现在格子图之前。
- 格子图无横向溢出。
- 保存卡显示百分比、格子和至少两条关键结论。

tacit-test
- 选好友版 → 昵称 → 10 题 → 邀请页全流程正常。
- “保存可扫码挑战卡”生成二维码。
- 使用另一设备或二维码识别工具打开后，URL 与“复制挑战链接”完全一致。

refusal-generator
- 五个语气在 390px 下全部可见，无横向滚动条。
- 第九格在站内展开输入框，不打开邮件客户端。
- 自定义处境生成 3 条话术；复制、保存卡片正常。
- 保存卡无无意义调色板，短正文不挤在顶部。

cyber-fortune
- 鼠标/触摸长按仍可求签。
- Tab 聚焦签筒后，Enter 和 Space 都能求签。
- 页面只出现一条操作说明。
```

- [ ] **Step 4: `1280×900` 桌面回归**

确认四站仍为居中移动栏，无页面级横向滚动，无按钮或卡片被裁切。不要为了填满桌面空白增加装饰模块。

- [ ] **Step 5: 分享卡像素验收**

下载四张最新卡片并检查原始尺寸：

```text
my-life-grid.png      1080×1440，百分比和关键文案完整可见
tacit-invite.png      1080×1440，二维码完整、四周有 quiet zone
refusal-quote.png     1080×1440，正文视觉居中、无调色板
cyber-fortune.png     1080×1440，无回归
```

真实 iPhone 微信、安卓微信、iOS Safari 无法由模型完成时，明确标记为【待用户真机验收】，不得伪造通过。

- [ ] **Step 6: 输出执行报告**

报告必须包含：

```text
- 完成的 Task 与 commit hash
- 每个 Task 修改文件
- 四站 test/typecheck/build 命令与结果
- 四张导出卡路径与尺寸
- 390×844、1280×900 验收结果
- Task 7 是否跳过及原因
- 未执行的真机、Cloudflare、secret、部署步骤
- 当前 git status --short
```

---

## Definition of Done

- `life-grid` 关键数字先于格子出现，分享卡不再把百分比和文案绘制到画布外。
- `tacit-test` 分享卡单独传播时，可以通过二维码进入当前挑战。
- `refusal-generator` 五个语气无需横向滑动即可发现；自定义场景不离开站点；分享卡删除无含义色块。
- `cyber-fortune` 鼠标、触摸、Enter、Space 都可以完成求签，且不会双触发。
- 三个需要修改的站点小字号辅助文字对比度均达到 `4.5:1`。
- 四站 test、typecheck、build 全部通过，四张分享卡均为 `1080×1440`。
- AI v2 未满足门槛时保持关闭；仓库和前端没有任何 Key。
