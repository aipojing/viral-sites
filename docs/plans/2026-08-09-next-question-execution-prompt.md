# 下一问执行提示词（交给外部编码模型）

> 用法：将下面代码块内的全文复制给编码模型，并把工作目录设置为 `/Users/ahs/Documents/vibe-coding/viral-sites`。提示词要求只做本地实现和验证，不授权生产部署或远程 Cloudflare 资源变更。

```text
你是一名负责把既有产品设计和实现计划完整落地的资深全栈工程师。请在下面的本地仓库中实现“下一问”六人接力站：

/Users/ahs/Documents/vibe-coding/viral-sites

你的任务是执行已经确定的设计和开发计划，不是重新策划产品。最终目标是完成：发起者提出 Q1，第 2～6 席依次回答上一问并留下下一问，第 6 席把 Q6 问回发起者，发起者回答后形成完整六人闭环。

## 一、开始前必须完整阅读

按顺序读取，不得只看摘要：

1. 仓库根目录或上级目录中的 AGENTS.md（如果存在）。
2. docs/20-next-question.md —— 唯一产品设计依据。
3. docs/plans/2026-08-09-next-question.md —— 下一问详细开发计划，Task 1～8。
4. docs/plans/2026-08-08-unified-home-integration.md —— 唯一主站与单 Worker 基础设施计划。
5. docs/00-factory-design.md 与 docs/00a-style-map.md —— 工厂约束、分享卡和视觉边界。
6. README.md、package.json、pnpm-workspace.yaml，以及 sites/home、sites/tacit-test、packages/shared 的实际实现。

冲突优先级：

1. 本提示词
2. AGENTS.md
3. docs/20-next-question.md
4. docs/plans/2026-08-09-next-question.md
5. docs/plans/2026-08-08-unified-home-integration.md
6. 现有仓库惯例
7. 你的个人偏好

如果产品设计与开发计划存在无法按上述优先级消解的实质冲突，停止并报告，不要擅自改变六人机制。

## 二、先保护现有工作区

开始编码前执行并记录：

git status --short
git log -5 --oneline
pnpm test
pnpm typecheck

当前工作区不是干净仓库，已有修改和未跟踪文件属于用户。严格遵守：

- 禁止 git reset --hard、git checkout --、git clean、git stash 或任何批量回滚。
- 禁止 git add -A、git add . 或提交整个工作区。
- 修改一个已有脏文件前，先执行 git diff -- <path> 并做最小合并。
- 每个 Task 只能暂存该 Task 明确涉及的路径；提交前运行 git diff --cached --name-only 检查。
- 不覆盖、不格式化、不删除与本任务无关的用户修改。
- 如果无法安全合并重叠改动，停止并列出文件、冲突和建议处理方式。
- 禁止 git push、创建 PR、生产部署、远程 migration、远程 namespace 创建和 secret 写入。
- 不修改 docs/20-next-question.md、docs/plans/2026-08-09-next-question.md 或本提示词；发现问题只在最终报告记录。

如果基线测试已经失败，先记录失败项。只修复由本功能或统一 Worker 接入直接造成的失败，不顺手重构其他站点。

## 三、先完成单 Worker 前置条件

下一问不得创建第二个 Cloudflare 服务、第二个 wrangler.jsonc 或独立部署脚本。生产入口只能是 sites/home。

检查：

test -f sites/home/wrangler.jsonc
test -f sites/home/worker/index.ts
test -f sites/home/worker/env.ts
test -f sites/home/vitest.worker.config.ts

如果任一文件不存在，先执行 docs/plans/2026-08-08-unified-home-integration.md 中建立唯一主站 Worker、Static Assets、Worker 测试池、深链接路由和构建门禁所需的 Task 1～4。不要借机实现 AI 判官或按住不放业务；对应命名空间尚未实现时保留计划规定的 feature_unavailable 行为。

特别检查 sites/home/package.json 的真实包名。当前仓库可能仍使用 @viral/playground，而计划命令使用 @viral/home；禁止让 pnpm --filter 静默匹配不到。按照统一主站计划统一包名，或在执行报告中明确记录经过验证的等价命令。

前置完成后必须通过：

pnpm --filter @viral/home test
pnpm --filter @viral/home test:worker
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
pnpm --filter @viral/home deploy:dry

deploy:dry 只允许本地配置与 bundle 验证；不得运行真实 deploy。

## 四、严格执行下一问 Task 1～8

前置全绿后，严格按 docs/plans/2026-08-09-next-question.md 的 Task 1 → Task 8 执行，不跳过、不重排、不把多个 Task 混成一次大改。

每个 Task 使用同一循环：

1. 读取该 Task 的 Files、Interfaces、Steps 和 Expected。
2. 用 rg/rg --files 核对真实文件与公共 API。
3. 列出本 Task 将创建、修改和测试的明确路径。
4. 先写失败测试。
5. 运行计划给出的精确命令，确认测试因缺少目标行为而失败。
6. 写满足测试的最小实现。
7. 运行当前 Task 测试、受影响包 typecheck 和必要回归。
8. 运行 git diff --check。
9. 只暂存本 Task 的明确文件路径并检查暂存列表。
10. 使用计划给出的 conventional commit 信息做本地提交；禁止 Co-Authored-By 尾注。

测试失败时优先修实现，禁止为了变绿而删除断言、降低边界或把测试 skip。只有测试与产品文档明确矛盾时才停下请求裁决。

## 五、不可改变的产品规则

- 一条链固定 6 人，发起者固定为第 1 席。
- 第 2～5 席：回答上一问，再写下一问。
- 第 6 席：回答 Q5，写 Q6；系统进入 returned，绝不生成第 7 棒。
- 发起者凭 ownerToken 回答 Q6 后进入 completed。
- 不增加年龄限制、人数选择、无限接力、陌生人匹配或聊天室。
- 不增加账号、头像、评论、点赞、关注、排行榜、广场、支付或 AI。
- 昵称 1～8、问题 1～60、回答 1～200，前后端统一按 NFC 后 Unicode code points 校验。
- 当前棒只能成功提交一次；并发抢同一棒必须恰好一个成功，其余返回 409 chain_advanced。
- 每个写请求使用 requestId 幂等；网络响应丢失后以相同 requestId 重试必须返回相同下一棒 token，不重复推进。
- 未完成链 7 天过期，完成链 90 天过期；使用 Durable Object alarm，不使用 setTimeout。
- 发起者可删除整条链，每席可撤回自己的内容。
- 当前未回答的问题被撤回时进入 cancelled；已经回答过的历史内容被撤回时链条继续并显示“该内容已撤回”。

## 六、Cloudflare 架构硬边界

- 玩法源码放 sites/next-question，生产路由挂在 sites/home。
- 页面路径：/next-question/
- 链条路径：/next-question/c/<slug>
- API：/api/next-question/*
- 每条随机 slug 使用 env.NEXT_QUESTION_CHAINS.idFromName(slug) 映射一个 Durable Object。
- Durable Object 类名固定 NextQuestionChain，使用 SQLite storage。
- 使用当前 Cloudflare declarative exports 配置；实施前核对当日官方文档、已安装 wrangler/config-schema.json 和生成类型。
- 新增 binding 必须合并进唯一 sites/home/wrangler.jsonc，不能覆盖其他玩法 binding。
- 使用 Workers Rate Limiting binding 保护创建接口；它只是防滥用层，精确状态仍由 Durable Object 保证。
- v1 不增加 D1、KV、R2、Queues、Workflows、WebSocket、邮件或推送。
- API handler 不处理其他玩法；主站 Worker 负责命名空间分发、静态资产、404、metadata 和公共响应头。

如果本地依赖中的 Cloudflare schema 与计划示例不一致，先查询 Cloudflare 官方文档，再按当前 schema 实现，并在最终报告记录准确差异；禁止用 any 或跳过 Worker 测试绕过去。

## 七、token、隐私与日志规则

- capability 只允许放 URL fragment：#b=<batonToken> 或 #o=<ownerToken>。
- 前端读取 fragment 后存入该链的 token vault，并立即用 history.replaceState 清理地址栏。
- API 只从 Authorization: Bearer ... 接收 capability；禁止 query/body/Cookie token。
- public 链接和结果二维码禁止包含 fragment；一次性邀请二维码才包含 baton fragment。
- slug、token、昵称、问题、回答禁止进入 Umami payload、console、Worker 日志、错误响应和 metadata。
- metadata 只允许表达 waiting/returned/completed 等状态和第几棒，禁止引用用户文本。
- 所有 API 响应 Cache-Control: no-store；链条 shell 增加 noindex、nofollow、no-referrer、nosniff。
- React 只渲染文本节点，禁止 dangerouslySetInnerHTML。
- 服务端必须拒绝控制字符、URL、邮箱和明显手机号，避免导流与人肉信息。
- 撤回或删除时清空可能缓存旧文本的 submissions response，防止幂等重试重新泄露。
- 不得在测试 fixture 或验证报告中写真实个人信息；使用“甲/乙/丙”和虚构问答。

## 八、实现质量要求

- 包管理只用 pnpm。
- 文件编辑优先使用 apply_patch；搜索优先 rg/rg --files。
- 不引入计划之外的 UI 框架、状态库、路由库、日期库或动画库。
- 站点之间不得直接依赖；next-question 只能依赖 @viral/shared 和计划列出的包。
- 分享卡使用 @viral/shared 的 renderCard/saveCard，尺寸 1080×1440。
- 接棒卡不显示问题正文；结果卡使用 public URL，不能泄露 token。
- 页面必须支持 320px、390px、768px、1440px；最小触控区域 44px。
- 支持键盘、focus-visible、屏幕阅读器语义和 prefers-reduced-motion。
- 任何 loading/error 不得清空用户尚未成功提交的回答草稿。
- 页面刷新必须依靠 URL + token vault 恢复，不能依赖 React 内存状态。
- 不为“实时感”增加 WebSocket；打开或刷新时 GET 最新状态即可。

## 九、必须完成的关键测试

除计划中全部测试外，以下测试缺一不可：

1. 六席完整 API 链：创建 → slot2 → slot3 → slot4 → slot5 → slot6 → owner close。
2. slot6 后状态是 returned、nextSlot=1、nextBatonToken=null。
3. 同一 baton 两个不同 requestId 并发提交，一个成功、一个 409，数据库只前进一次。
4. 成功响应丢失后使用相同 requestId 重试，返回同一 nextBatonToken。
5. owner token、baton token、participant token 不能互相越权。
6. 删除后不返回任何 entry，旧 token 永久失效。
7. 撤回清空旧幂等响应；当前问题撤回 cancelled，历史内容撤回不改变进度。
8. 未完成 7 天、完成 90 天 alarm 清理。
9. token 不进入 query、public URL、metadata、卡片文本或埋点。
10. 320px 移动端无横向滚动，键盘可完成所有表单和分享 fallback。

## 十、禁止事项

- 禁止重新讨论人数、把六人改成可配置或增加第 7 棒。
- 禁止把产品实现成聊天、问答社区或内容广场。
- 禁止创建独立 Pages/Workers 项目或玩法自己的 wrangler.jsonc。
- 禁止真实部署、wrangler login、远程资源创建、远程 migration 或 secret put。
- 禁止修改设计文档来迁就实现。
- 禁止用 URL query 携带 token。
- 禁止用 localStorage 保存用户问答正文。
- 禁止用 any、ts-ignore、跳过测试或降低 strict 规避类型错误。
- 禁止顺手修改其他玩法的视觉、文案或数据。
- 禁止声称未运行的真机、微信、生产或远程验证已经通过。

## 十一、允许停止并请求用户的情况

只有以下情况可以停止：

- 需要 Cloudflare 登录、真实部署、远程资源或 secret。
- 需要覆盖无法安全合并的用户现有修改。
- 设计文档与计划出现无法按优先级解决的实质矛盾。
- 当前 Cloudflare schema 已移除计划依赖的能力，官方文档也没有等价方案。
- 同一个根因连续三次尝试仍无法通过测试、构建或类型检查。
- 发现会泄露 capability、用户文本、生产数据或凭据的实现风险。

普通依赖安装、类型错误、测试失败、CSS 调整和计划内代码重构不属于停止理由，应诊断后继续。

## 十二、最终验证

Task 1～8 全部完成后运行：

pnpm --filter @viral/next-question test
pnpm --filter @viral/next-question typecheck
pnpm --filter @viral/next-question build
pnpm --filter @viral/home test
pnpm --filter @viral/home test:worker
pnpm --filter @viral/home typecheck
pnpm --filter @viral/home build
pnpm --filter @viral/home deploy:dry
pnpm test
pnpm typecheck
git diff --check
git status --short

再用六个独立浏览器 context 或无痕窗口完成本地全链验收，检查刷新恢复、并发抢棒、断网重试、撤回、删除、二维码、分享 fallback、长文本和四档 viewport。

不得运行 pnpm --filter @viral/home deploy。

## 十三、完成报告格式

最终报告必须包含：

- 状态：完成 / 被阻塞。
- 统一主站前置完成情况和实际 package 名称。
- Task 1～8：状态、commit 哈希、新增测试数。
- 新建和修改的文件列表。
- Durable Object schema、binding、exports 和 API 路由摘要。
- test/typecheck/build/deploy:dry 的精确命令与退出结果。
- 六人全链、并发、幂等、撤回、删除、alarm 的验证结果。
- 浏览器与 viewport 验收结果和截图路径。
- 未执行的生产部署、Cloudflare 远程操作、微信真机测试。
- 所有相对计划的偏差及原因；没有偏差时写“无偏差”。
- git status 中所有剩余改动，并区分本任务文件与用户原有文件。

现在开始：先完整阅读文档，执行工作区和基线检查，再判断统一主站前置是否完成。不要先写下一问 UI，也不要创建第二个 Worker。
```
