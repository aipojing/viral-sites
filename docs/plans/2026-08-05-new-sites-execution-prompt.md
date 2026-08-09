# 五个新站点执行提示词（交给外部编码模型）

> 用法：将下面代码块内的全文复制给编码模型，并把工作目录设置为 `/Users/ahs/Documents/vibe-coding/viral-sites`。

```text
你是一名负责把既有产品设计和实现计划落地的资深前端工程师。请在下面的本地仓库中完成五个新站点：

/Users/ahs/Documents/vibe-coding/viral-sites

你的任务是实现代码，不是重新做产品策划。按顺序完成：

1. 06 默契度测试：sites/tacit-test
2. 02 精神状态检测：sites/mental-state，并新增 @viral/shared quiz v1
3. 11 拒绝话术生成器：sites/refusal-generator，并新增 @viral/shared phrase
4. 08 赛博求签：sites/cyber-fortune，并新增 @viral/shared seeded
5. 12 网感年龄测试：sites/internet-age，并把 quiz 升级到 v2

## 一、开始前必须阅读

先完整阅读以下文件，不得只看标题或摘要：

1. 如果仓库中存在 AGENTS.md，先读并遵守。
2. docs/plans/2026-08-05-new-sites-development-plan.md
3. docs/00-factory-design.md
4. docs/00a-style-map.md
5. 当前项目对应的产品文档与详细计划：
   - 06：docs/06-tacit-test.md + docs/plans/2026-08-04-tacit-test.md
   - 02：docs/02-mental-state-check.md + docs/plans/2026-08-04-mental-state.md
   - 11：docs/11-refusal-generator.md + docs/plans/2026-08-04-refusal-generator.md
   - 08：docs/08-cyber-fortune.md + docs/plans/2026-08-04-cyber-fortune.md
   - 12：docs/12-internet-age-test.md + docs/plans/2026-08-04-internet-age.md

一次只加载和执行当前项目的详细计划。完成并验证当前项目后，再读取下一个项目的详细计划，避免同时修改五个站点导致范围失控。

发生冲突时按以下优先级处理：

1. 本提示词
2. 仓库 AGENTS.md
3. docs/plans/2026-08-05-new-sites-development-plan.md
4. 当前产品设计文档
5. 当前单站详细实现计划
6. 你个人偏好

不得用个人偏好覆盖已经确定的范围、文案、视觉或技术边界。

## 二、先保护现有工作区

开始编码前执行并记录：

git status --short
git log -5 --oneline
pnpm -r test
pnpm -r typecheck

规则：

- 当前工作区不是干净仓库。已有修改和未跟踪文件属于用户，必须原样保留。
- 禁止使用 git reset --hard、git checkout --、git clean、git stash 或任何批量回滚命令。
- 禁止使用 git add -A、git add . 或提交整个工作区。
- 每次提交只能 git add 当前 Task 实际新建或修改的明确文件路径。
- 如果计划要求修改一个已经带有用户改动的文件，先阅读 git diff，做最小合并；无法安全隔离时停止并报告，不得覆盖。
- 禁止 git push、创建 PR 或部署生产环境，除非用户之后明确授权。
- 不要修改 docs 下的产品文档和计划文档；发现计划与代码现实冲突时，在完成报告中记录偏差。

如果基线测试本来就失败，记录失败项；只修复与当前项目直接相关的失败，不顺手重构其他代码。

## 三、通用实现规则

- 包管理只用 pnpm。
- 遵循 TDD：先写失败测试并运行确认失败，再写最小实现，再运行确认通过。
- 每个 Task 完成后运行当前包 test 和 typecheck；每个 Project 完成后再运行 build。
- 新站只能依赖 @viral/shared，禁止站点之间互相 import。
- 只有跨站复用的纯函数、schema、模板和随机工具可以进入 packages/shared。
- 不引入计划外的 UI 组件库、日期库、动画库或状态管理库。
- 不扩大范围：不加登录、数据库、排行榜、支付、AI、管理后台或计划外页面。
- 所有用户输入默认只在浏览器中处理；埋点 payload 禁止包含昵称、生日、答案、称呼、自定义文本、挑战 payload 或完整 URL。
- 分享卡片统一走 @viral/shared 的 renderCard/saveCard，1080×1440。
- 移动端展示长按层只能记为保存意向，不得在文案或报告中声称用户已真实保存。
- 视觉严格遵守 docs/00a-style-map.md 中每站分配的风格，禁止把五站做成同一套模板换色。
- 交互必须支持 prefers-reduced-motion。
- 站点首屏 JS + CSS gzip 合计目标 < 100KB。
- 计划里的代码要结合仓库现有 API 校验后再落盘；若当前 @viral/shared 的实际签名与旧计划不同，适配当前签名并记录偏差，禁止为了迎合旧计划破坏已上线的 life-grid。

## 四、五个项目的硬边界

### Project 1：06 默契度测试

- 目录必须是 sites/tacit-test，包名 @viral/tacit-test。
- v1 只做好友版和情侣版，各 10 题、每题 4 选项。
- 挑战数据结构固定为 { v, q, n, a }，使用 UTF-8 base64url。
- 挑战链接按总计划使用 /c?d=<payload>。
- index.html 的 Umami 脚本必须增加 data-exclude-search="true"。
- 页面隐私文案固定为：
  “答案随挑战链接传递，请只发给你信任的人；本站不保存挑战内容”。
- 禁止写“服务器看不到答案”或“答案不经过服务器”。
- 必须完成发起卡、对比卡、非法链接回退和 Clipboard API/execCommand 双路径。
- 手工双设备微信测试无法由你真实完成时，标为【待用户真机验收】，不得伪造通过。

### Project 2：02 精神状态检测

- 目录必须是 sites/mental-state，包名 @viral/mental-state。
- 首发主题锁定“班味浓度检测”，不要临时更换主题。
- 在 packages/shared/src/quiz 实现 linear schema、parseTestConfig 和计分。
- 班味配置必须包含 8 题、5 个结果档位、完整锐评和解药文案。
- shared quiz v1 的测试是 Project 5 升级 v2 时的回归基线，公共 API 命名必须稳定。

### Project 3：11 拒绝话术生成器

- 目录必须是 sites/refusal-generator，包名 @viral/refusal-generator。
- v1 必须是纯前端模板，不接 LLM。
- 完成 8 场景 × 5 语气 × 每组 3 条，共 120 条话术。
- 构建前必须运行矩阵完整性、占位符、字数和重复 id lint。
- 必须支持 Clipboard API 和 execCommand 降级。
- 必须完成标准、文言文、发疯文学三种卡片绘制分支。

### Project 4：08 赛博求签

- 目录必须是 sites/cyber-fortune，包名 @viral/cyber-fortune。
- shared seeded 实现 FNV-1a、确定性序列、pickOne、pickN。
- 验证版内容规模固定：40 条签诗、30 条宜、30 条忌、20 个人物。
- 不擅自扩到 100/50/50/30，也不得缩减现有详细计划已经写好的内容。
- 日期键固定 UTC+8；同昵称、同日期、同 POOL_VERSION 必须跨设备得到同一结果。
- 内容 lint 必须阻止宗教词、医疗/投资/婚恋建议、重复内容和宜忌冲突。
- v1 不做提醒、补签、账号同步或完整节令皮肤。

### Project 5：12 网感年龄测试

- 只有 Project 2 全部完成后才能开始。
- 目录必须是 sites/internet-age，包名 @viral/internet-age。
- 把 shared quiz 升级为 linear/tags 判别联合类型，不能破坏 Project 2。
- 不修改 Project 2 已存在的测试来“适配”v2；新增 v2 测试文件。
- 完成 tag 聚合、占比归一、主成分、平手决策、精神网龄和确定性扰动。
- mental-state 的 test、typecheck、build 必须在 Project 5 完成后重新全量通过。

## 五、逐项目执行循环

对每个 Project 严格执行以下循环：

1. 阅读产品文档和详细计划。
2. 用 rg/rg --files 核对当前仓库结构和可复用 API。
3. 列出本 Project 将创建和修改的文件，不碰范围外文件。
4. 按详细计划 Task 顺序执行 TDD；不要跳过失败测试阶段。
5. 每个 Task 通过后，只提交该 Task 的明确文件路径。
6. Project 完成后运行：
   - 当前站点 test
   - 当前站点 typecheck
   - 当前站点 build
   - 所有受影响的 @viral/shared 测试和 typecheck
   - 所有依赖该 shared 模块的既有站回归
7. 检查构建体积、埋点 payload、移动端布局和卡片绘制。
8. 输出 Project 检查点报告，然后继续下一个 Project。

如果详细计划中的命令与当前 package scripts 不一致，以 package.json 的真实脚本为准，并在报告中说明。

## 六、提交规则

- 一个详细计划 Task 对应一个 conventional commit。
- 提交前运行 git diff --check。
- 提交前执行 git diff --cached --name-only，确认暂存区只有当前 Task 文件。
- 禁止 Co-Authored-By 尾注。
- 推荐格式：
  - feat(tacit-test): ...
  - feat(shared): ...
  - test(mental-state): ...
  - fix(cyber-fortune): ...
  - chore(internet-age): ...
- 如果当前环境不允许 commit，继续完成实现和验证，但在报告中列出建议 commit 分组；不要把“不能 commit”当作停止编码的理由。

## 七、必须停止并请求用户的情况

只有下列情况才停止：

- 需要 Umami website-id、Cloudflare 登录、域名或真实设备操作。
- 当前计划要求覆盖用户已有修改，且无法安全合并。
- 同一个根因连续三次尝试仍无法通过测试或构建。
- 产品文档、总计划和详细计划出现无法按优先级消解的实质冲突。
- 发现会泄露用户输入、密钥或生产数据的实现。

普通类型错误、测试失败、依赖安装或计划内代码调整不属于停止理由，应自行诊断并继续。

## 八、每个 Project 的检查点报告格式

完成一个 Project 后输出：

- Project：名称与目录
- 状态：代码完成 / 被阻塞
- 完成的 Task 与 commit 哈希
- 新建和修改的文件
- test：命令与结果
- typecheck：命令与结果
- build：命令、结果、gzip 体积
- shared 与既有站回归结果
- 未完成的人工步骤
- 相对计划的偏差及原因

## 九、全部完成后的最终验证

五个 Project 全部完成后运行：

pnpm -r test
pnpm -r typecheck
pnpm -r build
git diff --check
git status --short

最终报告必须明确列出：

- 五个新站点是否都存在并成功构建。
- 所有测试总数与失败数。
- 每站 gzip 体积。
- shared quiz/phrase/seeded 的公共 API。
- 未执行的 Umami、Cloudflare、真机和部署步骤。
- 所有未提交改动及其归属。
- 全部计划偏差，不得用“基本完成”掩盖缺项。

现在开始。先阅读文件并执行基线检查，然后从 Project 1：06 默契度测试开始。不要先创建其他四个站点的空目录。
```
