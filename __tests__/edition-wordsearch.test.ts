import { describe, expect, it } from 'vitest'
import {
  WORD_SEARCH_BANK,
  WORD_SEARCH_SIZE,
  buildWordSearch,
} from '@/lib/edition/wordsearch'

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** A run of consecutive UTC dates starting at `iso`. */
function days(iso: string, count: number): Date[] {
  const start = Date.parse(`${iso}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) => new Date(start + i * 86400000))
}

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

/** Independent finder: is `word` spelled along a straight run of the grid? */
function gridContains(grid: string[][], word: string): boolean {
  const size = grid.length
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      for (const [dr, dc] of DIRECTIONS) {
        const endRow = row + dr * (word.length - 1)
        const endCol = col + dc * (word.length - 1)
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) {
          continue
        }
        let i = 0
        while (
          i < word.length &&
          grid[row + dr * i][col + dc * i] === word[i]
        ) {
          i += 1
        }
        if (i === word.length) return true
      }
    }
  }
  return false
}

describe('the word search — determinism', () => {
  it('builds the same puzzle twice for the same date', () => {
    const a = buildWordSearch(utc('2026-08-19'))
    const b = buildWordSearch(new Date(utc('2026-08-19').getTime()))
    expect(a).toEqual(b)
  })

  it('keys off the UTC day, not the wall clock', () => {
    const morning = buildWordSearch(new Date('2026-08-19T00:14:00Z'))
    const evening = buildWordSearch(new Date('2026-08-19T23:46:00Z'))
    expect(morning).toEqual(evening)
  })

  it('refuses an invalid or pre-epoch date instead of mis-rotating', () => {
    expect(() => buildWordSearch(new Date(NaN))).toThrow(/invalid Date/)
    expect(() => buildWordSearch(utc('1969-12-31'))).toThrow(
      /before 1970-01-01/,
    )
  })
})

describe('the word search — 60 consecutive dates', () => {
  // 60 days at one theme a day walks past the whole 45-set bank, so this
  // loop is the proof that EVERY set places — a set that cannot place throws
  // and the day it owns fails here.
  const run = days('2026-08-19', 60).map((date) => buildWordSearch(date))

  it('covers the entire bank, so every set is proven to place', () => {
    expect(WORD_SEARCH_BANK.length).toBeGreaterThanOrEqual(40)
    expect(WORD_SEARCH_BANK.length).toBeLessThanOrEqual(60)
    const themes = new Set(run.map((p) => p.theme))
    expect(themes.size).toBe(WORD_SEARCH_BANK.length)
  })

  it('always hands back a 12x12 grid of uppercase A-Z', () => {
    for (const puzzle of run) {
      expect(puzzle.grid).toHaveLength(WORD_SEARCH_SIZE)
      for (const row of puzzle.grid) {
        expect(row).toHaveLength(WORD_SEARCH_SIZE)
        for (const cell of row) {
          expect(cell).toMatch(/^[A-Z]$/)
        }
      }
    }
  })

  it('really contains every listed word in some direction', () => {
    for (const puzzle of run) {
      for (const word of puzzle.words) {
        expect(
          gridContains(puzzle.grid, word),
          `"${word}" missing from the "${puzzle.theme}" grid`,
        ).toBe(true)
      }
    }
  })

  it('lists the theme set verbatim — 6-9 words, 4-10 letters A-Z', () => {
    for (const puzzle of run) {
      const set = WORD_SEARCH_BANK.find((s) => s.theme === puzzle.theme)
      expect(set).toBeDefined()
      expect(puzzle.words).toEqual([...(set?.words ?? [])])
      expect(puzzle.words.length).toBeGreaterThanOrEqual(6)
      expect(puzzle.words.length).toBeLessThanOrEqual(9)
      for (const word of puzzle.words) {
        expect(word).toMatch(/^[A-Z]{4,10}$/)
      }
    }
  })

  it('never repeats a theme within 30 days', () => {
    for (let start = 0; start + 30 <= run.length; start += 1) {
      const window = run.slice(start, start + 30).map((p) => p.theme)
      expect(new Set(window).size).toBe(30)
    }
  })
})
