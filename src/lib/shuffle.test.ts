import { describe, it, expect } from 'vitest'
import { shuffle } from './shuffle.ts'

// Small deterministic PRNG (mulberry32) so tests are repeatable.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('shuffle', () => {
  const items = Array.from({ length: 50 }, (_, i) => i)

  it('keeps every item exactly once', () => {
    expect(shuffle(items, seeded(1)).sort((a, b) => a - b)).toEqual(items)
  })

  it('actually changes the order', () => {
    expect(shuffle(items, seeded(1))).not.toEqual(items)
  })

  it('does not modify the input', () => {
    const copy = [...items]
    shuffle(items, seeded(2))
    expect(items).toEqual(copy)
  })

  it('is repeatable for the same random source', () => {
    expect(shuffle(items, seeded(3))).toEqual(shuffle(items, seeded(3)))
  })
})
