import { describe, it, expect } from 'vitest'
import { packRows, packBalanced } from './rows.ts'

describe('packRows', () => {
  it('keeps everything on one row when it fits', () => {
    expect(packRows([10, 10, 10], 100)).toEqual([[0, 1, 2]])
  })

  it('wraps when the next item would overflow', () => {
    expect(packRows([40, 40, 40], 100)).toEqual([[0, 1], [2]])
  })

  it('keeps an item that ends exactly at the edge on that row', () => {
    expect(packRows([50, 50, 10], 100)).toEqual([[0, 1], [2]])
  })

  it('gives an oversized item a row of its own', () => {
    expect(packRows([10, 150, 10], 100)).toEqual([[0], [1], [2]])
  })

  it('returns no rows for no items', () => {
    expect(packRows([], 100)).toEqual([])
  })

  it('preserves every index in order', () => {
    const widths = Array.from({ length: 44 }, (_, i) => 18 + (i % 5) * 3)
    expect(packRows(widths, 300).flat()).toEqual(widths.map((_, i) => i))
  })
})

describe('packBalanced', () => {
  const ten = Array<number>(10).fill(10)

  it('evens out a short last row', () => {
    expect(packRows(ten, 80).map(r => r.length)).toEqual([8, 2])
    expect(packBalanced(ten, 80).map(r => r.length)).toEqual([5, 5])
  })

  it('never uses more rows than greedy packing', () => {
    const widths = Array.from({ length: 44 }, (_, i) => 18 + (i % 5) * 3)
    for (const max of [120, 200, 300, 500]) {
      expect(packBalanced(widths, max).length).toBe(packRows(widths, max).length)
    }
  })

  it('preserves every index in order', () => {
    const widths = Array.from({ length: 37 }, (_, i) => 20 + (i % 7) * 2)
    expect(packBalanced(widths, 250).flat()).toEqual(widths.map((_, i) => i))
  })

  it('leaves a line that fits on one row alone', () => {
    expect(packBalanced([10, 10, 10], 100)).toEqual([[0, 1, 2]])
  })

  it('returns no rows for no items', () => {
    expect(packBalanced([], 100)).toEqual([])
  })
})
