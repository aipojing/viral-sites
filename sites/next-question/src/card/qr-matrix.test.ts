import { describe, expect, it } from 'vitest'
import { createQrMatrix } from './qr-matrix'

describe('createQrMatrix', () => {
  it('同一链接生成稳定的方形矩阵', () => {
    const first = createQrMatrix('https://example.com/next-question/c/abc#b=tok')
    const second = createQrMatrix('https://example.com/next-question/c/abc#b=tok')
    expect(first.size).toBeGreaterThanOrEqual(21)
    expect(first.size).toBe(second.size)
    expect(first.darkModules).toEqual(second.darkModules)
    expect(first.darkModules.length).toBeGreaterThan(0)
  })

  it('不同链接产生不同矩阵', () => {
    expect(createQrMatrix('https://example.com/a').darkModules).not.toEqual(
      createQrMatrix('https://example.com/b').darkModules,
    )
  })
})
