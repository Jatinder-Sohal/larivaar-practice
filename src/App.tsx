import { useState } from 'react'
import data from './data/siri-raag.json'
import type { PracticeLine } from './lib/types.ts'
import { targetStarts, type Tally } from './lib/scoring.ts'
import { shuffle } from './lib/shuffle.ts'
import { LineTapper } from './components/LineTapper.tsx'

// Headings and lines with nothing to find (e.g. a single word) aren't worth playing.
const lines = (data as PracticeLine[]).filter(line => !line.isHeading && targetStarts(line).length > 0)

const SECTION = 'Siri Raag' // the only section loaded so far

type Session = Tally & { lines: number }

function App() {
  const [order] = useState(() => shuffle(lines)) // a fresh random order each visit
  const [index, setIndex] = useState(0)
  const [session, setSession] = useState<Session>({ lines: 0, found: 0, total: 0, wrong: 0 })
  const line = order[index]

  function recordCheck(tally: Tally) {
    setSession(s => ({
      lines: s.lines + 1,
      found: s.found + tally.found,
      total: s.total + tally.total,
      wrong: s.wrong + tally.wrong,
    }))
  }

  return (
    <div className="min-h-screen bg-stone-100 text-gray-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-lg leading-tight font-semibold">Larivaar Practice</h1>
            <p className="text-xs text-gray-500">
              {SECTION}
              <span className="hidden sm:inline"> · Sri Guru Granth Sahib Ji</span>
            </p>
          </div>
          <SessionStats session={session} />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4 sm:py-8">
        <LineTapper
          key={line.verseId}
          line={line}
          position={index + 1}
          total={order.length}
          onChecked={recordCheck}
          onNext={() => setIndex(i => (i + 1) % order.length)}
        />
        <HowToPlay />
      </main>
    </div>
  )
}

function SessionStats({ session }: { session: Session }) {
  if (session.lines === 0) return <p className="text-sm whitespace-nowrap text-gray-500">No lines yet</p>
  // Wrong taps count against accuracy, so tapping every letter can't score 100%.
  const percent = Math.round((100 * session.found) / (session.total + session.wrong))
  return (
    <div className="text-right leading-tight whitespace-nowrap">
      <p className="text-sm font-semibold">{percent}% accuracy</p>
      <p className="text-xs text-gray-500">
        {session.lines} line{session.lines === 1 ? '' : 's'} this session
      </p>
    </div>
  )
}

function HowToPlay() {
  return (
    <details className="-mx-4 bg-white/70 px-4 py-3 text-sm text-gray-600 ring-1 ring-black/5 sm:mx-0 sm:rounded-2xl sm:px-8">
      <summary className="cursor-pointer font-medium text-gray-800">How to play</summary>
      <ol className="mt-3 mb-1 list-decimal space-y-1.5 pl-5">
        <li>The line is written in larivaar — with no spaces between the words.</li>
        <li>
          Tap the first letter of each word. A space opens in front of it and the letter turns blue. Tap it again to
          take the space away.
        </li>
        <li>The first word, and any word after ॥, is done for you.</li>
        <li>
          Press <strong>Check</strong> to see the real words: green words are ones you found, amber words are ones
          you missed, and a red letter is a wrong tap — no word starts there. Word meanings (ਪਦ ਅਰਥ) and a
          translation follow.
        </li>
      </ol>
    </details>
  )
}

export default App
