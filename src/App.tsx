import { useState } from 'react'
import data from './data/siri-raag.json'
import type { PracticeLine } from './lib/types.ts'
import { targetStarts } from './lib/scoring.ts'
import { LineTapper } from './components/LineTapper.tsx'

// Headings and lines with nothing to find (e.g. a single word) aren't worth playing.
const lines = (data as PracticeLine[]).filter(line => !line.isHeading && targetStarts(line).length > 0)

function App() {
  const [index, setIndex] = useState(0)
  const line = lines[index]

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-white p-4 text-gray-900">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-lg font-semibold">Larivaar practice</h1>
        <span className="text-sm text-gray-500">
          Ang {line.ang} · {index + 1} / {lines.length}
        </span>
      </header>

      <LineTapper key={line.verseId} line={line} onNext={() => setIndex(i => (i + 1) % lines.length)} />
    </main>
  )
}

export default App
