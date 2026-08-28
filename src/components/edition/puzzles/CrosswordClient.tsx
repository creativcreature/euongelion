'use client'

/**
 * The daily crossword (SA-090 / F-136).
 *
 * Mobile-first: tapping a cell selects its word and focuses one hidden input,
 * so the OS keyboard drives entry on touch and hardware keys drive it on
 * desktop. The active clue prints in a bar above the grid — the pattern that
 * survives small screens, where a side-by-side clue list does not.
 *
 * No persistence, no timer, no streak. It is a newspaper puzzle: you do it
 * with your coffee and it lets you go.
 */
import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import type { CrosswordPayload } from '@/lib/edition/kinds'
import { readPuzzleState, writePuzzleState } from '@/lib/puzzle-store'

type Dir = 'across' | 'down'

interface CellRef {
  row: number
  col: number
}

export default function CrosswordClient({
  puzzle,
}: {
  puzzle: CrosswordPayload
}) {
  const { size, grid, clues } = puzzle

  // entries[r][c] — what the reader has typed.
  // Typed letters survive a reload (SA-114 — same contract as the search).
  const storeKey = `euangelion-puzzle:cw:${size}:${clues.across
    .map((c) => c.answer)
    .join('|')}`
  const [entries, setEntries] = useState<string[][]>(() => {
    const stored = readPuzzleState<string[][]>(storeKey)
    if (
      stored &&
      stored.length === grid.length &&
      stored.every((row, r) => row.length === grid[r].length)
    ) {
      return stored
    }
    return grid.map((row) => row.map(() => ''))
  })

  useEffect(() => {
    writePuzzleState(storeKey, entries)
  }, [storeKey, entries])
  const [active, setActive] = useState<CellRef | null>(null)
  const [dir, setDir] = useState<Dir>('across')
  const [checked, setChecked] = useState(false)
  // Mobile-only collapse; desktop CSS always shows the panel (blank-area fix).
  // OPEN by default — a newspaper prints its clues beside the grid. The
  // founder hit a bare grid on mobile (2026-08-21); the toggle now only
  // offers to collapse, never hides the clues from a fresh reader.
  const [cluesOpen, setCluesOpen] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Which clue starts at (r,c) in a direction — and which clue COVERS a cell.
  const clueAt = useCallback(
    (r: number, c: number, d: Dir) => {
      const list = d === 'across' ? clues.across : clues.down
      return (
        list.find((cl) =>
          d === 'across'
            ? cl.row === r && c >= cl.col && c < cl.col + cl.answer.length
            : cl.col === c && r >= cl.row && r < cl.row + cl.answer.length,
        ) ?? null
      )
    },
    [clues],
  )

  const activeClue = active ? clueAt(active.row, active.col, dir) : null

  // Cell numbers for rendering.
  const numberAt = useMemo(() => {
    const map = new Map<string, number>()
    for (const cl of [...clues.across, ...clues.down]) {
      const key = `${cl.row}:${cl.col}`
      const prev = map.get(key)
      if (prev === undefined || cl.number < prev) map.set(key, cl.number)
    }
    return map
  }, [clues])

  const solved = useMemo(() => {
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (grid[r][c] !== null && entries[r][c] !== grid[r][c]) return false
      }
    }
    return true
  }, [entries, grid, size])

  function selectCell(r: number, c: number) {
    if (grid[r][c] === null) return
    if (active && active.row === r && active.col === c) {
      // Second tap on the same cell flips direction — the standard gesture.
      const flipped: Dir = dir === 'across' ? 'down' : 'across'
      if (clueAt(r, c, flipped)) setDir(flipped)
    } else {
      setActive({ row: r, col: c })
      if (!clueAt(r, c, dir)) setDir(dir === 'across' ? 'down' : 'across')
    }
    inputRef.current?.focus()
  }

  function advance(from: CellRef, delta: 1 | -1): void {
    const dr = dir === 'down' ? delta : 0
    const dc = dir === 'across' ? delta : 0
    let r = from.row + dr
    let c = from.col + dc
    if (r >= 0 && r < size && c >= 0 && c < size && grid[r][c] !== null) {
      setActive({ row: r, col: c })
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!active) return
    const { key } = e
    if (/^[a-zA-Z]$/.test(key)) {
      e.preventDefault()
      setEntries((prev) => {
        const next = prev.map((row) => [...row])
        next[active.row][active.col] = key.toUpperCase()
        return next
      })
      setChecked(false)
      advance(active, 1)
    } else if (key === 'Backspace') {
      e.preventDefault()
      setEntries((prev) => {
        const next = prev.map((row) => [...row])
        if (next[active.row][active.col] === '') {
          // Empty cell: step back and clear that one instead.
          const dr = dir === 'down' ? -1 : 0
          const dc = dir === 'across' ? -1 : 0
          const r = active.row + dr
          const c = active.col + dc
          if (r >= 0 && c >= 0 && grid[r][c] !== null) {
            next[r][c] = ''
            setActive({ row: r, col: c })
          }
        } else {
          next[active.row][active.col] = ''
        }
        return next
      })
      setChecked(false)
    } else if (key === 'ArrowRight' || key === 'ArrowLeft') {
      e.preventDefault()
      setDir('across')
      advance(active, key === 'ArrowRight' ? 1 : -1)
    } else if (key === 'ArrowDown' || key === 'ArrowUp') {
      e.preventDefault()
      setDir('down')
      advance(active, key === 'ArrowDown' ? 1 : -1)
    }
  }

  const inActiveWord = (r: number, c: number): boolean => {
    if (!activeClue) return false
    return dir === 'across'
      ? r === activeClue.row &&
          c >= activeClue.col &&
          c < activeClue.col + activeClue.answer.length
      : c === activeClue.col &&
          r >= activeClue.row &&
          r < activeClue.row + activeClue.answer.length
  }

  return (
    <div className="puzzle-crossword">
      {/* The blank-area fix (founder: "crossword has a huge blank area"):
          grid and clue panel are grid siblings — desktop CSS sets the clues
          into the right half of the compartment that used to print empty. */}
      <div className="puzzle-cw-layout">
        <div className="puzzle-cw-main">
          {/* The active clue bar — pinned above the grid, the mobile survival
              pattern. Empty until a cell is chosen. */}
          <p className="puzzle-cw-cluebar" aria-live="polite">
            {activeClue ? (
              <>
                <span className="puzzle-cw-cluenum">
                  {activeClue.number} {dir}
                </span>{' '}
                {activeClue.clue}
              </>
            ) : (
              <span className="puzzle-built-empty">Tap a square to begin.</span>
            )}
          </p>

          <div className="puzzle-cw-wrap">
            <div
              className="puzzle-cw-grid"
              role="grid"
              aria-label="Crossword grid"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  if (cell === null) {
                    return (
                      <span
                        key={`${r}:${c}`}
                        className="puzzle-cw-block"
                        aria-hidden="true"
                      />
                    )
                  }
                  const num = numberAt.get(`${r}:${c}`)
                  const isActive = active?.row === r && active?.col === c
                  const entry = entries[r][c]
                  const wrong = checked && entry !== '' && entry !== cell
                  const cls = [
                    'puzzle-cw-cell',
                    isActive ? 'puzzle-cw-active' : '',
                    !isActive && inActiveWord(r, c) ? 'puzzle-cw-word' : '',
                    wrong ? 'puzzle-cw-wrongcell' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <button
                      key={`${r}:${c}`}
                      type="button"
                      role="gridcell"
                      className={cls}
                      onClick={() => selectCell(r, c)}
                      aria-label={`Row ${r + 1} column ${c + 1}${entry ? `, ${entry}` : ', empty'}`}
                    >
                      {num !== undefined && (
                        <span className="puzzle-cw-num">{num}</span>
                      )}
                      <span className="puzzle-cw-letter">{entry}</span>
                    </button>
                  )
                }),
              )}
            </div>

            {/* One hidden input carries the keyboard for the whole grid. */}
            <input
              ref={inputRef}
              className="puzzle-cw-input"
              onKeyDown={handleKey}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Crossword entry"
              value=""
              onChange={(e) => {
                // Mobile keyboards deliver through onChange rather than key events.
                const ch = e.target.value.slice(-1)
                if (/^[a-zA-Z]$/.test(ch) && active) {
                  setEntries((prev) => {
                    const next = prev.map((row) => [...row])
                    next[active.row][active.col] = ch.toUpperCase()
                    return next
                  })
                  setChecked(false)
                  advance(active, 1)
                }
              }}
            />
          </div>

          <div className="puzzle-cw-actions">
            {solved ? (
              <p className="puzzle-score" aria-live="polite">
                Finished. Same time tomorrow.
              </p>
            ) : (
              <button
                type="button"
                className="puzzle-cw-check"
                onClick={() => setChecked(true)}
              >
                Check my letters
              </button>
            )}
          </div>
        </div>

        <div
          className={`puzzle-cw-cluelists${cluesOpen ? '' : ' puzzle-cw-cluelists--closed'}`}
        >
          <button
            type="button"
            className="puzzle-cw-cluetoggle"
            aria-expanded={cluesOpen}
            onClick={() => setCluesOpen((v) => !v)}
          >
            {cluesOpen ? 'Hide clues' : 'All clues'}
          </button>
          <div className="puzzle-cw-cluecols">
            <div>
              <p className="puzzle-cw-listhead">Across</p>
              <ol>
                {clues.across.map((cl) => (
                  <li key={`a${cl.number}`} value={cl.number}>
                    {cl.clue}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="puzzle-cw-listhead">Down</p>
              <ol>
                {clues.down.map((cl) => (
                  <li key={`d${cl.number}`} value={cl.number}>
                    {cl.clue}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
