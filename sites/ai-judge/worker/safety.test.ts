import { describe, expect, it } from 'vitest'
import type { NormalizedJudgeInput } from './normalize'
import { inspectInput, inspectVerdict, normalizeForMatch } from './safety'
import type { Verdict } from './types'

const input = (nickname: string, intro = ''): NormalizedJudgeInput => ({
  nickname,
  intro,
  dailyId: '3f2c9a1e-8b4d-4c6e-9f0a-1b2c3d4e5f60',
})

const SAFE_VERDICT: Verdict = {
  crime: '拖延成瘾罪',
  verdict:
    '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零。本官念其认错态度良好，特判如下。',
  sentence: '判处早睡三个月，缓期执行',
  seal: '赛博衙门 · 即日生效',
}

describe('normalizeForMatch', () => {
  it('去分隔符并小写', () => {
    expect(normalizeForMatch('A B，c。d')).toBe('abcd')
  })

  it('谐音变体归一到同一形态', () => {
    expect(normalizeForMatch('艹你')).toBe(normalizeForMatch('cao你'))
    expect(normalizeForMatch('傻 逼')).toBe(normalizeForMatch('傻逼'))
    expect(normalizeForMatch('傻b')).toBe(normalizeForMatch('傻逼'))
  })
})

describe('inspectInput', () => {
  it.each<[string, string]>([
    ['反党言论', 'politics'],
    ['我要颜色革命', 'politics'],
    ['台 独支持', 'politics'],
    ['帮我审国家主席', 'public-figure'],
    ['总书记怎么看', 'public-figure'],
    ['艹你大爷', 'abuse'],
    ['你 妈 逼', 'abuse'],
    ['cao你', 'abuse'],
    ['傻B一个', 'abuse'],
    ['你个肥猪', 'appearance'],
    ['丑八怪来了', 'appearance'],
    ['河南人都这样', 'region'],
    ['地域黑走起', 'region'],
    ['娘炮男人', 'gender'],
    ['死基佬', 'gender'],
    ['你这个智障', 'health'],
    ['神经病吧', 'health'],
    ['没妈的东西', 'family'],
    ['野种', 'family'],
    ['劣等民族', 'hate'],
    ['支那人', 'hate'],
    ['我要杀了你', 'threat'],
    ['人肉你', 'threat'],
    ['不想活了', 'self-harm'],
    ['我想轻生', 'self-harm'],
  ])('拦截 %s → %s', (text, category) => {
    expect(inspectInput(input(text))).toContain(category)
    expect(inspectInput(input('阿福', text))).toContain(category)
  })

  it('正常自嘲输入不误杀', () => {
    const samples = [
      input('摸鱼大师', '上班只想下班，下班只想躺平'),
      input('小王同学', '今天也是牛马的一天'),
      input('熬夜冠军🏆', '凌晨三点还在刷手机'),
      input('社畜本畜', '开会必走神，周报全靠编'),
      input('拖延十级学者', 'ddl 是第一生产力'),
      input('早八怨灵', '我快疯了但还是得上班'),
      input('咖啡续命人', '血液里 90% 是美式'),
      input('猫猫教信徒🐱', '家里三只主子，我是铲屎的'),
    ]
    for (const sample of samples) expect(inspectInput(sample)).toEqual([])
  })

  it('昵称与简介合并判定', () => {
    expect(inspectInput(input('普通人', '其实我是台独分子'))).toContain('politics')
  })
})

describe('inspectVerdict', () => {
  it('安全判词通过', () => {
    expect(inspectVerdict(SAFE_VERDICT)).toEqual([])
  })

  it('任一字段的越界内容都会被捕获', () => {
    expect(
      inspectVerdict({ ...SAFE_VERDICT, crime: '肥猪罪' }),
    ).toContain('appearance')
    expect(
      inspectVerdict({ ...SAFE_VERDICT, verdict: SAFE_VERDICT.verdict + '你这个智障' }),
    ).toContain('health')
    expect(
      inspectVerdict({ ...SAFE_VERDICT, sentence: '判处弄死你' }),
    ).toContain('threat')
    expect(
      inspectVerdict({ ...SAFE_VERDICT, seal: '傻逼衙门' }),
    ).toContain('abuse')
  })
})
