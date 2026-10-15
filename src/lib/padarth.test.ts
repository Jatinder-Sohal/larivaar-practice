import { describe, it, expect } from 'vitest'
import { parsePadarth, padarthForLine } from './padarth.ts'

// Examples are real BaniDB padarth from Siri Raag, Ang 14.
describe('parsePadarth', () => {
  it('splits word = meaning pairs on ।', () => {
    expect(parsePadarth('ਤ = ਜੇ। ਊਸਰਹਿ = ਉਸਰ ਪੈਣ, ਬਣ ਜਾਣ।')).toEqual([
      { word: 'ਤ', meaning: 'ਜੇ' },
      { word: 'ਊਸਰਹਿ', meaning: 'ਉਸਰ ਪੈਣ, ਬਣ ਜਾਣ' },
    ])
  })

  it('drops bare verse numbers', () => {
    expect(parsePadarth('ਦੇਖਿ = ਵੇਖ ਕੇ। ਚਿਤਿ = ਚਿੱਤ ਵਿਚ। 1।')).toEqual([
      { word: 'ਦੇਖਿ', meaning: 'ਵੇਖ ਕੇ' },
      { word: 'ਚਿਤਿ', meaning: 'ਚਿੱਤ ਵਿਚ' },
    ])
  })

  it('also splits on ;', () => {
    expect(parsePadarth('ਦੇਖਿ = ਵੇਖ ਕੇ; ਚਿਤਿ = ਚਿੱਤ ਵਿਚ; ਨਾਉ = ਨਾਮਣਾ, ਵਡਿਆਈ')).toHaveLength(3)
  })

  it('keeps multi-word phrases', () => {
    expect(parsePadarth('ਰੰਗਿ ਪਸਾਉ = ਪਿਆਰ-ਭਰੀ ਖੇਡ, ਹਾਵ-ਭਾਵ। 2।')).toEqual([
      { word: 'ਰੰਗਿ ਪਸਾਉ', meaning: 'ਪਿਆਰ-ਭਰੀ ਖੇਡ, ਹਾਵ-ਭਾਵ' },
    ])
  })

  it('drops commentary sentences with no =', () => {
    expect(
      parsePadarth('ਵਾਉ = ਹਵਾ ਸਮਾਨ, ਵਿਅਰਥ। 4। ਮੈਂ ਆਪਣੇ ਗੁਰੂ ਨੂੰ ਪੁੱਛ ਕੇ ਵੇਖ ਲਿਆ ਹੈ। 1। ਰਹਾਉ।'),
    ).toEqual([{ word: 'ਵਾਉ', meaning: 'ਹਵਾ ਸਮਾਨ, ਵਿਅਰਥ' }])
  })

  it('returns nothing for an empty string', () => {
    expect(parsePadarth('')).toEqual([])
  })

  it('strips a verse number stuck to the next word', () => {
    expect(parsePadarth('4 ਗੁਰਮੁਖਿ = ਗੁਰੂ ਦੇ ਸਨਮੁਖ')[0].word).toBe('ਗੁਰਮੁਖਿ')
  })
})

describe('padarthForLine', () => {
  const words = (spaced: string) => spaced.split(' ')

  it('keeps entries for words in the line, including spelling variants', () => {
    const line = words('ਮੋਹਣੀ ਮੁਖਿ ਮਣੀ ਸੋਹੈ ਕਰੇ ਰੰਗਿ ਪਸਾਉ ॥')
    const raw = 'ਮੋਹਣੀ = ਸੁੰਦਰ ਇਸਤ੍ਰੀ। ਪਸਾਓ = ਪਸਾਰਾ, ਖੇਡ। ਰੰਗਿ ਪਸਾਉ = ਪਿਆਰ-ਭਰੀ ਖੇਡ। 2।'
    expect(padarthForLine(raw, line).map(e => e.word)).toEqual(['ਮੋਹਣੀ', 'ਪਸਾਓ', 'ਰੰਗਿ ਪਸਾਉ'])
  })

  it('matches compounds written apart or together', () => {
    expect(padarthForLine('ਗੁਣ ਤਾਸੁ = ਗੁਣਾਂ ਦਾ ਖ਼ਜ਼ਾਨਾ।', words('ਸਚੁ ਨਾਮੁ ਗੁਣਤਾਸੁ ॥੧॥'))).toHaveLength(1)
    expect(padarthForLine('ਅਹਿ = ਦਿਨ। ਨਿਸਿ = ਰਾਤ।', words('ਕਲਰ ਕੇਰੀ ਕੰਧ ਜਿਉ ਅਹਿਨਿਸਿ ਕਿਰਿ ਢਹਿ ਪਾਇ ॥'))).toHaveLength(2)
  })

  it('drops entries for words from other lines', () => {
    const line = words('ਸਭਿ ਰਸ ਭੋਗਣ ਬਾਦਿ ਹਹਿ ਸਭਿ ਸੀਗਾਰ ਵਿਕਾਰ ॥')
    expect(padarthForLine('ਧਨੁ = ਧਨ। ਬਾਦਿ = ਵਿਅਰਥ।', line).map(e => e.word)).toEqual(['ਬਾਦਿ'])
  })
})
