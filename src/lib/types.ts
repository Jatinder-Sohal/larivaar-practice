export type Word = {
  text: string // the word as written, with its matras
  start: number // index of the word's first unit in PracticeLine.units
  end: number // exclusive end index in PracticeLine.units
  scored: boolean // false for ੴ, ॥, digits and the ਰਹਾਉ pause marker — shown grey, not scored
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
  padarth: string // raw "word = meaning।" text from BaniDB, '' if none — see parsePadarth
  isHeading: boolean
}
