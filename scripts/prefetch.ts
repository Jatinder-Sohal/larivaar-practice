// Downloads Siri Raag (SGGS angs 14–93) from BaniDB once and writes it as
// static PracticeLine data, so the app never calls the API at runtime.
// Run with: npm run prefetch

import { mkdir, writeFile } from 'node:fs/promises'
import { segmentLine } from '../src/lib/segment.ts'
import type { PracticeLine } from '../src/lib/types.ts'

const SIRI_RAAG_ID = 5
const FIRST_ANG = 14
const LAST_ANG = 93
const DELAY_MS = 300
const OUT_DIR = 'src/data'
const OUT_FILE = `${OUT_DIR}/siri-raag.json`

// Only the fields we read from /v2/angs/{n}/G — the real response has far more.
type AngResponse = {
  page: {
    verseId: number
    shabadId: number
    pageNo: number
    verse: { unicode: string }
    larivaar: { unicode: string }
    translation: { en?: { ssk?: string | null } }
    writer: { writerId: number | null }
    raag: { raagId: number }
  }[]
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchAng(ang: number): Promise<AngResponse> {
  const res = await fetch(`https://api.banidb.com/v2/angs/${ang}/G`)
  if (!res.ok) throw new Error(`Ang ${ang}: HTTP ${res.status}`)
  return res.json() as Promise<AngResponse>
}

const lines: PracticeLine[] = []

for (let ang = FIRST_ANG; ang <= LAST_ANG; ang++) {
  const data = await fetchAng(ang)
  let kept = 0

  for (const line of data.page) {
    if (line.raag.raagId !== SIRI_RAAG_ID) continue

    const { larivaar, units, words } = segmentLine(line.verse.unicode)
    if (larivaar !== line.larivaar.unicode) {
      throw new Error(
        `Ang ${ang}, verse ${line.verseId}: rebuilt larivaar does not match API\n` +
          `  rebuilt: ${larivaar}\n  api:     ${line.larivaar.unicode}`,
      )
    }

    lines.push({
      verseId: line.verseId,
      shabadId: line.shabadId,
      ang: line.pageNo,
      larivaar,
      spaced: line.verse.unicode,
      units,
      words,
      translation: line.translation.en?.ssk ?? '',
      isHeading: line.writer.writerId == null,
    })
    kept++
  }

  console.log(`Ang ${ang}: ${kept}/${data.page.length} lines`)
  if (ang < LAST_ANG) await sleep(DELAY_MS)
}

const json = JSON.stringify(lines)
await mkdir(OUT_DIR, { recursive: true })
await writeFile(OUT_FILE, json)

const longestUnit = lines
  .flatMap(l => l.units)
  .reduce((a, b) => ([...b].length > [...a].length ? b : a), '')

console.log(`
Wrote ${OUT_FILE}
  lines:    ${lines.length} (${lines.filter(l => l.isHeading).length} headings)
  shabads:  ${new Set(lines.map(l => l.shabadId)).size}
  size:     ${(Buffer.byteLength(json) / 1024).toFixed(0)} KB
  longest tap unit: ${longestUnit} (${[...longestUnit].length} codepoints)`)
