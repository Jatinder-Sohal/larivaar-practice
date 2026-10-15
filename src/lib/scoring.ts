import type { PracticeLine } from './types.ts'

export type Result = {
  correct: number[] // word starts the player found
  missed: number[] // word starts the player didn't tap
  wrong: number[] // taps that aren't word starts
}

/**
 * Word starts the player has to find, as unit indices. Only boundaries between
 * two letter-words count: the line's first word and any word straight after
 * ੴ, ॥ or a digit are obvious, so they're given rather than scored.
 */
export function targetStarts(line: PracticeLine): number[] {
  return line.words
    .filter((word, i) => i > 0 && word.alphabetic && line.words[i - 1].alphabetic)
    .map(word => word.start)
}

/** Word starts the player gets for free: the first word, and any word after ੴ/॥/a digit. */
export function givenStarts(line: PracticeLine): Set<number> {
  const given = new Set<number>()
  line.words.forEach((word, i) => {
    if (word.alphabetic && (i === 0 || !line.words[i - 1].alphabetic)) given.add(word.start)
  })
  return given
}

/** Unit indices the player may tap: letters, minus the given word starts. */
export function tappableUnits(line: PracticeLine): Set<number> {
  const targets = new Set(targetStarts(line))
  const tappable = new Set<number>()
  for (const word of line.words) {
    if (!word.alphabetic) continue
    for (let i = word.start; i < word.end; i++) {
      if (i !== word.start || targets.has(i)) tappable.add(i)
    }
  }
  return tappable
}

/**
 * Unit indices where the line currently splits into chunks: the player's taps,
 * the given word starts, both edges of every ੴ/॥/digit token, and the line end.
 */
export function playerBreaks(line: PracticeLine, tapped: ReadonlySet<number>): Set<number> {
  const breaks = new Set([...tapped, ...givenStarts(line)])
  for (const word of line.words) {
    if (word.alphabetic) continue
    breaks.add(word.start)
    breaks.add(word.end)
  }
  breaks.add(line.units.length)
  return breaks
}

/**
 * Unit indices that always get a space before them during play: both edges of
 * every ੴ/॥/digit token. These are given, so showing them leaks nothing.
 */
export function symbolEdges(line: PracticeLine): Set<number> {
  const edges = new Set<number>()
  line.words.forEach((word, i) => {
    if (i > 0 && (!word.alphabetic || !line.words[i - 1].alphabetic)) edges.add(word.start)
  })
  return edges
}

/** Whether the player split each word exactly: both edges hit, no tap inside. */
export function wordsRight(line: PracticeLine, tapped: ReadonlySet<number>): boolean[] {
  const breaks = playerBreaks(line, tapped)
  return line.words.map(word => {
    if (!breaks.has(word.start) || !breaks.has(word.end)) return false
    for (let i = word.start + 1; i < word.end; i++) if (breaks.has(i)) return false
    return true
  })
}

export function scoreTaps(line: PracticeLine, tapped: ReadonlySet<number>): Result {
  const targets = targetStarts(line)
  const targetSet = new Set(targets)
  return {
    correct: targets.filter(i => tapped.has(i)),
    missed: targets.filter(i => !tapped.has(i)),
    wrong: [...tapped].filter(i => !targetSet.has(i)).sort((a, b) => a - b),
  }
}
