import { describe, it, expect } from 'vitest'
import { segmentLine } from './segment.ts'
import { targetStarts, tappableUnits, scoreTaps, playerBreaks, wordsRight, symbolEdges, givenStarts } from './scoring.ts'
import type { PracticeLine } from './types.ts'

function lineFrom(spaced: string): PracticeLine {
  return { verseId: 1, shabadId: 1, ang: 14, spaced, translation: '', isHeading: false, ...segmentLine(spaced) }
}

// units: ਮੋ ਤੀ | ਤ | ਮੰ ਦ ਰ | ਊ ਸ ਰ ਹਿ | ਰ ਤ ਨੀ | ਤ | ਹੋ ਹਿ | ਜ ੜਾ ਉ | ॥
//        0  1    2   3  4 5   6 7 8 9    10 11 12  13  14 15   16 17 18  19
const moti = lineFrom('ਮੋਤੀ ਤ ਮੰਦਰ ਊਸਰਹਿ ਰਤਨੀ ਤ ਹੋਹਿ ਜੜਾਉ ॥')

describe('targetStarts', () => {
  it('scores every word start except the first', () => {
    expect(targetStarts(moti)).toEqual([2, 3, 6, 10, 13, 14, 16])
  })

  it('gives the word after ੴ for free', () => {
    const mool = lineFrom('ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ ॥')
    expect(targetStarts(mool)[0]).toBe(3) // ਨਾਮੁ, not ਸਤਿ at 1
  })

  it('gives the word after a verse number for free', () => {
    const line = lineFrom('ਮੈ ਆਪਣਾ ਗੁਰੁ ਪੂਛਿ ਦੇਖਿਆ ਅਵਰੁ ਨਾਹੀ ਥਾਉ ॥੧॥ ਰਹਾਉ ॥')
    const rahau = line.words.find(w => w.text === 'ਰਹਾਉ')!
    expect(targetStarts(line)).not.toContain(rahau.start)
  })
})

describe('tappableUnits', () => {
  const tappable = tappableUnits(moti)

  it('excludes the given first unit and the closing ॥', () => {
    expect(tappable.has(0)).toBe(false)
    expect(tappable.has(19)).toBe(false)
  })

  it('includes word starts and mid-word units', () => {
    expect(tappable.has(1)).toBe(true)
    expect(tappable.has(2)).toBe(true)
    expect(tappable.size).toBe(18)
  })
})

describe('playerBreaks', () => {
  it('is one chunk plus the ॥ before any taps', () => {
    expect([...playerBreaks(moti, new Set())].sort((a, b) => a - b)).toEqual([0, 19, 20])
  })

  it('adds the player taps', () => {
    expect([...playerBreaks(moti, new Set([2, 5]))].sort((a, b) => a - b)).toEqual([0, 2, 5, 19, 20])
  })
})

describe('givenStarts', () => {
  it('gives only the first word on a plain line', () => {
    expect([...givenStarts(moti)]).toEqual([0])
  })

  it('gives the word after ੴ and after a verse number', () => {
    const line = lineFrom('ਨਾਹੀ ਥਾਉ ॥੧॥ ਰਹਾਉ ॥')
    const rahau = line.words.find(w => w.text === 'ਰਹਾਉ')!
    expect([...givenStarts(line)]).toEqual([0, rahau.start])
    expect([...givenStarts(lineFrom('ੴ ਸਤਿ ਨਾਮੁ ॥'))]).toEqual([1])
  })

  it('never overlaps the targets', () => {
    const given = givenStarts(moti)
    expect(targetStarts(moti).some(i => given.has(i))).toBe(false)
  })
})

describe('symbolEdges', () => {
  it('spaces off the closing ॥', () => {
    expect([...symbolEdges(moti)]).toEqual([19])
  })

  it('spaces both sides of a verse number and the word after it', () => {
    const line = lineFrom('ਨਾਹੀ ਥਾਉ ॥੧॥ ਰਹਾਉ ॥')
    const start = (text: string) => line.words.find(w => w.text === text)!.start
    expect([...symbolEdges(line)]).toEqual([start('॥੧॥'), start('ਰਹਾਉ'), line.words[4].start])
  })

  it('spaces the word after ੴ', () => {
    expect([...symbolEdges(lineFrom('ੴ ਸਤਿ ਨਾਮੁ ॥'))].slice(0, 1)).toEqual([1])
  })
})

describe('wordsRight', () => {
  it('marks a word right only when both edges are hit and nothing inside', () => {
    // ਮੋਤੀ, ਤ and ਊਸਰਹਿ are cleanly split; the wrong tap at 5 breaks ਮੰਦਰ
    expect(wordsRight(moti, new Set([2, 3, 5, 6, 10])).slice(0, 4)).toEqual([true, true, false, true])
  })

  it('marks every word right when all targets are tapped', () => {
    expect(wordsRight(moti, new Set(targetStarts(moti))).every(Boolean)).toBe(true)
  })

  it('marks the last word wrong when the player missed its start', () => {
    expect(wordsRight(moti, new Set([2, 3, 6, 10, 13, 14]))[7]).toBe(false) // ਜੜਾਉ
  })
})

describe('scoreTaps', () => {
  it('splits taps into correct, missed and wrong', () => {
    expect(scoreTaps(moti, new Set([5, 2, 3]))).toEqual({
      correct: [2, 3],
      missed: [6, 10, 13, 14, 16],
      wrong: [5],
    })
  })

  it('scores an empty attempt as all missed', () => {
    expect(scoreTaps(moti, new Set()).missed).toHaveLength(7)
  })
})
