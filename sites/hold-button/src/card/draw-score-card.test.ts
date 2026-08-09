import { describe, expect, it } from 'vitest'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { makeScoreCardDraw, type ScoreCardData } from './draw-score-card'

const BASE: ScoreCardData = {
  durationMs: 23_400,
  percentile: 42,
  title: '路过按了一下',
  challengeUrl: 'https://example.com/hold-button/?beat=23400',
}

function textsOf(ctx: ReturnType<typeof makeRecordingCtx>): string[] {
  return (ctx.fillText.mock.calls as unknown[][]).map((call) => String(call[0]))
}

describe('makeScoreCardDraw', () => {
  it('按固定层级绘制：时长 → 百分位 → 称号 → 挑战文案 → 链接', () => {
    const ctx = makeRecordingCtx()
    makeScoreCardDraw(BASE)(ctx as unknown as CanvasRenderingContext2D, { width: 1080, height: 1440 })
    const texts = textsOf(ctx)
    const durationIdx = texts.indexOf('23.4 秒')
    const percentileIdx = texts.findIndex((text) => text.includes('超过今天 42%'))
    const titleIdx = texts.indexOf('路过按了一下')
    const challengeIdx = texts.findIndex((text) => text.includes('你能按得比我久吗'))
    const linkIdx = texts.findIndex((text) => text.includes('beat=23400'))
    expect(durationIdx).toBeGreaterThanOrEqual(0)
    expect(durationIdx).toBeLessThan(percentileIdx)
    expect(percentileIdx).toBeLessThan(titleIdx)
    expect(titleIdx).toBeLessThan(challengeIdx)
    expect(challengeIdx).toBeLessThan(linkIdx)
  })

  it('0 秒与 20 分钟都能绘制，且不出现全球名次', () => {
    for (const durationMs of [0, 20 * 60_000]) {
      const ctx = makeRecordingCtx()
      makeScoreCardDraw({ ...BASE, durationMs, percentile: null })(
        ctx as unknown as CanvasRenderingContext2D,
        { width: 1080, height: 1440 },
      )
      const joined = textsOf(ctx).join('|')
      expect(joined).not.toMatch(/全球第|世界第|第 \d+ 名/)
      expect(ctx.fillText).toHaveBeenCalled()
    }
  })

  it('无网络百分位时展示本地提示', () => {
    const ctx = makeRecordingCtx()
    makeScoreCardDraw({ ...BASE, percentile: null })(ctx as unknown as CanvasRenderingContext2D, {
      width: 1080,
      height: 1440,
    })
    expect(textsOf(ctx).some((text) => text.includes('成绩保留在本机'))).toBe(true)
  })

  it('最长称号不越界：字号随字数缩小', () => {
    const ctx = makeRecordingCtx()
    makeScoreCardDraw({ ...BASE, title: '另一只手生活家' })(ctx as unknown as CanvasRenderingContext2D, {
      width: 1080,
      height: 1440,
    })
    const titleCalls = (ctx.fillText.mock.calls as unknown[][]).filter((call) => call[0] === '另一只手生活家')
    expect(titleCalls.length).toBe(1)
    expect(ctx.font).toMatch(/\d+px/)
  })

  it('品牌条包含站点名与可识别链接', () => {
    const ctx = makeRecordingCtx()
    makeScoreCardDraw(BASE)(ctx as unknown as CanvasRenderingContext2D, { width: 1080, height: 1440 })
    const texts = textsOf(ctx)
    expect(texts.some((text) => text.includes('怪好玩'))).toBe(true)
    expect(texts.some((text) => text.includes('example.com/hold-button/'))).toBe(true)
  })
})
