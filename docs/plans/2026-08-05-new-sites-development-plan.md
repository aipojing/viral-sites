# 五个新站点开发总计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan project-by-project. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `viral-sites` monorepo 中依次新增 `tacit-test`、`mental-state`、`refusal-generator`、`cyber-fortune`、`internet-age` 五个可独立测试、构建和部署的网站，并沉淀 quiz、phrase、seeded 三组共享能力。

**Architecture:** 每个新项目都是 `sites/*` 下的独立 Vite React 应用，只允许依赖 `@viral/shared`。可跨站复用的计分、模板和确定性随机能力进入 `packages/shared`；题库、话术、签文、页面状态和视觉实现留在各自站点。项目按 `06 → 02 → 11 → 08 → 12` 顺序开发，其中只有 `12` 对 `02` 存在硬代码依赖。

**Tech Stack:** pnpm workspace · Vite · React 19 · TypeScript(strict) · Tailwind v4 · Vitest + Testing Library(jsdom) · zod · Cloudflare Pages · Umami

## Global Constraints

- 本计划只包含五个**新项目**；已经上线的 `01 life-grid` 不在开发范围内。
- 每个项目必须形成独立站点目录、package、测试配置、页面入口、分享卡片、埋点和部署配置。
- 站点之间禁止互相 import；共享代码只能经 `@viral/shared` 暴露。
- 每个可观察行为先写失败测试，再实现最小代码；完整逐步代码见各项目链接的详细实现计划。
- 每完成一个项目，运行该站点 test、typecheck、build，并运行所有受影响 shared 测试。
- 分享卡片统一使用 `renderCard` / `saveCard`，尺寸 1080×1440；移动端长按层只代表保存意向。
- 所有新站沿用 `sites/life-grid/public/u.js` 和 `_worker.js` 的 Umami 同源代理方案。
- 埋点不得包含昵称、答案、称呼、签文结果或其他用户输入。
- 首屏资源 gzip `< 100KB`；不引入 UI 组件库、日期库或动画库。
- 部署前走 iPhone 微信、安卓微信、iOS Safari、桌面 Chrome 四环境核心流程。
- 每个 Task 通过测试后独立提交，提交信息使用 conventional commits。

---

## 项目总览

| 顺序 | 新项目 | 新目录 | 共享能力变化 | 详细实现计划 |
|---|---|---|---|---|
| 1 | 06 默契度测试 | `sites/tacit-test` | 无 | [06 详细计划](2026-08-04-tacit-test.md) |
| 2 | 02 精神状态检测 | `sites/mental-state` | 新增 `shared/quiz` v1 | [02 详细计划](2026-08-04-mental-state.md) |
| 3 | 11 拒绝话术生成器 | `sites/refusal-generator` | 新增 `shared/phrase` | [11 详细计划](2026-08-04-refusal-generator.md) |
| 4 | 08 赛博求签 | `sites/cyber-fortune` | 新增 `shared/seeded` | [08 详细计划](2026-08-04-cyber-fortune.md) |
| 5 | 12 网感年龄测试 | `sites/internet-age` | `shared/quiz` 升级 v2 | [12 详细计划](2026-08-04-internet-age.md) |

---

## Project 1：06 默契度测试

**最终交付：** 用户选择好友版或情侣版，填写昵称并回答 10 题，生成挑战链接；另一位用户打开链接回答同一组问题，得到逐题对比和默契度报告；发起方与应战方分别有可保存卡片。

**页面：**

1. 首页：选择好友版 / 情侣版。
2. 昵称页：输入发起方或应战方昵称。
3. 答题页：10 题逐题作答。
4. 发起结果页：挑战链接、复制按钮、发起卡。
5. 应战引导页：显示谁发来的挑战。
6. 对比结果页：默契度、称号、逐题明细、对比卡。

**文件范围：**

```text
sites/tacit-test/
  src/lib/questions.ts
  src/lib/challenge-codec.ts
  src/lib/scoring.ts
  src/lib/style-remark.ts
  src/lib/copy-link.ts
  src/card/doodle.ts
  src/card/draw-invite-card.ts
  src/card/draw-compare-card.ts
  src/components/home-screen.tsx
  src/components/nickname-screen.tsx
  src/components/quiz-screen.tsx
  src/components/invite-screen.tsx
  src/components/compare-screen.tsx
  src/components/copy-link-button.tsx
  src/components/save-card-button.tsx
  src/app.tsx
```

### Task 1.1：创建站点和两套题库

- [ ] 创建 Vite/React/TypeScript/Tailwind/Vitest 配置和测试桩。
- [ ] 完成好友版、情侣版各 10 题，每题固定 4 个选项。
- [ ] 为题库 id、题数、选项数和唯一性写构建期测试。

### Task 1.2：实现挑战数据与链接

- [ ] 定义 `ChallengeData { v, q, n, a }`，实现 UTF-8 base64url 编解码。
- [ ] 严格校验版本、题库、昵称长度、答案数量和答案范围。
- [ ] 按产品规格生成 `/c?d=<payload>`，Umami 配置排除查询参数。
- [ ] 页面隐私说明写明“答案随挑战链接传递，请只发给你信任的人”，不宣称服务器不可见。

### Task 1.3：实现计分和结果模型

- [ ] 实现相同答案数 × 10 的默契度和五档称号。
- [ ] 生成逐题一致/不一致明细以及低分不伤人的结果文案。
- [ ] 实现发起方单人答题风格锐评，保证挑战无人回应时仍有结果。

### Task 1.4：实现完整双人流程

- [ ] 完成首页、昵称、答题、发起结果、应战引导和对比结果组件。
- [ ] 实现 Clipboard API 与 `execCommand` 双路径复制。
- [ ] 处理非法、缺失和过期链接，统一回到首页并显示明确提示。

### Task 1.5：实现两张分享卡与埋点

- [ ] 实现挑战发起卡和默契对比卡。
- [ ] 接入 `generate`、`challenge_opened`、`challenge_completed`、`q_answered`、`save_image`。
- [ ] 事件只携带 quiz、mode、题号和分数，不携带昵称或答案。

### Task 1.6：测试、构建和部署准备

- [ ] 运行 `pnpm --filter @viral/tacit-test test`。
- [ ] 运行 `pnpm --filter @viral/tacit-test typecheck`。
- [ ] 运行 `pnpm --filter @viral/tacit-test build` 并确认 gzip 预算。
- [ ] 完成双设备挑战全流程和四环境保存卡片验收。

---

## Project 2：02 精神状态检测

**最终交付：** 新增通用测试引擎 v1，并上线首个“班味浓度检测”主题：8 道题、线性计分、五档报告和分享卡。后续新增线性测试时只需添加配置与站点视觉，不重写计分。

**页面：** 落地页、逐题答题页、检测报告页。

**共享能力：**

```text
packages/shared/src/quiz/schema.ts
packages/shared/src/quiz/scoring.ts
packages/shared/src/share-card/text.ts
```

**站点文件：**

```text
sites/mental-state/src/config/ban-wei.ts
sites/mental-state/src/config/registry.ts
sites/mental-state/src/components/landing-screen.tsx
sites/mental-state/src/components/quiz-screen.tsx
sites/mental-state/src/components/report-screen.tsx
sites/mental-state/src/components/save-card-button.tsx
sites/mental-state/src/card/draw-report-card.ts
sites/mental-state/src/app.tsx
```

### Task 2.1：实现 shared 测试 schema

- [ ] 安装 zod，定义 meta、question、option、linear scoring 和 result band。
- [ ] 实现 `parseTestConfig(raw)`，无效配置必须抛出具体错误。
- [ ] 导出公共类型和合法配置 fixture，作为 Project 5 回归基线。

### Task 2.2：实现线性计分

- [ ] 实现答案校验、总分、档位查找和档内百分比线性映射。
- [ ] 覆盖全最低分、全最高分、空答案、非法选项和全部档位边界。

### Task 2.3：完成班味题库

- [ ] 写完 8 题、全部选项、5 个结果档位、每档 3 条锐评和 1 条解药文案。
- [ ] 通过 `registry.ts` 支持 `?t=ban-wei`，未知 slug 回退默认主题。
- [ ] 测试题数、选项、分数区间和档位连续性。

### Task 2.4：实现三屏流程

- [ ] 完成落地、逐题作答、报告三屏状态机。
- [ ] 每题选择后进入下一题，显示进度，结束时生成报告。
- [ ] 接入 `q_answered` 和 `generate`，事件不含答案内容。

### Task 2.5：实现检测报告卡

- [ ] 绘制称号、浓度数字、3 条锐评、解药和检测报告印章。
- [ ] 接入桌面下载与移动端长按保存。
- [ ] 对长文案、最大百分比和五档视觉做 canvas smoke test。

### Task 2.6：测试、构建和部署准备

- [ ] 运行 `pnpm --filter @viral/shared test && pnpm --filter @viral/shared typecheck`。
- [ ] 运行 `pnpm --filter @viral/mental-state test`。
- [ ] 运行 `pnpm --filter @viral/mental-state typecheck`。
- [ ] 运行 `pnpm --filter @viral/mental-state build` 并完成四环境验收。

---

## Project 3：11 拒绝话术生成器

**最终交付：** 用户选择场景和语气，获得三条可复制话术，可换一批、填写对方称呼并保存语录卡；v1 全部由本地模板生成，不接 LLM。

**页面：** 场景九宫格、语气选择、话术列表；保持单页连续操作。

**共享能力：**

```text
packages/shared/src/phrase/template.ts
packages/shared/src/phrase/schema.ts
packages/shared/src/phrase/lint.ts
```

**站点核心文件：**

```text
sites/refusal-generator/src/configs/scenes.ts
sites/refusal-generator/src/configs/tones.ts
sites/refusal-generator/src/configs/phrases.ts
sites/refusal-generator/src/lib/copy-text.ts
sites/refusal-generator/src/lib/pick-batch.ts
sites/refusal-generator/src/components/scene-grid.tsx
sites/refusal-generator/src/components/tone-picker.tsx
sites/refusal-generator/src/components/phrase-list.tsx
sites/refusal-generator/src/card/draw-quote-card.ts
sites/refusal-generator/src/app.tsx
```

### Task 3.1：实现 phrase 共享模块

- [ ] 实现 `{对方称呼}` 变量替换、空值默认、Unicode 截断和特殊字符处理。
- [ ] 定义场景、语气、模板 schema，并实现矩阵完整性 lint。
- [ ] 将 phrase API 从 `packages/shared/src/index.ts` 导出。

### Task 3.2：完成 120 条话术资产

- [ ] 完成 8 场景、5 语气、每组 3 条的 40 组矩阵。
- [ ] 构建期检查缺组、重复 id、超长文案和非法占位符。
- [ ] build 命令先执行内容 lint，失败时禁止产出站点。

### Task 3.3：实现选择和换批流程

- [ ] 完成九宫格场景、语气胶囊和三条候选列表。
- [ ] 实现确定性批次轮换，避免连续两批重复。
- [ ] 称呼变化时只重新渲染模板，不改变当前批次。

### Task 3.4：实现复制与分享卡

- [ ] 实现 Clipboard API 与 `execCommand` 降级，并给出成功/失败反馈。
- [ ] 实现标准、文言文、发疯文学三种卡片绘制分支。
- [ ] 接入 `generate`、`copy`、`scene_selected`、`tone_selected` 和 `save_image`。

### Task 3.5：测试、构建和部署准备

- [ ] 运行 shared phrase 测试和全站组件测试。
- [ ] 运行 `pnpm --filter @viral/refusal-generator typecheck`。
- [ ] 运行 `pnpm --filter @viral/refusal-generator build` 并确认 zod 未进入不需要它的站点运行包。
- [ ] 在微信内置浏览器验证复制降级，完成四环境卡片验收。

---

## Project 4：08 赛博求签

**最终交付：** 用户输入昵称并长按签筒，得到由昵称、UTC+8 日期和内容版本确定的每日签；同人同日结果一致，记录连续求签天数，并可保存黄历卡。

**页面：** 求签页、签文结果页。

**共享能力：**

```text
packages/shared/src/seeded/fnv1a.ts
packages/shared/src/seeded/sequence.ts
```

**站点核心文件：**

```text
sites/cyber-fortune/src/content/pools.ts
sites/cyber-fortune/src/content/blacklist.ts
sites/cyber-fortune/src/lib/pool-lint.ts
sites/cyber-fortune/src/lib/date-utils.ts
sites/cyber-fortune/src/lib/fortune-math.ts
sites/cyber-fortune/src/lib/streak.ts
sites/cyber-fortune/src/lib/storage.ts
sites/cyber-fortune/src/components/draw-screen.tsx
sites/cyber-fortune/src/components/fortune-view.tsx
sites/cyber-fortune/src/card/draw-fortune-card.ts
sites/cyber-fortune/src/app.tsx
```

### Task 4.1：实现确定性随机工具

- [ ] 实现按 UTF-8 字节计算的 FNV-1a 32 位 hash。
- [ ] 实现确定性数字序列、`pickOne` 和不重复 `pickN`。
- [ ] 覆盖同 seed 一致、不同 seed 分叉、不修改传入数组和分布统计测试。

### Task 4.2：完成首发签文库

- [ ] 完成 40 条签诗、30 条宜、30 条忌、20 个贵人/小人和冲突对。
- [ ] 实现长度、重复、宗教词、医疗/投资/婚恋建议和宜忌冲突 lint。
- [ ] 内容库变化必须同步 bump `POOL_VERSION`。

### Task 4.3：实现日期和抽签引擎

- [ ] 用 UTC+8 日期键生成 `昵称|日期|版本` seed。
- [ ] 按固定顺序抽取等级、签诗、宜、忌、贵人和小人。
- [ ] 用统计测试验证 15/30/30/15/10 等级权重。

### Task 4.4：实现 streak 和本地存储

- [ ] 实现连续、断签、当天重复、跨月和跨年规则。
- [ ] localStorage 只保存昵称、最后日期和 streak，不保存整张签。
- [ ] streak ≥7 时显示“虔诚”印章；不做提醒和补签。

### Task 4.5：实现求签交互和黄历卡

- [ ] 完成长按蓄力、松手掉签和 reduced-motion 降级。
- [ ] 完成签文结果页和 1080×1440 黄历卡。
- [ ] 接入 `generate`、`streak_day`、`save_image`，不得上报昵称或签文。

### Task 4.6：测试、构建和部署准备

- [ ] 运行 shared seeded、内容 lint、抽签、streak、组件和卡片测试。
- [ ] 运行 `pnpm --filter @viral/cyber-fortune typecheck`。
- [ ] 运行 `pnpm --filter @viral/cyber-fortune build` 并确认内容 lint 已进入构建门禁。
- [ ] 验证同昵称同日在两台设备得到同一结果，完成四环境验收。

---

## Project 5：12 网感年龄测试

**前置条件：** Project 2 已完成，`packages/shared/src/quiz/` v1 和 `sites/mental-state` 回归测试存在。

**最终交付：** 将 quiz 引擎升级为 linear/tags 双模式，新增网感题库，输出精神网龄、五维成分比例、主成分称号和分享卡；02 不改业务代码且全部回归通过。

**页面：** 落地页、逐题答题页、成分报告页。

**共享能力升级：**

```text
packages/shared/src/quiz/schema.ts
packages/shared/src/quiz/scoring.ts
packages/shared/src/quiz/tags.ts
packages/shared/src/quiz/schema-tags.test.ts
```

**站点核心文件：**

```text
sites/internet-age/src/config/wang-gan.ts
sites/internet-age/src/config/registry.ts
sites/internet-age/src/components/landing-screen.tsx
sites/internet-age/src/components/quiz-screen.tsx
sites/internet-age/src/components/composition-bars.tsx
sites/internet-age/src/components/report-screen.tsx
sites/internet-age/src/card/draw-exam-card.ts
sites/internet-age/src/app.tsx
```

### Task 5.1：升级 quiz schema

- [ ] 将 `TestConfig` 改为 linear/tags 判别联合类型。
- [ ] 增加 tag 维度、年代锚点、题目年代标注和扰动范围字段。
- [ ] 不修改 02 的既有测试；v2 schema 用例写入新测试文件。

### Task 5.2：实现 tags 计分

- [ ] 实现 tag 聚合、零值处理、占比归一、主成分和平手决策。
- [ ] 实现按成分锚点加权的精神网龄和确定性扰动。
- [ ] 给 linear API 加运行时守卫，防止 tags 配置误入线性计算。

### Task 5.3：完成网感题库

- [ ] 完成 8 题、全部选项和五维 tag 权重。
- [ ] 每题填写梗年代标注，构建期检查 tag 拼写、锚点和 note。
- [ ] 完成主成分称号、结果锐评和年龄边界内容。

### Task 5.4：实现三屏与成分报告

- [ ] 完成落地、答题和报告状态机。
- [ ] 实现五条成分比例条、精神网龄和主成分展示。
- [ ] 实现 Y2K 考卷卡，卡片与页面使用同一结果模型。

### Task 5.5：埋点和回归

- [ ] 接入 `q_answered`、`generate` 和 `save_image`。
- [ ] 运行 shared v1/v2 全量测试，确认 02 的 linear 行为不变。
- [ ] 运行 `pnpm --filter @viral/mental-state test && pnpm --filter @viral/mental-state build`。

### Task 5.6：测试、构建和部署准备

- [ ] 运行 `pnpm --filter @viral/internet-age test`。
- [ ] 运行 `pnpm --filter @viral/internet-age typecheck`。
- [ ] 运行 `pnpm --filter @viral/internet-age build`。
- [ ] 完成成分条、长称号、最大精神年龄和四环境保存卡片验收。

---

## 全部项目完成后的仓库结构

```text
packages/shared/src/
  analytics/
  share-card/
  quiz/       # Project 2 建 v1，Project 5 升 v2
  phrase/     # Project 3
  seeded/     # Project 4

sites/
  life-grid/          # 已有，不属于本计划
  tacit-test/         # Project 1
  mental-state/       # Project 2
  refusal-generator/  # Project 3
  cyber-fortune/      # Project 4
  internet-age/       # Project 5
```

## 每个项目的完成定义

- [ ] 计划内页面和核心交互全部可用，没有空按钮或占位页面。
- [ ] 纯函数、组件、内容 lint 和 canvas smoke test 全部通过。
- [ ] 站点 test、typecheck、build 全部通过。
- [ ] 受影响的 `@viral/shared` 测试和所有依赖站回归通过。
- [ ] 首屏 gzip `< 100KB`。
- [ ] 四环境核心流程和保存路径验收通过。
- [ ] Umami website-id 已配置，生产事件可见且不包含用户输入。
- [ ] README 和对应产品设计文档状态已更新。
- [ ] 部署对应唯一 commit，能够回滚到上一个稳定版本。

## Self-Review 记录

- 只列了五个新站点，已排除 01 的运营、收数和修复工作。
- 每个项目都写明了最终页面、文件范围、开发任务、测试命令和完成定义。
- `02 → 12` 的硬依赖以及 shared v1/v2 回归要求已明确。
- 06 保留产品设计确定的 query 链接，同时删除虚假的“服务器不可见”承诺并要求统计排除 search。
- 08 明确采用详细计划已经逐字成文的 40/30/30/20 首发 MVP，不再同时保留两套开发口径。
- 逐步测试代码与提交内容由五份详细计划提供，本总计划不复制第二份容易漂移的代码正文。
