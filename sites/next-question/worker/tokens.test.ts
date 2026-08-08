import { describe, expect, it } from 'vitest'
import {
  deriveCapability,
  equalCapability,
  isValidTokenFormat,
  randomSecret,
} from './tokens'

const BASE64_URL = /^[A-Za-z0-9_-]+$/

function base64UrlByteLength(token: string): number {
  const padded = token + '='.repeat((4 - (token.length % 4)) % 4)
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return binary.length
}

describe('randomSecret', () => {
  it('生成 32 字节随机 secret，字符集不含 +、/、=', () => {
    const secret = randomSecret()
    expect(secret).toMatch(BASE64_URL)
    expect(secret).not.toMatch(/[+/=]/)
    expect(base64UrlByteLength(secret)).toBe(32)
  })

  it('两次生成互不相同', () => {
    expect(randomSecret()).not.toBe(randomSecret())
  })
})

describe('deriveCapability', () => {
  it('同一 secret + purpose 稳定派生，输出为 base64url', async () => {
    const secret = randomSecret()
    const first = await deriveCapability(secret, 'owner')
    const second = await deriveCapability(secret, 'owner')
    expect(first).toBe(second)
    expect(first).toMatch(BASE64_URL)
    expect(first).not.toMatch(/[+/=]/)
  })

  it('purpose 或 secret 不同时结果不同', async () => {
    const secret = randomSecret()
    const owner = await deriveCapability(secret, 'owner')
    const baton2 = await deriveCapability(secret, 'baton:2')
    const otherOwner = await deriveCapability(randomSecret(), 'owner')
    expect(owner).not.toBe(baton2)
    expect(owner).not.toBe(otherOwner)
  })
})

describe('equalCapability', () => {
  it('常量时间比较：相等为 true，任何差异为 false', async () => {
    const secret = randomSecret()
    const token = await deriveCapability(secret, 'baton:3')
    expect(equalCapability(token, token)).toBe(true)
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')
    expect(equalCapability(tampered, token)).toBe(false)
    expect(equalCapability(token.slice(0, -1), token)).toBe(false)
    expect(equalCapability('', token)).toBe(false)
  })
})

describe('isValidTokenFormat', () => {
  it('只接受 43 位 base64url token', async () => {
    const token = await deriveCapability(randomSecret(), 'owner')
    expect(token.length).toBe(43)
    expect(isValidTokenFormat(token)).toBe(true)
    expect(isValidTokenFormat(token.slice(1))).toBe(false)
    expect(isValidTokenFormat(token + 'a')).toBe(false)
    expect(isValidTokenFormat('+' + token.slice(1))).toBe(false)
    expect(isValidTokenFormat('/' + token.slice(1))).toBe(false)
    expect(isValidTokenFormat(token.slice(0, -1) + '=')).toBe(false)
    expect(isValidTokenFormat('')).toBe(false)
  })
})
