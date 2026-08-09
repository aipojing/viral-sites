import type { DrawFn } from '@viral/shared'
import { formatDuration } from '../lib/format'

export interface ScoreCardData {
  durationMs: number
  percentile: number | null
  title: string
  challengeUrl: string
}

/** 深空蓝 / 霓虹黄，与页面主题一致；卡片不展示全球名次 */
const BG = '#0b1026'
const PANEL = '#131a3a'
const BORDER = '#2a3566'
const INK = '#f4f6ff'
const INK_SOFT = '#8b93b8'
const ACCENT = '#ffe600'
const FONT = '-apple-system, "PingFang SC", "Noto Sans SC", sans-serif'
const BRAND_TEXT = '按住不放挑战 · 怪好玩'

export function makeScoreCardDraw(data: ScoreCardData): DrawFn {
  return (ctx, size) => {
    // 深空底 + 双层像素边框
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.lineWidth = 8
    ctx.strokeStyle = BORDER
    ctx.strokeRect(40, 40, size.width - 80, size.height - 80)
    ctx.lineWidth = 3
    ctx.strokeStyle = ACCENT
    ctx.strokeRect(58, 58, size.width - 116, size.height - 116)

    ctx.textAlign = 'center'

    // 顶部标签
    ctx.fillStyle = ACCENT
    ctx.font = `700 34px ${FONT}`
    ctx.fillText('HOLD · 本轮成绩', size.width / 2, 168)

    // 时长大数字：最长的「20 分 00 秒」按字数缩小
    const durationText = formatDuration(data.durationMs)
    const durationChars = Array.from(durationText).length
    ctx.fillStyle = INK
    ctx.font = `900 ${durationChars <= 6 ? 170 : 128}px ${FONT}`
    ctx.fillText(durationText, size.width / 2, 420)

    // 百分位或本地提示
    ctx.fillStyle = INK_SOFT
    ctx.font = `500 40px ${FONT}`
    const percentileText =
      data.percentile !== null ? `超过今天 ${data.percentile}% 的参与者` : '成绩保留在本机 · 下次再战'
    ctx.fillText(percentileText, size.width / 2, 520)

    // 称号：最长 7 字，按字数缩放保证不越界
    const titleChars = Array.from(data.title).length
    const titleFont = titleChars <= 4 ? 96 : titleChars <= 6 ? 82 : 70
    ctx.fillStyle = ACCENT
    ctx.font = `900 ${titleFont}px ${FONT}`
    ctx.fillText(data.title, size.width / 2, 680)

    // 分隔像素点
    ctx.fillStyle = ACCENT
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(size.width / 2 - 96 + i * 44, 760, 16, 16)
    }

    // 挑战文案
    ctx.fillStyle = INK
    ctx.font = `700 56px ${FONT}`
    ctx.fillText('你能按得比我久吗？', size.width / 2, 900)

    // 链接面板：可识别的挑战链接
    ctx.fillStyle = PANEL
    ctx.fillRect(120, 990, size.width - 240, 190)
    ctx.lineWidth = 3
    ctx.strokeStyle = BORDER
    ctx.strokeRect(120, 990, size.width - 240, 190)
    ctx.fillStyle = INK_SOFT
    ctx.font = `400 30px ${FONT}`
    ctx.fillText('把这条链接发给朋友', size.width / 2, 1050)
    ctx.fillStyle = INK
    ctx.font = `600 34px ${FONT}`
    ctx.fillText(data.challengeUrl, size.width / 2, 1120)

    // 品牌条
    ctx.fillStyle = INK_SOFT
    ctx.font = `500 34px ${FONT}`
    ctx.fillText(BRAND_TEXT, size.width / 2, size.height - 110)
  }
}
