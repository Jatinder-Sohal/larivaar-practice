import type { PracticeLine } from './types.ts'

export type Result = {
  correct: number[] // word starts the player found
  missed: number[] // word starts the player didn't tap
  wrong: number[] // taps that aren't word starts
}

/**
 * Word starts the player has to find, as unit indices. Only boundaries between
 * two letter-words count: the line's first word and any word straight after
 * ੴ, ॥, a digit or ਰਹਾਉ are obvious, so they're given rather than scored.
 */
export function targetStarts(line: PracticeLine): number[] {
  return line.words
    .filter((word, i) => i > 0 && word.scored && line.words[i - 1].scored)
    .map(word => word.start)
}

/** Word starts the player gets for free: the first word, and any word after ੴ/॥/a digit/ਰਹਾਉ. */
export function givenStarts(line: PracticeLine): Set<number> {
  const given = new Set<number>()
  line.words.forEach((word, i) => {
    if (word.scored && (i === 0 || !line.words[i - 1].scored)) given.add(word.start)
  })
  return given
}

/** Unit indices the player may tap: letters, minus the given word starts. */
export function tappableUnits(line: PracticeLine): Set<number> {
  const targets = new Set(targetStarts(line))
  const tappable = new Set<number>()
  for (const word of line.words) {
    if (!word.scored) continue
    for (let i = word.start; i < word.end; i++) {
      if (i !== word.start || targets.has(i)) tappable.add(i)
    }
  }
  return tappable
}

/**
 * Unit indices that always get a space before them during play: both edges of
 * every non-scored token (ੴ, ॥, digits, ਰਹਾਉ). These are given, so showing them leaks nothing.
 */
export function symbolEdges(line: PracticeLine): Set<number> {
  const edges = new Set<number>()
  line.words.forEach((word, i) => {
    if (i > 0 && (!word.scored || !line.words[i - 1].scored)) edges.add(word.start)
  })
  return edges
}

export type WordStatus = 'found' | 'missed' | 'symbol'

/**
 * How each word did, judged on its first letter — the thing the player is
 * asked to tap. Each word is judged on its own, so missing one word's start
 * never marks its neighbour wrong too. Given words (the first word, or one
 * straight after ੴ/॥/a digit/ਰਹਾਉ) count as found. ੴ, ॥, digits and the
 * ਰਹਾਉ pause are 'symbol'.
 */
export function wordStatuses(line: PracticeLine, tapped: ReadonlySet<number>): WordStatus[] {
  const given = givenStarts(line)
  return line.words.map(word => {
    if (!word.scored) return 'symbol'
    return given.has(word.start) || tapped.has(word.start) ? 'found' : 'missed'
  })
}

/** One checked line: words found out of the line's words, plus wrong taps. */
export type Tally = { found: number; total: number; wrong: number }

export function tallyTaps(line: PracticeLine, tapped: ReadonlySet<number>): Tally {
  const statuses = wordStatuses(line, tapped)
  return {
    found: statuses.filter(s => s === 'found').length,
    total: statuses.filter(s => s !== 'symbol').length,
    wrong: scoreTaps(line, tapped).wrong.length,
  }
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
