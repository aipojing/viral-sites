import { describe, expect, it } from 'vitest'
import { fnv1a } from './fnv1a'

describe('fnv1a', () => {
  it('标准测试向量（FNV-1a 32 位参考值）', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
    expect(fnv1a('foobar')).toBe(0xbf9cf968)
  })

  it('中文按 UTF-8 字节参与运算，同输入同输出', () => {
    const first = fnv1a('阿福|2026-08-04|v1')
    const second = fnv1a('阿福|2026-08-04|v1')
    expect(first).toBe(second)
    expect(Number.isInteger(first)).toBe(true)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThanOrEqual(0xffffffff)
  })

  it('不同输入产生不同 hash（抽样）', () => {
    expect(fnv1a('阿福|2026-08-04|v1')).not.toBe(fnv1a('阿福|2026-08-05|v1'))
    expect(fnv1a('阿福|2026-08-04|v1')).not.toBe(fnv1a('阿福|2026-08-04|v2'))
  })
})
