import { describe, expect, it } from 'vitest'
import { CARD_SIZE } from '@viral/shared'
import { makeRecordingCtx } from '../../test/canvas-stub'
import { makeLetterCardDraw } from './draw-letter-card'

function drawnTexts(ctx: ReturnType<typeof makeRecordingCtx>): string[] {
  return ctx.fillText.mock.calls.map((call) => String(call[0]))
}

describe('makeLetterCardDraw', () => {
  it('信纸卡包含抬头类型与正文换行', () => {
    const ctx = makeRecordingCtx()
    makeLetterCardDraw({
      typeLabel: '请假消息',
      tone: 'wenyan',
      text: '启者：偶染微恙，乞假一日。',
      includeAddressee: false,
    })(ctx as never, CARD_SIZE)
    const texts = drawnTexts(ctx)
    expect(texts).toContain('请假消息')
    expect(texts.some((t) => t.includes('偶染微恙'))).toBe(true)
  })

  it('最长 220 字正文换行后不越界', () => {
    const ctx = makeRecordingCtx()
    makeLetterCardDraw({
      typeLabel: '道歉',
      tone: 'fafeng',
      text: '长'.repeat(220),
      includeAddressee: false,
    })(ctx as never, CARD_SIZE)
    const ys = ctx.fillText.mock.calls.map((call) => Number(call[2]))
    expect(Math.max(...ys)).toBeLessThan(CARD_SIZE.height - 90)
  })

  it('卡片不出现公章、签名、证明类字样', () => {
    const ctx = makeRecordingCtx()
    makeLetterCardDraw({
      typeLabel: '请假消息',
      tone: 'wenyan',
      text: '世界和平。',
      includeAddressee: true,
    })(ctx as never, CARD_SIZE)
    const joined = drawnTexts(ctx).join('')
    expect(joined).not.toMatch(/公章|签名|证明|诊断/)
  })

  it('勾选保留称呼时绘制抬头行，否则不绘制', () => {
    const withAddressee = makeRecordingCtx()
    makeLetterCardDraw({
      typeLabel: '道歉',
      tone: 'fafeng',
      text: '测试正文。',
      includeAddressee: true,
    })(withAddressee as never, CARD_SIZE)
    expect(drawnTexts(withAddressee).some((t) => t.includes('致'))).toBe(true)

    const without = makeRecordingCtx()
    makeLetterCardDraw({
      typeLabel: '道歉',
      tone: 'fafeng',
      text: '测试正文。',
      includeAddressee: false,
    })(without as never, CARD_SIZE)
    expect(drawnTexts(without).some((t) => t.includes('致'))).toBe(false)
  })
})
