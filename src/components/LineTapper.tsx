import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import type { PracticeLine } from '../lib/types.ts'
import { givenStarts, scoreTaps, symbolEdges, tappableUnits, targetStarts, wordsRight, type Result } from '../lib/scoring.ts'
import { packBalanced } from '../lib/rows.ts'

type Props = {
  line: PracticeLine
  onNext: () => void
}

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ')

// A quick second tap on the letter just tapped is ignored for this long — see toggle().
const RETAP_GUARD_MS = 400

export function LineTapper({ line, onNext }: Props) {
  const [tapped, setTapped] = useState<Set<number>>(() => new Set())
  const [cleared, setCleared] = useState<Set<number> | null>(null) // taps removed by Clear, for Undo clear
  const [result, setResult] = useState<Result | null>(null)
  const lastTap = useRef<{ unit: number; at: number } | null>(null)

  const total = targetStarts(line).length

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

  if (result) {
    const verdicts = wordsRight(line, tapped)
    return (
      <section className="flex flex-col gap-6">
        <p className="text-sm text-gray-600">Here are the real words.</p>
        <ResultLine line={line} verdicts={verdicts} wrong={new Set(result.wrong)} />
        <Feedback line={line} verdicts={verdicts} wrongTaps={result.wrong.length} onNext={onNext} />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <p className="text-sm text-gray-600">
        Tap the first letter of each word to open a space before it. The first word is done for you. {total} to
        find.
      </p>

      <PlayLine line={line} tapped={tapped} onToggle={toggle} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setResult(scoreTaps(line, tapped))}
          className="min-h-11 flex-1 rounded-lg bg-gray-900 px-4 font-medium text-white"
        >
          Check
        </button>
        <button
          type="button"
          onClick={clearOrUndo}
          disabled={tapped.size === 0 && !cleared}
          className="min-h-11 w-32 shrink-0 rounded-lg border border-gray-300 px-4 font-medium disabled:opacity-40"
        >
          {cleared ? 'Undo clear' : 'Clear'}
        </button>
      </div>
    </section>
  )
}

type PlayLineProps = {
  line: PracticeLine
  tapped: ReadonlySet<number>
  onToggle: (unit: number, at: number) => void
}

/** Units belonging to ੴ, ॥ and digit tokens — shown grey, never tappable. */
function symbolUnits(line: PracticeLine): Set<number> {
  const units = new Set<number>()
  for (const word of line.words) {
    if (word.alphabetic) continue
    for (let i = word.start; i < word.end; i++) units.add(i)
  }
  return units
}

const SPACE_PX = 8 // matches basis-2 on the spacers and gap-2 in ResultLine
const ROW_RESERVE_PX = 32 // spare room per row so opening spaces never re-wraps a row

// A tap opens a real space before the letter, so the player's guess reads like
// spaced Gurbani. Every word start — tapped or given — is blue, so a black
// letter at the start of a row means the word carries on from the row above.
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
                  symbols.has(i) && 'text-gray-400',
                  (tapped.has(i) || given.has(i)) && 'text-sky-600',
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

// After Check: the line laid out as the real words, each green if the player
// split it exactly right, amber if not. Words wrap whole; wrong taps are red.
function ResultLine({ line, verdicts, wrong }: { line: PracticeLine; verdicts: boolean[]; wrong: Set<number> }) {
  return (
    <div className="flex flex-wrap gap-2 text-4xl leading-normal" lang="pa">
      {line.words.map((word, w) => (
        <span
          key={w}
          className={cx(
            'flex rounded-md py-1',
            !word.alphabetic ? 'text-gray-400' : verdicts[w] ? 'bg-green-100' : 'bg-amber-100',
          )}
        >
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
  verdicts: boolean[]
  wrongTaps: number
  onNext: () => void
}

function Feedback({ line, verdicts, wrongTaps, onNext }: FeedbackProps) {
  const words = line.words.filter(w => w.alphabetic).length
  const right = line.words.filter((w, i) => w.alphabetic && verdicts[i]).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">
        {right === words
          ? `Perfect — all ${words} words right`
          : `${right} of ${words} words right${wrongTaps ? ` · ${wrongTaps} wrong tap${wrongTaps === 1 ? '' : 's'}` : ''}`}
      </p>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <li><Swatch className="bg-green-100" /> split right</li>
        <li><Swatch className="bg-amber-100" /> not quite</li>
        <li><span className="font-semibold text-red-600">red letter</span> = wrong tap</li>
      </ul>

      {line.translation && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">{line.translation}</p>}

      <button
        type="button"
        onClick={onNext}
        className="min-h-11 rounded-lg bg-gray-900 px-4 font-medium text-white"
      >
        Next line
      </button>
    </div>
  )
}

function Swatch({ className }: { className: string }) {
  return <span aria-hidden className={`mr-1 inline-block h-3 w-3 rounded-sm align-middle ${className}`} />
}
