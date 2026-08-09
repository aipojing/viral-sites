# 未落地设计（03、04、13～19）统一主站开发总计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan project-by-project. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 03、04、13～19 号点子实现为“怪好玩”主站内的玩法模块，保持各玩法独立开发测试，同时由 `sites/home` 统一路由、构建和部署。

**Architecture:** `sites/<slug>` 只保存玩法源码、内容、单元测试和可选本地调试入口；`sites/home` 是唯一生产应用，通过 Vite MPA 与 literal dynamic import 输出所有 `/<slug>/` 页面。13「睡眠银行」继续并入 life-grid，14「道歉与请假」继续并入 refusal-generator；03 与 15 的 API 分别进入统一主站 Worker 的 `/api/ai-judge/*` 和 `/api/hold-button/*`，其余玩法纯前端运行。

**Tech Stack:** pnpm workspace · Vite 8 MPA · React 19 · TypeScript(strict) · Tailwind 4 · Vitest 3 + Testing Library · Canvas 2D · Cloudflare Workers Static Assets · Durable Objects/KV（03）· D1（15）· Umami

## Global Constraints

- 产品规格以 `docs/03-ai-judge.md`、`docs/04-salary-timer.md`、`docs/13-*.md`～`docs/19-*.md`、`docs/00-factory-design.md` 与 `docs/00a-style-map.md` 为准。
- 所有项目先遵守 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md)；详细业务实现以本总计划链接的单项目计划为准。
- `sites/*` 之间只允许 `sites/home` 作为生产组合层导入各玩法的 `src/app.tsx` 与 `src/index.css`；玩法之间不得互相 import，共享纯逻辑只进入 `@viral/shared`。
- 13、14 是既有玩法扩展，不增加首页卡带；03、04、15～19 增加主站内新路径，不创建独立域名或独立 Cloudflare 服务。
- 新玩法 package 名保留 `@viral/<slug>`，用于过滤测试和本地开发；package 不得包含生产 `deploy` script。
- 首页项目 `href` 固定为 `/<slug>/`；不得读取 `VITE_*_URL` 跳往外站，不使用 iframe。
- 生产 API 固定使用 `/api/ai-judge/*` 和 `/api/hold-button/*`；只允许 `sites/home/wrangler.jsonc` 声明资源绑定与部署入口。
- 用户输入默认本地处理；03 只有完成明确告知后才把昵称/简介发送给所选模型，15 只提交匿名会话与时长桶。Umami 事件只携带枚举、布尔值、题号、桶和版本。
- 分享卡统一走 `renderCard` / `saveCard`，默认 1080×1440；移动端长按层只代表保存意向。
- 每个玩法懒加载后的首屏 gzip `<100KB`；不引入 UI 组件库、动画库或运行时日期库；字体使用系统字体。
- 可观察行为采用 TDD；内容库必须有构建期 lint；每个项目完成后运行自身 test/typecheck 与 `@viral/home` 的 test/typecheck/build。
- 计划可以提前准备，但执行前必须通过对应产品文档的启动 gate；gate 未通过时只允许内容、数据、原型和技术验证。
- 每个 Task 独立提交，使用 conventional commits；不得批量提交工作区中其他未完成修改。

---

## 项目总览

| 编号 | 主站形态 | 代码范围 | 主站路径/API | 详细计划 |
|---|---|---|---|---|
| 03 AI 赛博判官 | 新玩法 + 统一 Worker API | `sites/ai-judge` + `sites/home` | `/ai-judge/` · `/api/ai-judge/*` | [03 详细计划](2026-08-08-ai-judge.md) |
| 04 上班回本 | 新纯前端玩法 | `sites/salary-timer` + `sites/home` | `/salary-timer/` | [04 详细计划](2026-08-08-salary-timer.md) |
| 13 睡眠银行 | 01 的二期模块 | `sites/life-grid` | `/life-grid/` | [13 详细计划](2026-08-08-sleep-bank.md) |
| 14 道歉与请假 | 11 的文书模式 | `sites/refusal-generator` + `packages/shared` | `/refusal-generator/` | [14 详细计划](2026-08-08-apology-generator.md) |
| 15 按住不放 | 新玩法 + 统一 Worker API | `sites/hold-button` + `sites/home` | `/hold-button/` · `/api/hold-button/*` | [15 详细计划](2026-08-08-hold-button.md) |
| 16 一秒钟世界 | 新纯前端玩法 | `sites/one-second-world` + `sites/home` | `/one-second-world/` | [16 详细计划](2026-08-08-one-second-world.md) |
| 17 亲戚称呼 | 新纯前端玩法 | `sites/kinship-calculator` + `sites/home` | `/kinship-calculator/` | [17 详细计划](2026-08-08-kinship-calculator.md) |
| 18 年度报告 | 新纯前端玩法 | `sites/year-report` + `sites/home` | `/year-report/` | [18 详细计划](2026-08-08-year-report.md) |
| 19 MBTI 日历 | 新纯前端玩法 | `packages/shared` + 08 回归 + `sites/mbti-calendar` + `sites/home` | `/mbti-calendar/` | [19 详细计划](2026-08-08-mbti-calendar.md) |

## 工程依赖关系

```text
统一主站接入契约
├── life-grid ──→ 13（同一玩法内扩展）
├── refusal-generator + shared/phrase ──→ 14（同一玩法内扩展）
├── cyber-fortune ──→ shared/daily ──→ 19
├── 主站 Worker ──→ 03 AI API
└── 主站 Worker ──→ 15 D1 API

04、16、17、18 业务彼此独立，但都在完成时接入同一个 home 构建。
```

## 推荐执行顺序

1. 先完成 [统一主站接入与单服务部署计划](2026-08-08-unified-home-integration.md) 的 Task 1～4，建立路由、Worker 和构建门禁；生产部署仍等待授权。
2. 已通过产品 gate 的纯前端项目可并行开发，但每次只把一个玩法登记进 home 并运行完整主站回归。
3. 03 先做 provider/安全/预算验证，再把 handler 接到主站 Worker；没有冻结模型和成本记录时不创建生产资源。
4. 04 先完成同类复核和工资输入意愿原型；隐私门槛未过时不接入首页正式列表。
5. 已通过宿主数据 gate 时再做 13 或 14；它们修改既有玩法，不创建新路径。
6. 18 在年度窗口前优先完成问题小样本和视觉原型，通过后再接入 `/year-report/`。
7. 19 只有在 08 留存成立、320 条内容和 16 图腾齐备后执行；先抽取 `shared/daily` 并回归 08。
8. 16 没有 12 条 A 级来源不进入页面实现；17 没有 200 条人工样例不进入规则 UI。
9. 15 先跑交互原型和 D1/限流成本验证，最后才向主站 `wrangler.jsonc` 添加真实 HOLD_DB 绑定。

## 每个新玩法的主站接入步骤

- [ ] 创建 `sites/home/<slug>/index.html`，设置唯一 title、description、theme-color。
- [ ] 在 `sites/home/vite.config.ts` 添加 `<slug>` MPA input。
- [ ] 在 `sites/home/src/experience-loaders.ts` 扩展 `ExperienceSlug` 并添加 literal dynamic import，按需加载 App 与 CSS。
- [ ] 在 `sites/home/src/projects.ts` 添加首页元数据，`href` 严格为 `/<slug>/`。
- [ ] 添加 `sites/home/public/previews/<slug>.avif`，必要时添加主舞台 hero 图。
- [ ] 更新 registry parity、同源路径和首页交互测试。
- [ ] 运行模块 test/typecheck，再运行 `@viral/home` test/typecheck/build。
- [ ] 浏览器验证首页进入、路径直达、刷新、返回首页、320px 与 reduced-motion。
- [ ] 只在用户明确授权后通过 `pnpm --filter @viral/home deploy` 发布整个主站。

13、14 不新增以上路由登记，但必须运行 `@viral/home` 构建和宿主路径浏览器回归。

## 每项目统一完成定义

- [ ] 产品文档启动 gate 有可核验记录；内容/数据人工 gate 有责任人与日期。
- [ ] 详细计划全部 Task 完成，没有跳过失败测试或手工验收。
- [ ] `pnpm --filter @viral/<slug> test` 与 `typecheck` 新鲜通过；13、14 使用宿主 package。
- [ ] `pnpm --filter @viral/home test`、`typecheck`、`build` 新鲜通过。
- [ ] `sites/home/dist/<slug>/index.html` 存在；13、14 验证宿主入口仍存在。
- [ ] iPhone 微信、安卓微信、iOS Safari、桌面 Chrome 核心流程通过。
- [ ] Umami 事件名称与无个人数据约束验收通过。
- [ ] 分享卡在 1080×1440 原图、手机相册和九宫格缩略图三种尺寸下可读。
- [ ] 首页卡带、随机选择、全部玩法弹层、站内进入和返回首页全部通过。
- [ ] 后端玩法的统一 Worker 路由、未知 API 404、限流、降级和资源关闭开关通过。
- [ ] 不存在子玩法 deploy script、外部玩法 URL、iframe 或第二个 `wrangler.jsonc`。

## 总体验证

所有已触发并完成的项目合并后运行：

```bash
pnpm test
pnpm typecheck
pnpm --filter @viral/home build
pnpm --filter @viral/home deploy:dry
```

Expected：所有 workspace package 退出码为 0；`sites/home/dist` 包含全部已登记入口；dry-run 只生成一个 Worker bundle 和一个静态资源目录；内容 lint、Worker 测试或主站注册表不一致都会阻止发布。
