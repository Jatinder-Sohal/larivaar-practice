export type Word = {
  text: string // the word as written, with its matras
  start: number // index of the word's first unit in PracticeLine.units
  end: number // exclusive end index in PracticeLine.units
  alphabetic: boolean // false for ੴ, ॥, digits — auto-marked, not scored
}

export type PracticeLine = {
  verseId: number
  shabadId: number
  ang: number
  larivaar: string
  spaced: string
  units: string[] // tap units of the larivaar line, in order
  words: Word[]
  translation: string
  isHeading: boolean
}
