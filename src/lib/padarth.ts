export type PadarthEntry = { word: string; meaning: string }

/**
 * Splits BaniDB's padarth text into word/meaning pairs. Entries look like
 * "ਊਸਰਹਿ = ਉਸਰ ਪੈਣ, ਬਣ ਜਾਣ।" separated by "।" (sometimes ";"), mixed with
 * bare verse numbers ("2।") and occasionally a sentence of commentary — only
 * the "word = meaning" pieces are kept.
 */
export function parsePadarth(raw: string): PadarthEntry[] {
  return raw
    .split(/[।;]/)
    .map(part => part.trim())
    .filter(part => part.includes('='))
    .map(part => {
      const at = part.indexOf('=')
      // A verse number missing its "।" can stick to the next word: "4 ਗੁਰਮੁਖਿ".
      const word = part.slice(0, at).replace(/^[\d੦-੯\s]+/, '').trim()
      return { word, meaning: part.slice(at + 1).trim() }
    })
    .filter(entry => entry.word && entry.meaning)
}

/**
 * Reduces a word to its consonant outline so spelling variants match: vowel
 * signs, tippi/bindi/addak and the halant are dropped, and independent vowels
 * collapse to their carrier (ਉ/ਊ/ਓ → ੳ, ਇ/ਈ/ਏ → ੲ, ਆ/ਐ/ਔ → ਅ).
 * So ਪਸਾਓ and ਪਸਾਉ, or ਮੁਖਿ and ਮੁਖ, compare equal.
 */
function outline(word: string): string {
  return word
    .replace(/[ਁ-ਃ਼ਾ-੍ੑੰੱੵ]/g, '')
    .replace(/[ਉਊਓ]/g, 'ੳ')
    .replace(/[ਇਈਏ]/g, 'ੲ')
    .replace(/[ਆਐਔ]/g, 'ਅ')
}

/**
 * The padarth entries that belong to this line. BaniDB sometimes attaches the
 * padarth for a whole passage to one line, which would show meanings for
 * words that aren't there. An entry is kept when, comparing by outline:
 * - any of its words matches a word in the line, or is the start or end of
 *   one (ਅਹਿ, ਨਿਸਿ → ਅਹਿਨਿਸਿ; ਬੋਲਿ → ਬੋਲਿਐ), or
 * - the entry run together appears in the line run together, for compounds
 *   written apart or together (ਗੁਣ ਤਾਸੁ → ਗੁਣਤਾਸੁ; ਸਤਸਰਿ → ਸਤ ਸਰਿ).
 */
export function padarthForLine(raw: string, lineWords: string[]): PadarthEntry[] {
  const outlines = lineWords.map(outline)
  const joinedLine = outlines.join('')
  return parsePadarth(raw).filter(entry => {
    const tokens = entry.word.split(/[\s.…]+/).map(outline).filter(Boolean)
    const tokenMatches = tokens.some(token =>
      outlines.some(w => w === token || (token.length >= 2 && (w.startsWith(token) || w.endsWith(token)))),
    )
    const joined = tokens.join('')
    return tokenMatches || (joined.length >= 4 && joinedLine.includes(joined))
  })
}
