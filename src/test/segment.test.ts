import { describe, it, expect } from 'vitest'
import { toTapUnits, segmentLine } from '../lib/segment.ts'

describe('toTapUnits', () => {
  it('keeps halant conjuncts whole', () => {
    expect(toTapUnits('ਪ੍ਰਸਾਦਿ')).toEqual(['ਪ੍ਰ', 'ਸਾ', 'ਦਿ'])
  })
  it('keeps matras attached', () => {
    expect(toTapUnits('ਸਤਿ')).toEqual(['ਸ', 'ਤਿ'])
  })
  it('handles ੴ', () => {
    expect(toTapUnits('ੴ')).toEqual(['ੴ'])
  })
  it('does not crash on a trailing halant', () => {
    expect(toTapUnits('ਪ੍')).toEqual(['ਪ੍'])
  })
})

describe('segmentLine', () => {
  // [spaced, larivaar.unicode] as returned by the BaniDB API
  const lines: [string, string][] = [
    ['ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ ॥', 'ੴਸਤਿਨਾਮੁਕਰਤਾਪੁਰਖੁਨਿਰਭਉਨਿਰਵੈਰੁਅਕਾਲਮੂਰਤਿਅਜੂਨੀਸੈਭੰਗੁਰਪ੍ਰਸਾਦਿ॥'],
    ['ਰਾਗੁ ਸਿਰੀਰਾਗੁ ਮਹਲਾ ਪਹਿਲਾ ੧ ਘਰੁ ੧ ॥', 'ਰਾਗੁਸਿਰੀਰਾਗੁਮਹਲਾਪਹਿਲਾ੧ਘਰੁ੧॥'],
    ['ਮੋਤੀ ਤ ਮੰਦਰ ਊਸਰਹਿ ਰਤਨੀ ਤ ਹੋਹਿ ਜੜਾਉ ॥', 'ਮੋਤੀਤਮੰਦਰਊਸਰਹਿਰਤਨੀਤਹੋਹਿਜੜਾਉ॥'],
    ['ਮੈ ਆਪਣਾ ਗੁਰੁ ਪੂਛਿ ਦੇਖਿਆ ਅਵਰੁ ਨਾਹੀ ਥਾਉ ॥੧॥ ਰਹਾਉ ॥', 'ਮੈਆਪਣਾਗੁਰੁਪੂਛਿਦੇਖਿਆਅਵਰੁਨਾਹੀਥਾਉ॥੧॥ਰਹਾਉ॥'],
  ]

  it.each(lines)('rebuilds the API larivaar for %s', (spaced, expected) => {
    expect(segmentLine(spaced).larivaar).toBe(expected)
  })

  it('marks ੴ and ॥ as non-alphabetic', () => {
    const { words } = segmentLine(lines[0][0])
    expect(words.filter(w => !w.alphabetic).map(w => w.text)).toEqual(['ੴ', '॥'])
  })

  it('measures ਪ੍ਰਸਾਦਿ as 3 tap units', () => {
    const word = segmentLine(lines[0][0]).words.find(w => w.text === 'ਪ੍ਰਸਾਦਿ')!
    expect(word.end - word.start).toBe(3)
  })

  it('marks verse numbers and the closing ॥ as non-alphabetic', () => {
    const { words } = segmentLine(lines[3][0])
    expect(words.filter(w => !w.alphabetic).map(w => w.text)).toEqual(['॥੧॥', '॥'])
  })
})