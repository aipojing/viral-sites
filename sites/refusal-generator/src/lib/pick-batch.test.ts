import { describe, expect, it } from 'vitest'
import { BATCH_SIZE, pickBatch } from './pick-batch'

const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

describe('pickBatch', () => {
  it('BATCH_SIZE 恒为 3', () => expect(BATCH_SIZE).toBe(3))
  it('第 0 批取前 3 条', () => expect(pickBatch(seven, 0)).toEqual(['a', 'b', 'c']))
  it('第 1 批顺移 3 条', () => expect(pickBatch(seven, 1)).toEqual(['d', 'e', 'f']))
  it('越过末尾时环形回绕', () => expect(pickBatch(seven, 2)).toEqual(['g', 'a', 'b']))
  it('恰好 3 条时每批都是全量', () => {
    expect(pickBatch(['x', 'y', 'z'], 0)).toEqual(['x', 'y', 'z'])
    expect(pickBatch(['x', 'y', 'z'], 5)).toEqual(['x', 'y', 'z'])
  })
  it('不足 3 条时全量返回', () => expect(pickBatch(['x', 'y'], 0)).toEqual(['x', 'y']))
  it('空列表返回空数组', () => expect(pickBatch([], 3)).toEqual([]))
  it('不修改入参（不可变）', () => {
    const input = ['a', 'b', 'c', 'd']
    pickBatch(input, 1)
    expect(input).toEqual(['a', 'b', 'c', 'd'])
  })
})
