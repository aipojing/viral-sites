# viral-sites 小站工厂

批量生产「功能极简、好玩、易传播」的中文小网站，用数据验证哪个点子有传播力，爆了就深耕。

## 打法

**工厂模式**：搭一条流水线（共享的分享卡片生成、埋点统计、站点模板），让每个新点子从想法到上线只要 1~2 天。viral 命中率天然很低，批量试错是唯一靠谱的策略——10 个里爆 1 个就是胜利。

核心判断：**中文社交环境里，链接传不动，图能传**。所以每个站的核心交付物不是页面，而是一张让人愿意保存、转发的结果卡片。

详见 [docs/00-factory-design.md](docs/00-factory-design.md)。

生产主站：[guaihaowan.aipojing.xyz](https://guaihaowan.aipojing.xyz)

## 已上线站点

| # | 站点 | 一句话 | 形态 |
|---|------|--------|------|
| 01 | [人生进度条](docs/01-life-grid.md) | 输入生日，看你的人生还剩多少个格子 | 纯前端 |
| 02 | [精神状态检测](docs/02-mental-state-check.md) | 8 道题测出你的班味浓度 | 纯前端 |
| 03 | [AI 赛博判官](docs/03-ai-judge.md) | 报上名来，AI 给你写一张毒舌判词 | 轻后端 + LLM |
| 04 | [上班回本计算器](docs/04-salary-timer.md) | 实时跳动：这次带薪如厕价值 ¥3.2 | 纯前端 |
| 06 | [默契度测试](docs/06-tacit-test.md) | 答 10 题生成链接发对方，链接被打开结果才存在 | 纯前端 |
| 08 | [赛博求签](docs/08-cyber-fortune.md) | 打工人电子黄历，每日一签 | 纯前端 |
| 11 | [拒绝话术生成器](docs/11-refusal-generator.md) | 选场景选语气，一键复制拒绝话术 | 纯前端/轻 AI |
| 12 | [网感年龄测试](docs/12-internet-age-test.md) | 测你的互联网精神年龄与成分 | 纯前端 |
| 15 | [按住不放挑战](docs/15-hold-button.md) | 按住按钮别松手，看你能坚持多久 | 纯前端/轻后端 |
| 16 | [一秒钟世界](docs/16-one-second-world.md) | 你盯着屏幕的这几秒，世界在发生什么 | 纯前端 |
| 17 | [亲戚称呼计算器](docs/17-kinship-calculator.md) | 点出关系链，算出该怎么称呼 | 纯前端 |
| 18 | [年度报告](docs/18-year-report.md) | 十个问题，生成你的年度总结 | 纯前端 |
| 20 | [下一问](docs/20-next-question.md) | 六人接力问答，问题最后回到起点 | 轻后端 |

全部 13 个站点通过统一主站同源部署，路径分别为 `/life-grid/`、`/mental-state/`、`/ai-judge/` 等。

## 候选池（已出设计文档，未上线）

| # | 站点 | 评级 | 一句话 |
|---|------|------|--------|
| 07 | [余生清单](docs/07-bucket-list.md) | S | 勾选热爱的事，算出「还能吃 812 次火锅」清单卡 |
| 09 | [花光首富的钱](docs/09-spend-fortune.md) | A | 给你 3000 亿看你几分钟花完，购物清单卡 |
| 10 | [放假倒计时](docs/10-holiday-countdown.md) | A | 距下个假期 X 天 + 调休真相 + 请假攻略 |
| 19 | [MBTI 受难日历](docs/19-mbti-calendar.md) | B | 每天一条「INFP 今日受难事项」 |

> 睡眠银行、道歉信生成器已分别作为人生进度条结果页模块和拒绝话术生成器模式并入上线站点，不再独立成站。

评级理由与淘汰区见 [docs/05-idea-pool.md](docs/05-idea-pool.md)；各站视觉风格分配见 [docs/00a-style-map.md](docs/00a-style-map.md)。

## 技术栈

- pnpm monorepo：`packages/shared`（卡片生成 / 埋点 / 基础 UI） + `sites/*`（每个玩法源码）+ `sites/home`（唯一生产主站）
- Vite + React + TypeScript + Tailwind CSS v4
- 部署：统一主站单一部署——`sites/home` 一个 Vite MPA 产物 + 一个 Cloudflare Worker（Static Assets）；玩法走同源路径，不再单独建 Pages/Workers 项目
- 统计：Cloudflare Analytics Engine（访问 / 生成 / 保存卡片等第一方事件），主站同源接收 `/api/events`
- 测试：Vitest（含 Worker 环境测试）

## 本地开发

```bash
# 安装依赖
pnpm install

# 本地启动主站
pnpm --filter @viral/home dev

# 类型检查
pnpm typecheck

# 跑测试
pnpm test

# 构建全部
pnpm build
```

## 仓库结构

```
viral-sites/
  docs/            # 设计文档
  packages/        # 共享能力包
  sites/           # 各玩法源码与唯一生产主站
  output/          # 截图、报告等产物
```

当前阶段：**统一主站持续迭代中**，13 个玩法同源部署，通过第一方数据持续验证传播力。
