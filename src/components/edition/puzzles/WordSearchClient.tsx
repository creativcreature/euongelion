'use client'

/**
 * The word search. Two ways to select a run: drag across the letters
 * (pointer events, fine pointers), or tap one end and then the other —
 * the gesture that survives touch, where a drag fights the page scroll.
 * A run that matches a listed word (forwards or backwards) strikes it
 * off the list and its cells stay highlighted; a miss shakes and clears.
 *
 * Everything is local state — no network, no persistence, no timer. It is
 * a newspaper puzzle: you do it with your coffee and it lets you go.
 */
import { useEffect, useRef, useState } from 'react'
import type { WordSearchPuzzle } from '@/lib/edition/wordsearch'
import { readPuzzleState, writePuzzleState } from '@/lib/puzzle-store'

interface StoredSearch {
  found: string[]
  cells: string[]
  runs: { r0: number; c0: number; r1: number; c1: number }[]
}

interface Cell {
  row: number
  col: number
}

const keyOf = (row: number, col: number) => `${row}:${col}`
const sameCell = (a: Cell, b: Cell) => a.row === b.row && a.col === b.col

/** The straight run from a to b, or null when they do not share a line. */
function lineBetween(a: Cell, b: Cell): Cell[] | null {
  const dr = b.row - a.row
  const dc = b.col - a.col
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null
  const steps = Math.max(Math.abs(dr), Math.abs(dc))
  const sr = Math.sign(dr)
  const sc = Math.sign(dc)
  return Array.from({ length: steps + 1 }, (_, i) => ({
    row: a.row + sr * i,
    col: a.col + sc * i,
  }))
}

export default function WordSearchClient({
  puzzle,
}: {
  puzzle: WordSearchPuzzle
}) {
  const { grid, words, theme } = puzzle

  const [anchor, setAnchor] = useState<Cell | null>(null)
  const [cursor, setCursor] = useState<Cell | null>(null)
  // Progress survives a reload (founder lost a half-finished search).
  const storeKey = `euangelion-puzzle:ws:${theme}:${words.join('|')}`
  const [found, setFound] = useState<string[]>(
    () => readPuzzleState<StoredSearch>(storeKey)?.found ?? [],
  )
  const [foundCells, setFoundCells] = useState<ReadonlySet<string>>(
    () => new Set(readPuzzleState<StoredSearch>(storeKey)?.cells ?? []),
  )
  // Each found word's run, for the red marker circle drawn over it
  // (founder: "look like someone circled the words upon selection").
  const [foundRuns, setFoundRuns] = useState<
    { r0: number; c0: number; r1: number; c1: number }[]
  >(() => readPuzzleState<StoredSearch>(storeKey)?.runs ?? [])

  useEffect(() => {
    writePuzzleState(storeKey, {
      found,
      cells: [...foundCells],
      runs: foundRuns,
    } satisfies StoredSearch)
  }, [storeKey, found, foundCells, foundRuns])
  const [missCells, setMissCells] = useState<ReadonlySet<string> | null>(null)

  // Drag bookkeeping lives in refs: it never drives a render on its own,
  // and `last` sidesteps the one-frame lag of the batched cursor state.
  const drag = useRef<{ start: Cell; last: Cell | null } | null>(null)
  const suppressClick = useRef(false)

  const done = found.length === words.length

  function flashMiss(cells: Cell[]) {
    const keys = new Set(cells.map((c) => keyOf(c.row, c.col)))
    setMissCells(keys)
    // The shake clears itself; state, not setTimeout churn on unmount.
    window.setTimeout(() => setMissCells((m) => (m === keys ? null : m)), 400)
  }

  function attempt(a: Cell, b: Cell) {
    const path = lineBetween(a, b)
    if (!path || path.length < 2) {
      flashMiss(path ?? [a, b])
      return
    }
    const run = path.map(({ row, col }) => grid[row][col]).join('')
    const reversed = [...run].reverse().join('')
    const hit = words.find(
      (w) => !found.includes(w) && (w === run || w === reversed),
    )
    if (hit) {
      setFound((prev) => [...prev, hit])
      setFoundCells((prev) => {
        const next = new Set(prev)
        for (const { row, col } of path) next.add(keyOf(row, col))
        return next
      })
      const first = path[0]
      const last = path[path.length - 1]
      setFoundRuns((prev) => [
        ...prev,
        { r0: first.row, c0: first.col, r1: last.row, c1: last.col },
      ])
    } else {
      flashMiss(path)
    }
  }

  /** Which cell the pointer is over, drag or hover — pseudo-capture on touch
   * routes events to the starting button, so read the point, not the target. */
  function cellFromPoint(e: React.PointerEvent): Cell | null {
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const btn = el instanceof Element ? el.closest('[data-ws-cell]') : null
    if (!(btn instanceof HTMLElement)) return null
    const row = Number(btn.dataset.row)
    const col = Number(btn.dataset.col)
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null
    return { row, col }
  }

  function handlePointerDown(row: number, col: number) {
    drag.current = { start: { row, col }, last: null }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const active = drag.current
    if (!active && !anchor) return
    const cell = cellFromPoint(e)
    if (!cell) return
    // Dragging back onto the start cell rescinds the run — release there
    // reads as a tap, not a one-letter guess.
    if (active) active.last = sameCell(cell, active.start) ? null : cell
    // Hover preview between first and second click rides the same path.
    setCursor((prev) => (prev && sameCell(prev, cell) ? prev : cell))
  }

  function handlePointerUp() {
    const active = drag.current
    drag.current = null
    if (!active) return
    if (active.last) {
      attempt(active.start, active.last)
      setAnchor(null)
      setCursor(null)
      // The browser still fires a click after the drag — swallow it.
      suppressClick.current = true
    }
    // A press with no movement is a tap; the click handler owns taps.
  }

  function handlePointerCancel() {
    drag.current = null
    setCursor(null)
  }

  function handleClick(row: number, col: number) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const cell = { row, col }
    if (!anchor) {
      setAnchor(cell)
      setCursor(null)
    } else if (sameCell(anchor, cell)) {
      // Second tap on the same cell backs out.
      setAnchor(null)
      setCursor(null)
    } else {
      attempt(anchor, cell)
      setAnchor(null)
      setCursor(null)
    }
  }

  const previewKeys = (() => {
    if (!anchor || !cursor) return null
    const path = lineBetween(anchor, cursor)
    if (!path) return null
    return new Set(path.map((c) => keyOf(c.row, c.col)))
  })()

  return (
    <div className="puzzle-ws">
      <div className="puzzle-ws-board">
        <p className="puzzle-ws-theme">{theme}</p>
        <p className="puzzle-ws-hint">
          Drag across the letters — or tap one end, then the other.
        </p>
        <div className="puzzle-ws-scroll">
          <div
            className="puzzle-ws-grid"
            role="grid"
            aria-label={`Word search grid, theme ${theme}`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {foundRuns.length > 0 && (
              <svg
                className="puzzle-ws-circles"
                viewBox={`0 0 ${grid[0].length} ${grid.length}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {foundRuns.map((run, i) => (
                  <line
                    key={i}
                    className="puzzle-ws-circle"
                    x1={run.c0 + 0.5}
                    y1={run.r0 + 0.5}
                    x2={run.c1 + 0.5}
                    y2={run.r1 + 0.5}
                  />
                ))}
              </svg>
            )}
            {grid.map((rowLetters, row) =>
              rowLetters.map((letter, col) => {
                const k = keyOf(row, col)
                const isAnchor =
                  anchor !== null && sameCell(anchor, { row, col })
                const cls = [
                  'puzzle-ws-cell',
                  foundCells.has(k) ? 'puzzle-ws-cell-found' : '',
                  previewKeys?.has(k) ? 'puzzle-ws-cell-path' : '',
                  isAnchor ? 'puzzle-ws-cell-anchor' : '',
                  missCells?.has(k) ? 'puzzle-ws-cell-miss' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button
                    key={k}
                    type="button"
                    role="gridcell"
                    className={cls}
                    data-ws-cell=""
                    data-row={row}
                    data-col={col}
                    onPointerDown={() => handlePointerDown(row, col)}
                    onClick={() => handleClick(row, col)}
                    aria-label={`Row ${row + 1} column ${col + 1}, ${letter}`}
                  >
                    {letter}
                  </button>
                )
              }),
            )}
          </div>
        </div>
        <p className="puzzle-score" aria-live="polite">
          {done
            ? 'Found them all.'
            : `${found.length} of ${words.length} found`}
        </p>
      </div>

      <ul className="puzzle-ws-words" aria-label="Words to find">
        {words.map((word) => (
          <li
            key={word}
            className={
              found.includes(word)
                ? 'puzzle-ws-word puzzle-ws-word-done'
                : 'puzzle-ws-word'
            }
          >
            {word}
          </li>
        ))}
      </ul>
    </div>
  )
}
