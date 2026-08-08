import { describe, expect, it } from 'vitest'
import {
  InputError,
  normalizeAnswer,
  normalizeNickname,
  normalizeQuestion,
  parseCloseChainInput,
  parseCreateChainInput,
  parseSubmitBatonInput,
} from './validation'

function expectInputError(fn: () => unknown, code: InputError['code']) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(InputError)
    expect((error as InputError).code).toBe(code)
    // 错误信息只允许是稳定 code，绝不回显用户原文
    expect((error as Error).message).toBe(code)
    return
  }
  throw new Error(`期望抛出 InputError(${code})，但没有抛出`)
}

describe('normalizeNickname', () => {
  it('NFC 归一并去除首尾空白', () => {
    expect(normalizeNickname('  阿杰  ')).toBe('阿杰')
    // é 的分解形式（e + 组合重音）归一为合成形式
    expect(normalizeNickname('cate\u0301')).toBe('cat\u00e9')
  })

  it('按 Unicode code points 计数，emoji 不劈开', () => {
    expect(normalizeNickname('甲乙丙丁戊己庚辛')).toBe('甲乙丙丁戊己庚辛')
    expect(normalizeNickname('😀一二三四五六')).toBe('😀一二三四五六')
    expectInputError(() => normalizeNickname('一二三四五六七八九'), 'too_long')
  })

  it('空昵称与纯空白昵称被拒绝', () => {
    expectInputError(() => normalizeNickname(''), 'required')
    expectInputError(() => normalizeNickname('   '), 'required')
  })

  it('拒绝换行与控制字符', () => {
    expectInputError(() => normalizeNickname('阿\n杰'), 'invalid_character')
    expectInputError(() => normalizeNickname('阿\u0000杰'), 'invalid_character')
    expectInputError(() => normalizeNickname('阿\u001b杰'), 'invalid_character')
  })

  it('拒绝导流内容', () => {
    expectInputError(() => normalizeNickname('https://a.b'), 'contact_not_allowed')
    expectInputError(() => normalizeNickname('加我wx:abc@x.com'), 'contact_not_allowed')
  })
})

describe('normalizeQuestion', () => {
  it('允许 1～60 个 code points 并归一空白', () => {
    expect(normalizeQuestion('  你最近一次哭是因为什么？  ')).toBe('你最近一次哭是因为什么？')
    expect(normalizeQuestion('问'.repeat(60))).toBe('问'.repeat(60))
    expectInputError(() => normalizeQuestion('问'.repeat(61)), 'too_long')
    expectInputError(() => normalizeQuestion(''), 'required')
  })

  it('拒绝换行与控制字符', () => {
    expectInputError(() => normalizeQuestion('第一行\n第二行'), 'invalid_character')
    expectInputError(() => normalizeQuestion('问题\u007f'), 'invalid_character')
  })

  it('拒绝 URL、www、邮箱与连续 11 位手机号', () => {
    expectInputError(() => normalizeQuestion('https://example.com'), 'contact_not_allowed')
    expectInputError(() => normalizeQuestion('http://example.com'), 'contact_not_allowed')
    expectInputError(() => normalizeQuestion('看看 www.example.com'), 'contact_not_allowed')
    expectInputError(() => normalizeQuestion('写信给 a.b+x@example.com.cn'), 'contact_not_allowed')
    expectInputError(() => normalizeQuestion('我的号码13800138000'), 'contact_not_allowed')
  })
})

describe('normalizeAnswer', () => {
  it('允许 1～200 个 code points', () => {
    expect(normalizeAnswer('  没什么特别的。  ')).toBe('没什么特别的。')
    expect(normalizeAnswer('答'.repeat(200))).toBe('答'.repeat(200))
    expectInputError(() => normalizeAnswer('答'.repeat(201)), 'too_long')
    expectInputError(() => normalizeAnswer(''), 'required')
  })

  it('CRLF 归一为 LF，最多保留 3 行', () => {
    expect(normalizeAnswer('第一行\r\n第二行')).toBe('第一行\n第二行')
    expect(normalizeAnswer('一\n二\n三\n四\n五')).toBe('一\n二\n三')
  })

  it('拒绝控制字符与导流内容', () => {
    expectInputError(() => normalizeAnswer('答案\u0000'), 'invalid_character')
    expectInputError(() => normalizeAnswer('13800138000'), 'contact_not_allowed')
    expectInputError(() => normalizeAnswer('详见 https://example.com'), 'contact_not_allowed')
  })
})

describe('parseCreateChainInput', () => {
  const validRequestId = crypto.randomUUID()
  const validInstallationId = crypto.randomUUID()

  it('通过合法输入并归一文本', () => {
    const input = parseCreateChainInput({
      requestId: validRequestId,
      installationId: validInstallationId,
      nickname: '  甲  ',
      question: '  你最近在想什么？  ',
    })
    expect(input).toEqual({
      requestId: validRequestId,
      installationId: validInstallationId,
      nickname: '甲',
      question: '你最近在想什么？',
    })
  })

  it('拒绝非 RFC 4122 的 requestId 与 installationId', () => {
    expectInputError(
      () =>
        parseCreateChainInput({
          requestId: 'not-a-uuid',
          installationId: validInstallationId,
          nickname: '甲',
          question: '你好吗？',
        }),
      'invalid_character',
    )
    expectInputError(
      () =>
        parseCreateChainInput({
          requestId: validRequestId,
          installationId: '',
          nickname: '甲',
          question: '你好吗？',
        }),
      'required',
    )
  })

  it('文本错误沿用验证 code', () => {
    expectInputError(
      () =>
        parseCreateChainInput({
          requestId: validRequestId,
          installationId: validInstallationId,
          nickname: '超过八个字的昵称不可以',
          question: '你好吗？',
        }),
      'too_long',
    )
  })
})

describe('parseSubmitBatonInput', () => {
  it('要求 requestId、昵称、回答与下一问全部合法', () => {
    const input = parseSubmitBatonInput({
      requestId: crypto.randomUUID(),
      nickname: '乙',
      answer: '最近在想一个人。',
      question: '那你呢？',
    })
    expect(input.nickname).toBe('乙')
    expectInputError(
      () =>
        parseSubmitBatonInput({
          requestId: crypto.randomUUID(),
          nickname: '乙',
          answer: '',
          question: '那你呢？',
        }),
      'required',
    )
  })
})

describe('parseCloseChainInput', () => {
  it('要求 requestId 与回答合法', () => {
    const input = parseCloseChainInput({
      requestId: crypto.randomUUID(),
      answer: '  我想，是值得的。  ',
    })
    expect(input.answer).toBe('我想，是值得的。')
    expectInputError(
      () => parseCloseChainInput({ requestId: 'x'.repeat(36), answer: '回答' }),
      'invalid_character',
    )
  })
})
