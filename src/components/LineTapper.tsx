import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PracticeLine } from '../lib/types.ts'
import {
  givenStarts,
  scoreTaps,
  symbolEdges,
  tallyTaps,
  tappableUnits,
  wordStatuses,
  type Result,
  type Tally,
  type WordStatus,
} from '../lib/scoring.ts'
import { packBalanced } from '../lib/rows.ts'
import { padarthForLine } from '../lib/padarth.ts'

type Props = {
  line: PracticeLine
  position: number // 1-based place of this line in the session's order
  total: number
  onChecked: (tally: Tally) => void
  onNext: () => void
}

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ')

// A quick second tap on the letter just tapped is ignored for this long — see toggle().
const RETAP_GUARD_MS = 400

export function LineTapper({ line, position, total, onChecked, onNext }: Props) {
  const [tapped, setTapped] = useState<Set<number>>(() => new Set())
  const [cleared, setCleared] = useState<Set<number> | null>(null) // taps removed by Clear, for Undo clear
  const [result, setResult] = useState<Result | null>(null)
  const lastTap = useRef<{ unit: number; at: number } | null>(null)

  function toggle(i: number, at: number) {
    // Opening a space slides the letters after it right, so a quick follow-up
    // tap aimed at the next letter can land on the one just tapped. Ignore
    // that rather than silently removing the split the player just made.
    const last = lastTap.current
    if (tapped.has(i) && last?.unit === i && at - last.at < RETAP_GUARD_MS) return
    lastTap.current = { unit: i, at }
    setCleared(null)
    setTapped(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function clearOrUndo() {
    if (cleared) {
      setTapped(cleared)
      setCleared(null)
    } else {
      setCleared(tapped)
      setTapped(new Set())
    }
  }

  function check() {
    setResult(scoreTaps(line, tapped))
    onChecked(tallyTaps(line, tapped))
  }

  // Enter checks the line, then moves to the next one. Handled at the window
  // so it works wherever focus is — including on the letter just clicked,
  // where Enter would otherwise toggle that letter again.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.repeat) return
      e.preventDefault()
      if (result) onNext()
      else check()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <section className="-mx-4 flex flex-col gap-6 bg-white p-4 shadow-sm ring-1 ring-black/5 sm:mx-0 sm:rounded-2xl sm:p-8">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700">Ang {line.ang}</span>
        <span className="text-gray-500">
          Line {position.toLocaleString()} of {total.toLocaleString()}
        </span>
      </div>

      {result ? (
        <>
          <ResultLine line={line} statuses={wordStatuses(line, tapped)} wrong={new Set(result.wrong)} />
          <Feedback line={line} tally={tallyTaps(line, tapped)} onNext={onNext} />
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">Tap the first letter of each word</p>

          <PlayLine line={line} tapped={tapped} onToggle={toggle} />

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={check}
                className="min-h-11 flex-1 rounded-lg bg-gray-900 px-4 font-medium text-white hover:bg-gray-700"
              >
                Check
              </button>
              <button
                type="button"
                onClick={clearOrUndo}
                disabled={tapped.size === 0 && !cleared}
                className="min-h-11 w-32 shrink-0 rounded-lg border border-gray-300 px-4 font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                {cleared ? 'Undo clear' : 'Clear'}
              </button>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <KeyHint action="check" />
              <button type="button" onClick={onNext} className="ml-auto underline-offset-4 hover:underline">
                Skip this line
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

/** "Press Enter to …" — only on devices with a mouse/trackpad, where a keyboard is likely. */
function KeyHint({ action }: { action: string }) {
  return (
    <span className="hidden pointer-fine:inline">
      Press <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-sans text-xs">Enter</kbd> to{' '}
      {action}
    </span>
  )
}

type PlayLineProps = {
  line: PracticeLine
  tapped: ReadonlySet<number>
  onToggle: (unit: number, at: number) => void
}

/** Units of non-scored tokens (ੴ, ॥, digits, the ਰਹਾਉ pause) — shown grey, never tappable. */
function symbolUnits(line: PracticeLine): Set<number> {
  const units = new Set<number>()
  for (const word of line.words) {
    if (word.scored) continue
    for (let i = word.start; i < word.end; i++) units.add(i)
  }
  return units
}

const SPACE_PX = 8 // matches basis-2 on the spacers and gap-2 in ResultLine
const ROW_RESERVE_PX = 32 // spare room per row so opening spaces never re-wraps a row

// A tap opens a real space before the letter, so the player's guess reads like
// spaced Gurbani. Word starts the player has found, and the line's given first
// letter, are blue — so a black letter at the start of a row means the word
// carries on from the row above. Words after ੴ/॥ already sit behind a fixed
// space, so they stay black.
//
// Rows are packed once from measured letter widths, evened out, with spare
// room at the end, so an opening space never pushes a letter onto another row.
// On a crowded row the spaces shrink instead.
function PlayLine({ line, tapped, onToggle }: PlayLineProps) {
  const lineRef = useRef<HTMLDivElement>(null)
  const unitRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [rows, setRows] = useState<number[][] | null>(null)

  const tappable = tappableUnits(line)
  const given = givenStarts(line)
  const symbols = symbolUnits(line)
  const edges = symbolEdges(line)

  useLayoutEffect(() => {
    const el = lineRef.current
    if (!el) return
    const fixedSpaces = symbolEdges(line)
    let measuredWidth = -1

    // Letter widths don't depend on rows or taps (spaces are separate
    // elements), so re-measuring with splits in place is safe.
    function measure(force: boolean) {
      const width = el!.clientWidth
      if (!force && width === measuredWidth) return
      measuredWidth = width
      const widths = line.units.map(
        (_, i) => (unitRefs.current[i]?.getBoundingClientRect().width ?? 0) + (fixedSpaces.has(i) ? SPACE_PX : 0),
      )
      setRows(packBalanced(widths, width - ROW_RESERVE_PX))
    }

    measure(true)
    const observer = new ResizeObserver(() => measure(false))
    observer.observe(el)
    let active = true
    document.fonts.ready.then(() => active && measure(true))
    return () => {
      active = false
      observer.disconnect()
    }
  }, [line])

  // Before the first measurement the line renders as one wrapping row; the
  // layout effect replaces it with packed rows before the browser paints.
  const layout = rows ?? [line.units.map((_, i) => i)]

  return (
    <div ref={lineRef} lang="pa" className="text-4xl leading-normal">
      {layout.map((row, r) => (
        <div key={r} className={cx('flex', rows ? 'flex-nowrap' : 'flex-wrap')}>
          {row.map(i => (
            <Fragment key={i}>
              {i > 0 && (
                <span
                  aria-hidden
                  onClick={tapped.has(i) ? e => onToggle(i, e.timeStamp) : undefined}
                  className={cx(
                    'self-stretch transition-[flex-basis] duration-150 ease-out motion-reduce:transition-none',
                    tapped.has(i) || edges.has(i) ? 'min-w-0.5 basis-2' : 'basis-0',
                    tapped.has(i) && 'cursor-pointer',
                  )}
                />
              )}
              <button
                ref={el => {
                  unitRefs.current[i] = el
                }}
                type="button"
                disabled={!tappable.has(i)}
                aria-pressed={tapped.has(i)}
                onClick={e => onToggle(i, e.timeStamp)}
                className={cx(
                  'shrink-0 touch-manipulation select-none py-2',
                  tappable.has(i) && 'hover:text-sky-500',
                  symbols.has(i) && 'text-gray-400',
                  (tapped.has(i) || (given.has(i) && !edges.has(i))) && 'text-sky-600',
                )}
              >
                {line.units[i]}
              </button>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  )
}

const statusStyle: Record<WordStatus, string> = {
  found: 'bg-green-100',
  missed: 'bg-amber-100',
  symbol: 'text-gray-400',
}

// After Check: the line laid out as the real words. Each word is green if the
// player tapped its first letter, amber if they missed it. Words wrap whole;
// wrong taps are red.
function ResultLine({ line, statuses, wrong }: { line: PracticeLine; statuses: WordStatus[]; wrong: Set<number> }) {
  return (
    <div className="flex flex-wrap gap-2 text-4xl leading-normal" lang="pa">
      {line.words.map((word, w) => (
        <span key={w} className={cx('flex rounded-md py-1', statusStyle[statuses[w]])}>
          {line.units.slice(word.start, word.end).map((unit, k) => (
            <span key={k} className={cx(wrong.has(word.start + k) && 'text-red-600')}>
              {unit}
            </span>
          ))}
        </span>
      ))}
    </div>
  )
}

type FeedbackProps = {
  line: PracticeLine
  tally: Tally
  onNext: () => void
}

function Feedback({ line, tally, onNext }: FeedbackProps) {
  const perfect = tally.found === tally.total && tally.wrong === 0
  const padarth = padarthForLine(line.padarth, line.words.map(w => w.text))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">
        {perfect
          ? `Perfect — all ${tally.total} words found`
          : `${tally.found} of ${tally.total} words found${tally.wrong ? ` · ${tally.wrong} wrong tap${tally.wrong === 1 ? '' : 's'}` : ''}`}
      </p>

      {/* Key for the colours above — only the ones that appear in this result. */}
      {!perfect && (
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          {tally.found > 0 && (
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-5 w-7 rounded-md bg-green-100 ring-1 ring-green-300" />
              Found
            </li>
          )}
          {tally.found < tally.total && (
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-5 w-7 rounded-md bg-amber-100 ring-1 ring-amber-300" />
              Missed — its first letter wasn't tapped
            </li>
          )}
          {tally.wrong > 0 && (
            <li className="flex items-center gap-2">
              <span aria-hidden lang="pa" className="rounded-md bg-white px-1.5 font-semibold text-red-600 ring-1 ring-gray-300">
                ਕ
              </span>
              Wrong tap — no word starts here
            </li>
          )}
        </ul>
      )}

      {(padarth.length > 0 || line.translation) && (
        <div className="flex flex-col gap-3 rounded-lg bg-stone-50 p-4">
          {padarth.length > 0 && (
            <div>
              <h3 className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Word meanings · <span lang="pa">ਪਦ ਅਰਥ</span>
              </h3>
              <dl lang="pa" className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                {padarth.map((entry, k) => (
                  <Fragment key={k}>
                    <dt className="font-semibold text-gray-900">{entry.word}</dt>
                    <dd className="text-gray-700">{entry.meaning}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          )}
          {line.translation && (
            <div className={cx(padarth.length > 0 && 'border-t border-stone-200 pt-3')}>
              <h3 className="text-xs font-medium tracking-wide text-gray-500 uppercase">Translation</h3>
              <p className="mt-1 text-sm text-gray-700">{line.translation}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onNext}
          className="min-h-11 rounded-lg bg-gray-900 px-4 font-medium text-white hover:bg-gray-700"
        >
          Next line
        </button>
        <div className="text-sm text-gray-500">
          <KeyHint action="go to the next line" />
        </div>
      </div>
    </div>
  )
}
