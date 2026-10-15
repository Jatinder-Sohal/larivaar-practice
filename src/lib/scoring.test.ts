import { describe, it, expect } from 'vitest'
import { segmentLine } from './segment.ts'
import {
  targetStarts,
  tappableUnits,
  scoreTaps,
  symbolEdges,
  givenStarts,
  wordStatuses,
  tallyTaps,
} from './scoring.ts'
import type { PracticeLine } from './types.ts'

function lineFrom(spaced: string): PracticeLine {
  return { verseId: 1, shabadId: 1, ang: 14, spaced, translation: '', padarth: '', isHeading: false, ...segmentLine(spaced) }
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

describe('givenStarts', () => {
  it('gives only the first word on a plain line', () => {
    expect([...givenStarts(moti)]).toEqual([0])
  })

  it('gives the word after ੴ and after a verse number', () => {
    const line = lineFrom('ਨਾਹੀ ਥਾਉ ॥੧॥ ਮੈ ਆਪਣਾ ॥')
    const mai = line.words.find(w => w.text === 'ਮੈ')!
    expect([...givenStarts(line)]).toEqual([0, mai.start])
    expect([...givenStarts(lineFrom('ੴ ਸਤਿ ਨਾਮੁ ॥'))]).toEqual([1])
  })

  it('does not give the ਰਹਾਉ pause — it is a marker, not a word to play', () => {
    expect([...givenStarts(lineFrom('ਨਾਹੀ ਥਾਉ ॥੧॥ ਰਹਾਉ ॥'))]).toEqual([0])
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

describe('wordStatuses', () => {
  it('judges each word only on its own first letter', () => {
    // The user's real attempt on Ang 81: found ਕਿ and ਪ੍ਰ, but tapped ਪਾ instead
    // of ਗੋ and ਰੇ instead of ਮੇ. ਕਿਰਪਾਲ and ਪ੍ਰਭ must still count as found.
    const line = lineFrom('ਭਏ ਕਿਰਪਾਲ ਗੋਪਾਲ ਪ੍ਰਭ ਮੇਰੇ ਸਾਧਸੰਗਤਿ ਨਿਧਿ ਮਾਨਿਆ ॥')
    // units: ਭ ਏ | ਕਿ ਰ ਪਾ ਲ | ਗੋ ਪਾ ਲ | ਪ੍ਰ ਭ | ਮੇ ਰੇ | ਸਾ ਧ ਸੰ ਗ ਤਿ | ਨਿ ਧਿ | ਮਾ ਨਿ ਆ | ॥
    //        0 1    2  3 4  5    6  7  8   9  10   11 12   13 14 15 16 17  18 19   20 21 22 23
    const tapped = new Set([1, 2, 7, 9, 12, 15, 18, 20])
    expect(wordStatuses(line, tapped)).toEqual([
      'found', // ਭਏ — given, so it counts as found
      'found', // ਕਿਰਪਾਲ
      'missed', // ਗੋਪਾਲ
      'found', // ਪ੍ਰਭ
      'missed', // ਮੇਰੇ
      'missed', // ਸਾਧਸੰਗਤਿ
      'found', // ਨਿਧਿ
      'found', // ਮਾਨਿਆ
      'symbol', // ॥
    ])
  })

  it('marks ੴ and ਰਹਾਉ as symbols and the given word after ੴ as found', () => {
    const line = lineFrom('ੴ ਸਤਿ ਨਾਮੁ ॥੧॥ ਰਹਾਉ ॥')
    expect(wordStatuses(line, new Set())).toEqual(['symbol', 'found', 'missed', 'symbol', 'symbol', 'symbol'])
  })
})

describe('tallyTaps', () => {
  it('counts given words as found, so the score matches the green words', () => {
    // Ang 72: ਤਿਨ is given; ਅੰਤਰਿ and ਸਬਦੁ found; ਵਸਾਇਆ missed; one wrong tap on ਦੁ
    const line = lineFrom('ਤਿਨ ਅੰਤਰਿ ਸਬਦੁ ਵਸਾਇਆ ॥')
    const start = (text: string) => line.words.find(w => w.text === text)!.start
    const tapped = new Set([start('ਅੰਤਰਿ'), start('ਸਬਦੁ'), start('ਸਬਦੁ') + 2])
    expect(tallyTaps(line, tapped)).toEqual({ found: 3, total: 4, wrong: 1 })
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
