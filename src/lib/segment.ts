import type { Word } from './types.ts'

const HALANT = '੍'
const graphemes = new Intl.Segmenter('pa', { granularity: 'grapheme' })

/**
 * Splits Gurmukhi text into the units a reader taps: grapheme clusters, with
 * halant conjuncts kept whole. Intl.Segmenter splits ਪ੍ਰ into ['ਪ੍', 'ਰ'], so
 * any unit ending in a halant absorbs the next one (chains included).
 */
export function toTapUnits(text: string): string[] {
  const units: string[] = []
  for (const { segment } of graphemes.segment(text)) {
    const last = units.length - 1
    if (last >= 0 && units[last].endsWith(HALANT)) {
      units[last] += segment
    } else {
      units.push(segment)
    }
  }
  return units
}

function isGurmukhiLetter(codePoint: number): boolean {
  return (
    (codePoint >= 0x0a05 && codePoint <= 0x0a39) || // vowels and consonants
    (codePoint >= 0x0a59 && codePoint <= 0x0a5e) || // ਖ਼ ਗ਼ ਜ਼ ੜ ਫ਼
    codePoint === 0x0a72 || // ੲ
    codePoint === 0x0a73 // ੳ
  )
}

/**
 * Turns a spaced line into its larivaar form plus word boundaries measured in
 * tap units. Each word is segmented separately, so a unit can never straddle
 * a word boundary.
 */
export function segmentLine(spaced: string): {
  larivaar: string
  units: string[]
  words: Word[]
} {
  const units: string[] = []
  const words: Word[] = []

  for (const text of spaced.trim().split(/\s+/)) {
    if (!text) continue
    const wordUnits = toTapUnits(text)
    words.push({
      text,
      start: units.length,
      end: units.length + wordUnits.length,
      alphabetic: isGurmukhiLetter(text.codePointAt(0)!),
    })
    units.push(...wordUnits)
  }

  return { larivaar: units.join(''), units, words }
}
