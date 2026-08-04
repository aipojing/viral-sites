import type { LifeStats } from './life-math'

export interface CopyLine {
  id: string
  text: string
}

const fmt = (n: number) => n.toLocaleString('en-US')

export function buildCopyLines(stats: LifeStats): CopyLine[] {
  if (stats.bonusWeeks > 0) {
    return [
      {
        id: 'bonus',
        text: `你已经多赚了 ${fmt(stats.bonusWeeks)} 个星期，接下来每一格都是奖励`,
      },
    ]
  }
  return [
    { id: 'percent', text: `你的人生已经走过 ${stats.percent}%` },
    { id: 'weeks', text: `从出生到今天，你已经用掉 ${fmt(stats.weeksLived)} 个星期` },
    stats.parentMeetings === 'every-one-counts'
      ? { id: 'parents', text: '和父母的每一次见面，都是赚到' }
      : {
          id: 'parents',
          text: `按一年见 ${stats.meetingsPerYear} 次算，你还能见父母大约 ${fmt(stats.parentMeetings)} 次`,
        },
    { id: 'festivals', text: `这辈子还剩 ${fmt(stats.springFestivals)} 个春节` },
    stats.workdays === 'done'
      ? { id: 'workdays', text: '你已经熬过了所有工作日' }
      : { id: 'workdays', text: `距离 60 岁退休，还有 ${fmt(stats.workdays)} 个工作日` },
    { id: 'blank', text: `剩下的 ${fmt(stats.blankWeeks)} 个格子还是空白，怎么填由你` },
  ]
}

export function pickCardLine(stats: LifeStats): string {
  const lines = buildCopyLines(stats)
  if (stats.bonusWeeks > 0) return lines[0].text
  if (typeof stats.parentMeetings === 'number') {
    return lines.find((l) => l.id === 'parents')!.text
  }
  return lines.find((l) => l.id === 'percent')!.text
}
