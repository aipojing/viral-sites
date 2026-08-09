import { describe, expect, it } from 'vitest'
import { signSession, verifySession, type SessionPayload } from './auth'

const SECRET = 'test-secret-key'

const payload: SessionPayload = {
  nonce: 'nonce-abc',
  startedAt: 1_000,
  expiresAt: 1_000 + 25 * 60_000,
  deviceType: 'touch',
}

describe('signSession / verifySession', () => {
  it('签名后能原样验回 payload', async () => {
    const token = await signSession(payload, SECRET)
    expect(token.split('.')).toHaveLength(2)
    await expect(verifySession(token, SECRET, 2_000)).resolves.toEqual(payload)
  })

  it('不同 secret 验签失败', async () => {
    const token = await signSession(payload, SECRET)
    await expect(verifySession(token, 'other-secret', 2_000)).rejects.toThrow()
  })

  it('篡改 payload 后验签失败', async () => {
    const token = await signSession(payload, SECRET)
    const [, signature] = token.split('.')
    const forged = Buffer.from(
      JSON.stringify({ ...payload, startedAt: payload.startedAt - 600_000 }),
      'utf8',
    )
      .toString('base64url')
    await expect(verifySession(`${forged}.${signature}`, SECRET, 2_000)).rejects.toThrow()
  })

  it('篡改签名后验签失败', async () => {
    const token = await signSession(payload, SECRET)
    const [body] = token.split('.')
    await expect(verifySession(`${body}.AAAA`, SECRET, 2_000)).rejects.toThrow()
  })

  it('超过 expiresAt 判定过期', async () => {
    const token = await signSession(payload, SECRET)
    await expect(verifySession(token, SECRET, payload.expiresAt + 1)).rejects.toThrow(/expired/)
  })

  it('非法 base64url 或格式错误直接拒绝', async () => {
    await expect(verifySession('!!!.@@@', SECRET, 2_000)).rejects.toThrow()
    await expect(verifySession('only-one-part', SECRET, 2_000)).rejects.toThrow()
    await expect(verifySession('', SECRET, 2_000)).rejects.toThrow()
  })

  it('payload 缺少必要字段或 deviceType 非法时拒绝', async () => {
    const signRaw = (raw: unknown) =>
      signSession(raw as SessionPayload, SECRET).then(async (token) => {
        // 绕过 sign 侧的构造约束，直接伪造 payload 段测试 verify
        const forged = Buffer.from(JSON.stringify(raw), 'utf8').toString('base64url')
        const [, signature] = token.split('.')
        return verifySession(`${forged}.${signature}`, SECRET, 2_000)
      })
    await expect(signRaw({ ...payload, deviceType: 'vr' })).rejects.toThrow()
    await expect(signRaw({ ...payload, nonce: '' })).rejects.toThrow()
  })
})
