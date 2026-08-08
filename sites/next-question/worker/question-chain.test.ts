import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeTestChain, type TestChainHarness } from './durable-object-testkit'
import { ChainError } from './question-chain'
import type { CreateChainInput, CreateChainResult, Slot, SubmitBatonResult } from './types'

const NOW = 1_786_000_000_000
const DAY = 86_400_000
const SLUG = 'abcd1234abcd1234'

function createInput(overrides: Partial<Omit<CreateChainInput, 'installationId'>> = {}) {
  return {
    requestId: crypto.randomUUID(),
    nickname: '甲',
    question: '你最近在想什么？',
    ...overrides,
  }
}

function batonInput(overrides: Partial<{ requestId: string; nickname: string; answer: string; question: string }> = {}) {
  return {
    requestId: crypto.randomUUID(),
    nickname: '乙',
    answer: '在想一个很久没联系的人。',
    question: '那你呢，最近好吗？',
    ...overrides,
  }
}

async function expectChainError(promise: Promise<unknown>, code: string) {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ChainError)
    expect((error as ChainError).code).toBe(code)
    expect((error as Error).message).toBe(code)
    return
  }
  throw new Error(`期望抛出 ChainError(${code})，但没有抛出`)
}

async function startChain(): Promise<TestChainHarness & { created: CreateChainResult }> {
  const harness = makeTestChain()
  const created = await harness.chain.create(SLUG, createInput(), NOW)
  return { ...harness, created }
}

// 依次提交第 2～targetSlot 席，返回最近一次提交结果与沿途 token。
async function advanceTo(
  harness: TestChainHarness,
  targetSlot: Slot,
  startToken: string,
  startAt = NOW + 60_000,
): Promise<SubmitBatonResult> {
  let token = startToken
  let result: SubmitBatonResult | null = null
  for (let slot = 2 as Slot; slot <= targetSlot; slot = (slot + 1) as Slot) {
    result = await harness.chain.submitBaton(
      token,
      batonInput({ nickname: `第${slot}席`, question: `第${slot}席留下的问题` }),
      startAt + slot * 60_000,
    )
    if (slot === targetSlot) return result
    if (result.nextBatonToken === null) throw new Error('不应在到达目标席位前进入 returned')
    token = result.nextBatonToken
  }
  throw new Error('targetSlot 必须 >= 2')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('NextQuestionChain create', () => {
  it('首次创建写入第 1 席与 Q1，状态 waiting 且下一席是 2', async () => {
    const { chain, ctx, created } = await startChain()
    expect(created.ownerToken).not.toBe(created.batonToken)
    expect(created.chain).toEqual({
      slug: SLUG,
      status: 'waiting',
      nextSlot: 2,
      entries: [
        {
          slot: 1,
          nickname: '甲',
          answer: null,
          question: '你最近在想什么？',
          submittedAt: NOW,
          redacted: false,
        },
      ],
      createdAt: NOW,
      updatedAt: NOW,
      expiresAt: NOW + 7 * DAY,
    })
    expect(ctx.scheduledAlarm()).toBe(NOW + 7 * DAY)
    expect(await chain.getPublic(NOW + 1)).toEqual(created.chain)
  })

  it('相同 requestId 重复创建返回首次结果，不覆盖首次内容', async () => {
    const harness = makeTestChain()
    const input = createInput()
    const first = await harness.chain.create(SLUG, input, NOW)
    const replay = await harness.chain.create(
      SLUG,
      { ...input, nickname: '不速之客', question: '另一个问题' },
      NOW + 1,
    )
    expect(replay).toEqual(first)
    const publicChain = await harness.chain.getPublic(NOW + 1)
    expect(publicChain?.entries[0]?.nickname).toBe('甲')
    expect(publicChain?.entries[0]?.question).toBe('你最近在想什么？')
  })
})

describe('NextQuestionChain submitBaton', () => {
  it('第 2～5 席逐席插入一行并推进下一席', async () => {
    const harness = await startChain()
    let token = harness.created.batonToken
    for (const slot of [2, 3, 4, 5] as const) {
      const result = await harness.chain.submitBaton(
        token,
        batonInput({ nickname: `第${slot}席`, question: `第${slot}席的问题` }),
        NOW + slot * 1000,
      )
      expect(result.chain.status).toBe('waiting')
      expect(result.chain.nextSlot).toBe(slot + 1)
      expect(result.chain.entries).toHaveLength(slot)
      expect(result.participantToken).not.toBe(result.nextBatonToken)
      expect(result.nextBatonToken).not.toBeNull()
      token = result.nextBatonToken as string
    }
  })

  it('第 6 席提交后进入 returned：nextSlot=1 且没有下一枚接棒 token', async () => {
    const harness = await startChain()
    const slot5 = await advanceTo(harness, 5, harness.created.batonToken)
    const slot6 = await harness.chain.submitBaton(
      slot6Token(slot5),
      batonInput({ nickname: '第六席', question: '回到起点的问题' }),
      NOW + 7000,
    )
    expect(slot6.chain.status).toBe('returned')
    expect(slot6.chain.nextSlot).toBe(1)
    expect(slot6.nextBatonToken).toBeNull()
    expect(slot6.chain.entries).toHaveLength(6)
  })

  it('完成六席后 owner 回答 Q6 进入 completed，保留 90 天', async () => {
    const harness = await startChain()
    await advanceTo(harness, 6, harness.created.batonToken)
    const closeAt = NOW + 1000
    const closed = await harness.chain.close(
      harness.created.ownerToken,
      { requestId: crypto.randomUUID(), answer: '我想，值得。' },
      closeAt,
    )
    expect(closed.status).toBe('completed')
    expect(closed.nextSlot).toBeNull()
    const first = closed.entries.find((entry) => entry.slot === 1)
    expect(first?.answer).toBe('我想，值得。')
    expect(closed.expiresAt).toBe(closeAt + 90 * DAY)
    expect(harness.ctx.scheduledAlarm()).toBe(closeAt + 90 * DAY)
  })

  it('相同 requestId 重放返回原幂等结果；换 requestId 重放得到 chain_advanced', async () => {
    const harness = await startChain()
    const input = batonInput()
    const first = await harness.chain.submitBaton(harness.created.batonToken, input, NOW + 1000)
    const replay = await harness.chain.submitBaton(harness.created.batonToken, input, NOW + 2000)
    expect(replay).toEqual(first)

    await expectChainError(
      harness.chain.submitBaton(harness.created.batonToken, batonInput(), NOW + 3000),
      'chain_advanced',
    )
    const publicChain = await harness.chain.getPublic(NOW + 3000)
    expect(publicChain?.entries).toHaveLength(2)
  })

  it('同一席并发两个不同 requestId，恰好一个成功，数据库只前进一次', async () => {
    const harness = await startChain()
    const results = await Promise.allSettled([
      harness.chain.submitBaton(
        harness.created.batonToken,
        batonInput({ requestId: crypto.randomUUID(), nickname: '抢先者' }),
        NOW + 1000,
      ),
      harness.chain.submitBaton(
        harness.created.batonToken,
        batonInput({ requestId: crypto.randomUUID(), nickname: '迟到者' }),
        NOW + 1000,
      ),
    ])
    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    const rejected = results.filter((result) => result.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ChainError)
    expect(((rejected[0] as PromiseRejectedResult).reason as ChainError).code).toBe('chain_advanced')

    // 谁先抢到由调度决定；不变量是数据库恰好落一次，且与赢家的写入一致
    const winner = (fulfilled[0] as PromiseFulfilledResult<SubmitBatonResult>).value
    const publicChain = await harness.chain.getPublic(NOW + 2000)
    expect(publicChain?.entries).toHaveLength(2)
    expect(publicChain?.nextSlot).toBe(3)
    expect(publicChain?.entries[1]?.nickname).toBe(winner.chain.entries[1]?.nickname)
    expect(['抢先者', '迟到者']).toContain(publicChain?.entries[1]?.nickname)
  })

  it('错误 token 返回 invalid_token，过期返回 chain_expired，非法状态返回 chain_advanced', async () => {
    const harness = await startChain()
    await expectChainError(
      harness.chain.submitBaton('n'.repeat(43), batonInput(), NOW + 1000),
      'invalid_token',
    )
    await expectChainError(
      harness.chain.submitBaton('short-token', batonInput(), NOW + 1000),
      'invalid_token',
    )

    await expectChainError(
      harness.chain.submitBaton(harness.created.batonToken, batonInput(), NOW + 8 * DAY),
      'chain_expired',
    )

    const completed = makeTestChain()
    const created = await completed.chain.create(SLUG, createInput(), NOW)
    await advanceTo(completed, 6, created.batonToken)
    await completed.chain.close(
      created.ownerToken,
      { requestId: crypto.randomUUID(), answer: '收尾回答。' },
      NOW + 1000,
    )
    await expectChainError(
      completed.chain.submitBaton(created.batonToken, batonInput(), NOW + 2000),
      'chain_advanced',
    )
  })
})

describe('NextQuestionChain redact', () => {
  it('撤回历史席位内容：链条继续，席位被打码，旧幂等响应被清空', async () => {
    const harness = await startChain()
    const slot2 = await harness.chain.submitBaton(
      harness.created.batonToken,
      batonInput({ nickname: '第二席' }),
      NOW + 1000,
    )
    await harness.chain.submitBaton(
      slot2.nextBatonToken as string,
      batonInput({ nickname: '第三席' }),
      NOW + 2000,
    )

    const after = await harness.chain.redact(slot2.participantToken, 2, crypto.randomUUID(), NOW + 3000)
    expect(after.status).toBe('waiting')
    expect(after.nextSlot).toBe(4)
    const redacted = after.entries.find((entry) => entry.slot === 2)
    expect(redacted).toEqual({
      slot: 2,
      nickname: '',
      answer: null,
      question: '',
      submittedAt: NOW + 1000,
      redacted: true,
    })

    // 用第三席提交时的 requestId 重试：幂等缓存已清空，token 也已消费，只能得到 409
    await expectChainError(
      harness.chain.submitBaton(slot2.nextBatonToken as string, batonInput(), NOW + 4000),
      'chain_advanced',
    )
  })

  it('撤回当前尚未被回答的问题：进入 cancelled，当前接棒 token 失效', async () => {
    const harness = await startChain()
    const slot2 = await harness.chain.submitBaton(
      harness.created.batonToken,
      batonInput({ nickname: '第二席' }),
      NOW + 1000,
    )
    // 当前等待第 3 席回答第 2 席提出的问题
    const after = await harness.chain.redact(slot2.participantToken, 2, crypto.randomUUID(), NOW + 2000)
    expect(after.status).toBe('cancelled')
    expect(after.nextSlot).toBeNull()

    await expectChainError(
      harness.chain.submitBaton(slot2.nextBatonToken as string, batonInput(), NOW + 3000),
      'chain_cancelled',
    )
  })

  it('returned 状态下撤回第 6 席问题同样进入 cancelled', async () => {
    const harness = await startChain()
    const slot6 = await advanceTo(harness, 6, harness.created.batonToken)
    const after = await harness.chain.redact(slot6.participantToken, 6, crypto.randomUUID(), NOW + 9000)
    expect(after.status).toBe('cancelled')
    await expectChainError(
      harness.chain.close(harness.created.ownerToken, { requestId: crypto.randomUUID(), answer: '收尾' }, NOW + 9500),
      'chain_cancelled',
    )
  })

  it('发起者可用 owner token 撤回第 1 席；席位 token 不能越权撤回别人的席位', async () => {
    const harness = await startChain()
    await expectChainError(
      harness.chain.redact(harness.created.batonToken, 1, crypto.randomUUID(), NOW + 1000),
      'invalid_token',
    )
    const after = await harness.chain.redact(
      harness.created.ownerToken,
      1,
      crypto.randomUUID(),
      NOW + 1000,
    )
    expect(after.status).toBe('cancelled')
  })

  it('撤回幂等：相同 requestId 返回首次结果', async () => {
    const harness = await startChain()
    const requestId = crypto.randomUUID()
    const first = await harness.chain.redact(harness.created.ownerToken, 1, requestId, NOW + 1000)
    const replay = await harness.chain.redact(harness.created.ownerToken, 1, requestId, NOW + 2000)
    expect(replay).toEqual(first)
  })
})

describe('NextQuestionChain deleteChain', () => {
  it('删除清空内容与密钥，只保留不含用户内容的 tombstone，旧 token 永久失效', async () => {
    const harness = await startChain()
    const slot2 = await harness.chain.submitBaton(
      harness.created.batonToken,
      batonInput({ nickname: '第二席' }),
      NOW + 1000,
    )
    await harness.chain.deleteChain(harness.created.ownerToken, crypto.randomUUID(), NOW + 2000)

    const tombstone = await harness.chain.getPublic(NOW + 3000)
    expect(tombstone?.status).toBe('deleted')
    expect(tombstone?.entries).toEqual([])

    await expectChainError(
      harness.chain.submitBaton(slot2.nextBatonToken as string, batonInput(), NOW + 4000),
      'chain_not_found',
    )
    await expectChainError(
      harness.chain.close(harness.created.ownerToken, { requestId: crypto.randomUUID(), answer: '收尾' }, NOW + 4000),
      'chain_not_found',
    )
    // 重复删除是幂等无操作
    await harness.chain.deleteChain(harness.created.ownerToken, crypto.randomUUID(), NOW + 5000)
  })

  it('非 owner token 不能删除', async () => {
    const harness = await startChain()
    await expectChainError(
      harness.chain.deleteChain(harness.created.batonToken, crypto.randomUUID(), NOW + 1000),
      'invalid_token',
    )
  })
})

describe('NextQuestionChain alarm', () => {
  it('未完成链 7 天后清空内容并留下 expired tombstone', async () => {
    const harness = await startChain()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW + 7 * DAY + 1))
    await harness.chain.alarm()
    vi.useRealTimers()

    const publicChain = await harness.chain.getPublic(NOW + 7 * DAY + 1)
    expect(publicChain?.status).toBe('expired')
    expect(publicChain?.entries).toEqual([])
    await expectChainError(
      harness.chain.submitBaton(harness.created.batonToken, batonInput(), NOW + 7 * DAY + 2),
      'chain_expired',
    )
  })

  it('完成链 90 天后才清理；提前触发的 alarm 只改约不改内容', async () => {
    const harness = await startChain()
    await advanceTo(harness, 6, harness.created.batonToken)
    const closed = await harness.chain.close(
      harness.created.ownerToken,
      { requestId: crypto.randomUUID(), answer: '值得。' },
      NOW + 1000,
    )
    expect(closed.status).toBe('completed')

    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW + 10 * DAY))
    await harness.chain.alarm()
    vi.useRealTimers()
    const early = await harness.chain.getPublic(NOW + 10 * DAY)
    expect(early?.status).toBe('completed')
    expect(early?.entries).toHaveLength(6)
    expect(harness.ctx.scheduledAlarm()).toBe(NOW + 1000 + 90 * DAY)

    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW + 1000 + 90 * DAY + 1))
    await harness.chain.alarm()
    vi.useRealTimers()
    const late = await harness.chain.getPublic(NOW + 1000 + 90 * DAY + 1)
    expect(late?.status).toBe('expired')
    expect(late?.entries).toEqual([])
  })

  it('未到期前读取也按过期处理，不再返回用户内容', async () => {
    const harness = await startChain()
    const publicChain = await harness.chain.getPublic(NOW + 8 * DAY)
    expect(publicChain?.status).toBe('expired')
    expect(publicChain?.entries).toEqual([])
  })
})

function slot6Token(slot5: SubmitBatonResult): string {
  if (slot5.nextBatonToken === null) throw new Error('第 5 席后必须仍有接棒 token')
  return slot5.nextBatonToken
}

describe('NextQuestionChain 隐私边界', () => {
  it('公开视图永不包含 capability token 字段', async () => {
    const harness = await startChain()
    const json = JSON.stringify(await harness.chain.getPublic(NOW + 1))
    expect(json).not.toContain(harness.created.ownerToken)
    expect(json).not.toContain(harness.created.batonToken)
    expect(json).not.toContain('Token')
  })

  it('getPublic 对不存在的链返回 null', async () => {
    const harness = makeTestChain()
    expect(await harness.chain.getPublic(NOW)).toBeNull()
  })
})
