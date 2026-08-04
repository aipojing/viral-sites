# viral-sites 小站工厂

批量生产「功能极简、好玩、易传播」的中文小网站，用数据验证哪个点子有传播力，爆了就深耕。

## 打法

**工厂模式**：搭一条流水线（共享的分享卡片生成、埋点统计、站点模板），让每个新点子从想法到上线只要 1~2 天。viral 命中率天然很低，批量试错是唯一靠谱的策略——10 个里爆 1 个就是胜利。

核心判断：**中文社交环境里，链接传不动，图能传**。所以每个站的核心交付物不是页面，而是一张让人愿意保存、转发的结果卡片。

详见 [docs/00-factory-design.md](docs/00-factory-design.md)。

## 站点路线图

| # | 站点 | 一句话 | 形态 | 状态 |
|---|------|--------|------|------|
| 01 | [人生进度条](docs/01-life-grid.md) | 输入生日，看你的人生还剩多少个格子 | 纯前端 | 🚀 [已上线](https://life-grid-7on.pages.dev)（统计已接入，真机四环境验收待办） |
| 02 | [精神状态检测](docs/02-mental-state-check.md) | 8 道题测出你的班味浓度（系列化模板） | 纯前端 | 📐 设计完成，第二发 |
| 03 | [AI 赛博判官](docs/03-ai-judge.md) | 报上名来，AI 给你写一张毒舌判词 | 轻后端 + LLM | 📐 设计完成，第三发 |
| 04 | [上班回本计算器](docs/04-salary-timer.md) | 实时跳动：这次带薪如厕价值 ¥3.2 | 纯前端 | 💤 备选池 |

### 候选池（已出设计文档，未排期）

| # | 站点 | 评级 | 一句话 |
|---|------|------|--------|
| 06 | [默契度测试](docs/06-tacit-test.md) | S | 答 10 题生成链接发对方，链接被打开结果才存在——自带传播闭环 |
| 07 | [余生清单](docs/07-bucket-list.md) | S | 勾选热爱的事，算出「还能吃 812 次火锅」清单卡 |
| 08 | [赛博求签](docs/08-cyber-fortune.md) | S | 打工人电子黄历，每日一签，复访最强 |
| 09 | [花光首富的钱](docs/09-spend-fortune.md) | A | 给你 3000 亿看你几分钟花完，购物清单卡 |
| 10 | [放假倒计时](docs/10-holiday-countdown.md) | A | 距下个假期 X 天 + 调休真相 + 请假攻略 |
| 11 | [拒绝话术生成器](docs/11-refusal-generator.md) | A | 选场景选语气，一键复制拒绝话术 |
| 12 | [网感年龄测试](docs/12-internet-age-test.md) | A | 测你的互联网精神年龄与成分（02 引擎换皮） |
| 13~19 | [睡眠银行](docs/13-sleep-bank.md) · [道歉信](docs/14-apology-generator.md) · [按住不放](docs/15-hold-button.md) · [一秒钟世界](docs/16-one-second-world.md) · [亲戚称呼](docs/17-kinship-calculator.md) · [年度报告](docs/18-year-report.md) · [MBTI 日历](docs/19-mbti-calendar.md) | B | 简版设计，各自标注触发条件（节令/依赖/练手） |

评级理由与淘汰区见 [docs/05-idea-pool.md](docs/05-idea-pool.md)；各站视觉风格分配（每站一种风格、一处签名元素）见 [docs/00a-style-map.md](docs/00a-style-map.md)。

## 技术栈（规划）

- pnpm monorepo：`packages/shared`（卡片生成 / 埋点 / 基础 UI） + `sites/*`（每个点子一个站）
- Vite + React + TypeScript + Tailwind
- 部署：Cloudflare Pages（免费 `*.pages.dev` 验证，爆款再买域名）
- 统计：umami（访问 / 生成 / 保存卡片 三事件）

## 仓库结构

```
viral-sites/
  docs/            # 设计文档（当前阶段的全部产出）
  packages/        # （待开发）共享能力包
  sites/           # （待开发）各站点
```

当前阶段：**首发站已上线**（工厂基建 `packages/shared` + `sites/life-grid`），其余站点在候选池排队。
