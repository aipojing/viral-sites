# Design QA — 网感年龄下载卡精简

- source visual truth: `/var/folders/8d/gjz85h8j0lggr6nny7xnvv6h0000gn/T/codex-clipboard-zwv7CZ.png`
- implementation screenshot: `/Users/ahs/Downloads/wang-gan-exam (1).png`
- page screenshots: `artifacts/design-audit-2026-08-05/15-internet-age-landing-stable.png`、`16-internet-age-result-stable.png`
- viewport: 390 × 844 CSS px（页面）；1080 × 1440 px（下载卡）
- source dimensions: 1516 × 2142 px，包含 macOS 预览工具栏；其中卡片主体为 3:4
- implementation dimensions: 1080 × 1440 px，1× Canvas 导出
- state: 测试结果页与下载成绩单；两张卡的数据答案不同，仅比较固定文案、布局和成分条视觉

## Full-view comparison

修改前的下载卡在标题下方、年龄下方各有一行解释性文案，主结果被稀释；成分条为直角矩形，与页面的圆角胶囊条不一致。修改后删掉了“满分 100 · 不设及格线 · 禁止代考”“岁 · 本卷判定：”，保留年龄数字、主成分、成分比例和锐评，信息层级更直接。

## Focused comparison

- 字体与层级：标题、年龄数字、主成分、成分列表层级清楚，没有新增字体或异常换行。
- 间距与节奏：删除两行冗余文案后，年龄区留白均衡，成分区和锐评区未发生溢出。
- 颜色：沿用页面的粉、蓝、黄等维度颜色及浅灰轨道。
- 成分条：轨道与有效占比均为全圆角；0% 只显示灰色轨道，与页面一致。
- 图片资产：该卡为纯排版和数据图形，没有缺失图片资产。
- 文案：用户指出的三段冗余文案均已移除。

## Comparison history

1. P1：下载卡与页面进度条视觉不一致；已把直角矩形改为圆角轨道和圆角占比条，实际下载文件复核通过。
2. P1：年龄单位和考试包装文案抢占视觉；已删除，并同步清理结果页相同前缀。
3. P2：网感首屏、网感结果页和班味结果页存在无决策价值的考试/样本信息；已精简并重新截图检查。

## Browser verification

- 网感年龄：首屏 → 8 题 → 结果页 → 保存成绩单已完成。
- 班味检测：首屏 → 8 题 → 结果页 → 保存检测报告已完成。
- 390 × 844 移动端页面无横向溢出，稳定动画后布局正常。
- 控制台 error/warn：0。

final result: passed
