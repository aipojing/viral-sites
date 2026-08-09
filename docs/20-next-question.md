# 20 · 下一问（S 级候选）

> 2026-08-09 · 状态：设计完成，待实现 · 形态：六人定向接力 + Cloudflare Workers / Durable Objects

## 1. 一句话

回答上一棒留下的问题，再写下一问并只交给一个人；问题经过固定六个人后问回发起者，由发起者回答完成闭环。

产品标语：

> 回答一个人的问题，再把下一问交给一个人。六个人后，它会回到你这里。

## 2. 产品判断

这是一个**接力内容工具**，不是聊天室，也不是陌生人问答社区。

它的结构性传播来自：参与者要完成自己的体验，必须把下一棒交给另一个人。一次接棒天然包含一次定向拉新；固定六席又让链条有明确终点，不会无限退化成聊天。

年龄不再是参与门槛。年龄、城市、职业等只适合作为日后的主题模板或可选叙事标签，不能参与默认路由。默认玩法只要求“把下一问交给一个人”。

和默契度测试的区别：

| 项目 | 默契度测试 | 下一问 |
|------|------------|--------|
| 关系结构 | 固定两个人 | 固定六个席位 |
| 内容结构 | 同一套客观选择题 | 每个人回答上一问、创造下一问 |
| 传播次数 | 一次定向邀请 | 最多五次向前传棒 + 一次回到起点 |
| 结果 | 双人分数与对比 | 六个人共同完成的一条问答故事 |
| 后端 | URL 携带答案 | 服务端协调唯一当前棒和完整链条 |

## 3. 核心规则

一条链固定六个人，发起者占第 1 席。

1. 第 1 席写下问题 Q1，交给第 2 席。
2. 第 2 席回答 Q1，写下 Q2，交给第 3 席。
3. 第 3～5 席重复“回答上一问 + 写下一问”。
4. 第 6 席回答 Q5，写下 Q6；Q6 自动问回第 1 席。
5. 第 1 席回答 Q6，六个人、六个问题、六个回答全部成立，链条闭环。

硬限制：

- 人数固定为 6，不提供 3/8/10 人选择。
- 每个非发起者只完成一次“回答 + 提问”。
- 当前棒链接只能成功提交一次；多人同时打开时，第一个有效提交者获得该席位。
- 已经传棒后不能修改内容，避免后续回答失去原始语境。
- 不设聊天框、追问、点赞、评论、关注或陌生人匹配。
- 不收集年龄、头像、手机号、地理位置和真实姓名。

## 4. 用户流程

```text
发起者
  写昵称 + Q1
  → 创建链
  → 保存“守环页”
  → 把第 2 棒链接发给一个人

第 2～5 棒
  打开唯一接棒链接
  → 只看当前问题
  → 写回答 + 下一问
  → 提交后看到链条进度
  → 把新生成的下一棒链接发给一个人

第 6 棒
  回答 Q5 + 写 Q6
  → 系统显示“问题已经回到起点”
  → 分享等待发起者收尾的进度页

发起者
  回到守环页看到 Q6
  → 回答
  → 获得六人闭环结果页和分享卡
```

发起者没有账号。创建成功后，浏览器保存仅属于该链的 `ownerToken`；守环页明确提示“把这页留着，最后一问会回到这里”。

如果发起者暂时没有回来，链条停留在“已回到起点”状态而不是判定失败。这是一个有悬念的中间结果：

> 问题已经走完六个席位，现在只等出发的人回答。

## 5. 状态机

```text
WAITING(slot=2)
  → WAITING(slot=3)
  → WAITING(slot=4)
  → WAITING(slot=5)
  → WAITING(slot=6)
  → RETURNED(slot=1)
  → COMPLETED

任何未完成状态 → EXPIRED
发起者删除      → DELETED
当前未回答的问题被撤回 → CANCELLED
```

状态定义：

| 状态 | 含义 | 可执行动作 |
|------|------|------------|
| `waiting` | 等待第 2～6 席中的当前一席 | 当前 `batonToken` 可提交一次 |
| `returned` | 第 6 席已提出 Q6，问题回到发起者 | `ownerToken` 可回答 Q6 |
| `completed` | 六组问答完整 | 查看、保存、分享结果 |
| `expired` | 超过保留期仍未完成 | 只显示失效说明，可重新发起 |
| `deleted` | 发起者主动删除 | 不再返回问答内容 |
| `cancelled` | 当前尚未回答的问题被提问者撤回 | 停止传棒，保留其余人的已提交内容 |

过期策略：

- 未闭环链：最后一次有效动作后保留 7 天。
- 已闭环链：完成后保留 90 天，结果页持续提示保存图片。
- Durable Object 使用一个 alarm 执行到期清理；不依赖内存定时器。

## 6. 页面与信息架构

生产路径固定为 `/next-question/`，链条深链接为 `/next-question/c/<slug>`。

### 6.1 首页 / 发起页

- 标题：`留一个问题，看它会经过谁`
- 解释：`六个人，一人回答一问，再留下一问。最后它会回到你这里。`
- 输入：昵称（1～8 个 Unicode code points）
- 输入：第一个问题（1～60 个 Unicode code points）
- 主按钮：`发出第一问`
- 提交前声明：`回答会出现在这条接力的结果页；拿到链接的人可以看到。`

首页不展示模板选择、年龄选择或公开热门链条。

### 6.2 接棒页

首屏只呈现三件事：

1. `第 3 / 6 棒`进度。
2. 上一棒留给当前人的问题。
3. `接下这一棒`按钮。

点击后填写：

- 昵称，1～8 字。
- 回答，1～200 字。
- 下一问，1～60 字。

提交前不展示其他人的完整回答，减少从众和模仿；提交成功后才展开“这条问题已经走过的路”。

### 6.3 传棒页

- 标题：`你的回答已经留在第 3 棒`
- 主行动：`把第 4 棒交给一个人`
- 提供系统分享、复制链接、保存带二维码邀请卡。
- 明确提示：`只发给一个人；如果多人打开，最先提交的人接走这一棒。`

刷新或网络重试后必须能恢复下一棒链接，不能因为响应丢失让链条断掉。

### 6.4 守环 / 进度页

- 显示六个席位组成的环形进度，而不是聊天气泡列表。
- 已完成席位显示昵称和一句回答摘录；未完成席位只显示空位。
- 发起者持有 `ownerToken` 时显示删除入口和最终收尾表单。
- 普通访问者只读，不显示管理能力。

### 6.5 结果页

- 标题：`一个问题走过六个人，又回到了起点`
- 按顺序展示 Q1/A1～Q6/A6。
- 每组内容明确标出提问者与回答者，避免长列表看不懂。
- 生成一张摘要卡：六个昵称、六句回答摘录、闭环日期和完整链条二维码。
- 完整文字留在网页，图片只放摘录，避免卡片成为密密麻麻的长截图。

## 7. 链接与无登录身份

链条使用高熵随机 `slug`，不使用自增 ID。权限使用 capability token，不建立账号系统。

```text
公开只读页：/next-question/c/<slug>
接棒链接：  /next-question/c/<slug>#b=<batonToken>
守环链接：  /next-question/c/<slug>#o=<ownerToken>
```

token 放在 URL fragment 中，浏览器不会把 fragment 自动发送给服务器、访问日志或 Referer。前端读取后保存到本机，再通过 `Authorization: Bearer ...` 调用 API，并用 `history.replaceState` 从地址栏移除 fragment。

token 规则：

- 每条链生成独立随机 `chainSecret`，仅保存在该 Durable Object 的 SQLite 中。
- `ownerToken`、各席 `batonToken` 和内容撤回 token 由 `HMAC(chainSecret, purpose)` 确定性派生。
- 确定性 token 让同一个幂等提交在网络重试后仍能恢复同一条下一棒链接。
- token 比较使用常量时间比较，不写日志、不进入埋点。

## 8. 后端架构

遵守统一主站方案：玩法源码位于 `sites/next-question`，但线上只由 `sites/home` 的唯一 Worker 与静态资源部署提供服务。

```text
浏览器
  ├─ /next-question/*              → Worker Static Assets / React
  └─ /api/next-question/*          → 主站 Worker 路由
                                      → NextQuestionChain Durable Object
                                         └─ 每条链独立 SQLite
```

选择 Durable Objects 而不是只用 D1 的原因：

- 一条链接同时被多人打开时，需要强一致地决定谁获得当前席位。
- “验证当前棒 → 写回答 → 推进席位 → 生成下一棒”必须作为一个不可拆分的状态转换。
- 每条链接天然是一个独立实体，适合 `idFromName(slug)` 映射为一个 Durable Object。
- 每条链只有极低请求量，不需要实时 WebSocket 或全局数据库。
- 一个 alarm 足以处理该链过期清理。

v1 不引入 D1、KV、R2、Queues、Workflows 或 WebSocket。日后只有在需要创作者后台、全局搜索或集中审核队列时才增加 D1 索引。

## 9. 数据模型

每个 Durable Object 的 SQLite 只保存一条链：

```sql
CREATE TABLE chain (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  slug TEXT NOT NULL,
  status TEXT NOT NULL,
  next_slot INTEGER,
  chain_secret TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE entries (
  slot INTEGER PRIMARY KEY CHECK (slot BETWEEN 1 AND 6),
  nickname TEXT NOT NULL,
  answer TEXT,
  question TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  redacted INTEGER NOT NULL DEFAULT 0 CHECK (redacted IN (0, 1))
);

CREATE TABLE submissions (
  request_id TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

`entries.slot=1` 在创建时写入昵称和 Q1，闭环时补写对 Q6 的回答。第 2～6 席分别保存“对上一问的回答”和“交给下一人的问题”。展示时把第 N 席的问题与第 N+1 席的回答配对，第 6 席的问题与第 1 席的回答配对。

`submissions` 保存幂等响应；同一 `request_id` 重试直接返回首次结果，不重复推进状态。

`chain_secret` 只在活动链中存在；过期或删除时先清空 entries/submissions，再置为 `NULL`，从而让旧 capability 永久失效，同时保留一个不含用户内容的状态 tombstone 给失效页使用。

撤回会清空 `submissions` 中可能缓存的旧响应，防止幂等重试重新返回已撤回文本。如果撤回的是当前尚未被回答的问题，状态进入 `cancelled` 并让当前接棒 token 失效；如果该问题已经被下一席回答，链条继续，只在历史中显示“该内容已撤回”。

## 10. API 契约

| Method | Path | 权限 | 作用 |
|--------|------|------|------|
| `POST` | `/api/next-question/chains` | 创建限流 | 创建链，返回守环 token 和第 2 棒 token |
| `GET` | `/api/next-question/chains/:slug` | 无，slug 即非公开定位符 | 获取脱敏后的链条状态 |
| `POST` | `/api/next-question/chains/:slug/baton` | 当前 `batonToken` | 回答上一问、写下一问、推进席位 |
| `POST` | `/api/next-question/chains/:slug/close` | `ownerToken` | 发起者回答 Q6，完成闭环 |
| `POST` | `/api/next-question/chains/:slug/redact` | 对应席位 token | 撤回该席内容并保留链条结构 |
| `DELETE` | `/api/next-question/chains/:slug` | `ownerToken` | 删除整条链 |

统一错误码：

| HTTP | code | 前端文案 |
|------|------|----------|
| 400 | `validation_failed` | 内容有点不合规格，改短一点再试 |
| 403 | `invalid_token` | 这不是当前可用的接力棒 |
| 404 | `chain_not_found` | 这条问题不存在 |
| 409 | `chain_advanced` | 这一棒已经被别人接走了 |
| 410 | `chain_expired` | 这条接力已经过期 |
| 410 | `chain_cancelled` | 有一棒撤回了问题，这条接力停在这里 |
| 429 | `rate_limited` | 今天发出的问题有点多，晚点再来 |

所有 API 响应使用 `Cache-Control: no-store`。服务端不记录请求正文、token、昵称、问题或回答到日志。

## 11. 隐私、撤回与安全

- 链条默认 `unlisted`：没有首页广场、站内搜索、排行榜或搜索引擎收录。
- 页面明确告知：拿到链条链接的人能看到已经提交的问答。
- React 只渲染文本节点，不使用 `dangerouslySetInnerHTML`。
- 服务端按 Unicode code points 再次校验昵称、问题和回答长度；前端限制不是安全边界。
- 拒绝控制字符、可点击 URL 和明显的手机号/邮箱，降低导流、诈骗和人肉风险。
- 发起者可删除整条链；每席提交后获得本机保存的撤回 token，可把自己的昵称、回答和问题替换为“该内容已撤回”。
- 创建接口做 Cloudflare Worker Rate Limiting；接棒接口还受一次性 token 约束。
- v1 只做无公开广场的小范围验证。开放大规模陌生人传播前，举报队列、审核后台和 Turnstile 是发布门槛。

## 12. 分享物

### 接棒邀请卡

- 大字：`第 3 / 6 棒`
- 主文案：`上一棒给你留了一个问题`
- 辅文案：`回答它，再把下一问交给一个人`
- 二维码：当前一次性接棒链接
- 不在图片上暴露问题正文，避免私人内容被无意转发。

### 进度卡

- `这个问题已经走过 4 个人`
- 六席环形图，已完成席位点亮。
- `还差 2 棒回到起点`
- 二维码指向只读进度页，不包含接棒 token。

### 闭环结果卡

- `一个问题走过六个人，又回到了起点`
- 六个昵称与六句回答摘录。
- `第 1 棒发出于 YYYY.MM.DD · 第 6 棒闭环于 YYYY.MM.DD`
- 二维码进入完整问答页。

## 13. 视觉方向

视觉关键词：**传话纸条、接力票、六枚盖章、沿途留下的笔迹**。

- 米白纸张底色，不做聊天软件气泡。
- 一条弯曲路线连接六个编号圆章，当前席位使用高饱和朱红或钴蓝。
- 问题使用较大的手写感标题，回答使用清晰系统中文字体；可读性优先于拟真纸张效果。
- 每次成功传棒盖下一枚章，形成轻量仪式感。
- 签名元素是“第 6 枚章盖下后，路线首尾相连”。

## 14. 埋点与生死指标

事件：

- `next_question_created`
- `next_question_baton_opened`，属性仅含 `slot`
- `next_question_baton_submitted`，属性仅含 `slot`
- `next_question_baton_shared`，属性含 `slot`、`method`
- `next_question_returned`
- `next_question_completed`
- `next_question_result_saved`
- `next_question_redacted`

埋点禁止携带 slug、token、昵称、问题和回答。

核心漏斗：

- 首棒打开率 = 第 2 棒打开 / 创建，首周目标 ≥ 45%。
- 单棒完成率 = 提交 / 打开，各席目标 ≥ 60%。
- 单棒继续率 = 下一棒打开 / 上一棒提交，各席目标 ≥ 45%。
- 回到起点率 = `returned / created`，首周目标 ≥ 8%。
- 完整闭环率 = `completed / created`，首周目标 ≥ 5%。
- 完成后保存率目标 ≥ 8%。

若首棒打开率不足，先修邀请文案与链接预览；若中间席位持续衰减，先缩短输入与优化传棒页；不通过增加无限人数或陌生人广场掩盖漏斗问题。

## 15. v1 范围

v1 必须有：

- 固定六席完整状态机。
- 无登录 capability token。
- 一条链一个 SQLite-backed Durable Object。
- 创建、接棒、问回发起者、闭环、过期、删除与撤回。
- 系统分享、复制链接、二维码邀请卡、结果摘要卡。
- 同一 Worker 下的 React 静态页面与 API。
- 移动端 320px 起可用、键盘可用、减少动态效果兼容。

v1 明确不做：

- 年龄、城市或职业作为接棒限制。
- 人数自定义、无限接力、多人抢答榜。
- 账号、头像、好友关系、关注和私信。
- 陌生人广场、热门链、搜索和评论。
- AI 提问、AI 总结或 AI 审核。
- WebSocket 实时同步、推送通知和邮件提醒。
- 付费。

## 16. 后续模板触发条件

只有默认六人接力达到“回到起点率 ≥ 8%”后，才开发主题模板：

- `8 岁问到 80 岁`：创作者提前组织参与者的策划模式，不进入普通用户默认流程。
- `六种职业的一问`：职业仅作展示标签，由创作者邀请。
- `六座城市的一问`：城市仅作展示标签，不做定位验证。
- `一家六口的一问`：家庭纪念模式，可延长保留期并导出长图。

模板改变文案和结果叙事，不改变“固定六席、回答上一问、留下下一问、最后回到起点”的底层协议。
