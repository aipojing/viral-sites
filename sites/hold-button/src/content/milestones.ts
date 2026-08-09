/**
 * 按住不放唯一的内容资产：25+ 个时长节点文案，前密后疏。
 * 文案只调侃行为本身，同一局节奏固定可预期，每次只出现一句。
 */

export interface HoldMilestone {
  atMs: number
  text: string
}

export interface HoldTitle {
  minMs: number
  title: string
}

export const MILESTONES: readonly HoldMilestone[] = [
  { atMs: 1_000, text: '刚按下去，故事已经开始了。' },
  { atMs: 3_000, text: '三秒。大多数人到这里就松手了。' },
  { atMs: 5_000, text: '你开始好奇自己到底能按多久。' },
  { atMs: 8_000, text: '手指很稳，表情也开始认真了。' },
  { atMs: 10_000, text: '十秒达成，这已经不是误触了。' },
  { atMs: 15_000, text: '你已经在心里给自己倒计时。' },
  { atMs: 20_000, text: '二十秒，你和屏幕都在较劲。' },
  { atMs: 30_000, text: '半分钟，你开始给坚持找理由。' },
  { atMs: 45_000, text: '四十五秒，现在松手好像有点亏。' },
  { atMs: 60_000, text: '一分钟！沉没成本正式上岗。' },
  { atMs: 90_000, text: '九十秒，你开始思考人生。' },
  { atMs: 120_000, text: '两分钟，这已经算一种才艺了。' },
  { atMs: 150_000, text: '两分半，另一只手一定在忙别的。' },
  { atMs: 180_000, text: '三分钟，你和按钮达成了默契。' },
  { atMs: 240_000, text: '四分钟，电量比你先紧张。' },
  { atMs: 300_000, text: '五分钟！研究员认证进行中。' },
  { atMs: 360_000, text: '六分钟，你忘了最初为什么按。' },
  { atMs: 420_000, text: '七分钟，时间在你指尖变慢了。' },
  { atMs: 480_000, text: '八分钟，世界只剩这个按钮。' },
  { atMs: 540_000, text: '九分钟，按钮好像也在坚持。' },
  { atMs: 600_000, text: '十分钟！这是一次正式的坚持。' },
  { atMs: 720_000, text: '十二分钟，传说正在生成。' },
  { atMs: 840_000, text: '十四分钟，你已经是别人的参照物。' },
  { atMs: 960_000, text: '十六分钟，通关在向你招手。' },
  { atMs: 1_080_000, text: '十八分钟，最后冲刺，别回头。' },
  { atMs: 1_200_000, text: '二十分钟，人类通关！' },
]

/** 称号阈值固定，与随当天分布变化的百分位分开 */
export const TITLES: readonly HoldTitle[] = [
  { minMs: 0, title: '路过按了一下' },
  { minMs: 30_000, title: '有点耐心' },
  { minMs: 120_000, title: '按钮研究员' },
  { minMs: 300_000, title: '另一只手生活家' },
  { minMs: 1_200_000, title: '人类通关' },
]

export function milestoneAt(durationMs: number): HoldMilestone {
  let current = MILESTONES[0]
  for (const milestone of MILESTONES) {
    if (milestone.atMs <= durationMs) current = milestone
  }
  return current
}

export function titleAt(durationMs: number): HoldTitle {
  let current = TITLES[0]
  for (const title of TITLES) {
    if (title.minMs <= durationMs) current = title
  }
  return current
}
