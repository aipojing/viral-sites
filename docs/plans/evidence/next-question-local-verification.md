# 下一问 · 本地验证证据

> 2026-08-09 · 仅本地验证；未执行任何生产部署、远程资源变更或 secret 写入。

## 提交链（Task 1～8）

| Task | 提交 | 说明 |
|------|------|------|
| 1 | 21b3f64 | 玩法包脚手架 + 输入验证 |
| 2 | 7fda17f | capability token + SQLite DO 六席状态机 |
| 3 | cae3c3d | 命名空间 API、创建幂等、Workers Rate Limiting |
| 4 | 55a4328 | fragment token vault + API client |
| 5 | 70c21c2 | 六人接力全流程 UI |
| 6 | 1704a9b | 分享、二维码邀请卡、闭环结果卡 |
| 7 | ae43f5c | 主站接入、链条 HTML shell、安全 metadata |
| 8 | （本文件所在提交） | 隐私/并发补测 + 浏览器全链验收 |

## 自动化验证（新鲜运行）

| 命令 | 结果 |
|------|------|
| `pnpm --filter @viral/next-question test` | 14 files / 123 tests 通过 |
| `pnpm --filter @viral/next-question typecheck` | 退出码 0 |
| `pnpm --filter @viral/next-question build` | 退出码 0 |
| `pnpm --filter @viral/home test` | 4 files / 17 tests 通过 |
| `pnpm --filter @viral/home test:worker` | 19 files / 207 tests 通过 |
| `pnpm --filter @viral/home typecheck` | 退出码 0 |
| `pnpm --filter @viral/home build` | 退出码 0，verify-integrated-build：首页 + 8 个玩法入口全部通过 |
| `pnpm --filter @viral/home deploy:dry` | 退出码 0；bindings：NEXT_QUESTION_CHAINS（Durable Object）、NEXT_QUESTION_CREATE_LIMITER（Rate Limit）、PRODUCT_ANALYTICS、ASSETS |
| `pnpm test` / `pnpm typecheck`（全仓库） | 见“已知非阻塞问题” |

## 关键不变量（单测 + workerd 本地实测）

- 六席完整 API 链：创建 → 2～6 席 → owner 收尾；completed 时恰好 6 组问答。
- slot6 后 `returned`、`nextSlot=1`、`nextBatonToken=null`，无第 7 棒。
- 并发抢棒（workerd 真并发 fetch ×6 轮）：每轮恰好一个 200、一个 409 `chain_advanced`，数据库只前进一次。
- 相同 requestId 重试返回同一 `nextBatonToken`；不同 requestId 重放已消费 token → 409。
- owner / baton / participant token 互不越权；participant 只能撤回自己席位。
- 删除后 GET 仅得空 tombstone；旧 token 永久失效。
- 撤回清空幂等缓存；当前未答问题撤回 → `cancelled`；历史撤回链条继续并显示“该内容已撤回”。
- 7 天 / 90 天 alarm 清理测试通过。
- token 不进入 query、public URL、metadata、卡片文本或埋点；链条 shell 携带 no-store / noindex,nofollow / no-referrer / nosniff。

## 浏览器验收（wrangler dev 本地，六个独立 context）

15/15 通过：创建与 fragment 链接、fragment 收取后清理地址栏、刷新恢复、第 6 席 returned、owner 收尾、结果页无 fragment、撤回占位文案、owner 删除、并发抢棒（输家看到接走者而非白屏）、断网保留草稿、320/390/768/1440 无横向滚动、键盘表单、reduced-motion、桌面邀请卡下载、shell metadata 与安全头。

截图：`output/acc-landing-mobile.png`、`output/acc-result-mobile.png`。

## 已知非阻塞问题

1. 本地 `wrangler dev` 需 `--compatibility-date 2026-08-01`：本机 workerd（1.20260801.1）尚不支持配置中的 2026-08-09；`deploy:dry` 与生产不受影响。
2. 并行会话的 ai-judge / 主站重做工作（projects.ts、app.test.tsx 等）在验证期间仍未提交；HEAD 的 home 构建依赖该会话后续提交，与本功能无关。
3. 基线曾有的 ai-judge `verdict-schema` 失败由用户并行会话在运行期间自行修复，非本功能造成。
4. 未执行：生产部署、Cloudflare 远程操作、微信真机测试。
