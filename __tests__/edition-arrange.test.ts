/**
 * SA-114 / F-158 — the paper's layout varies daily (founder, 2026-08-20:
 * "Ensure the Daily bread layout is a different layout daily... same modules
 * but slightly altered layouts, but staple things staying anchored daily.
 * 3 anchors.")
 *
 * The three anchors: the LEAD opens the paper, the FUNNIES hold their spot
 * mid-paper, the READING (with audio) closes it. Everything else shuffles on
 * a day-of-week rotation — deterministic from the edition date, so the
 * arrangement flips with the 7am boundary and every reader sees the same
 * paper.
 *
 * The shuffle must never recreate the clustering the founder rejected:
 * no two GAME rows (crossword / verse-rebuilt / word search) may ever sit
 * adjacent, in any variant.
 */
import { describe, expect, it } from 'vitest'
import {
  arrangeSheetRows,
  SHEET_ROW_KEYS,
  FUNNIES_INDEX,
  GAME_ROWS,
} from '@/lib/edition/arrange'

const WEEK = [
  '2026-08-16', // Sunday
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
  '2026-08-20',
  '2026-08-21',
  '2026-08-22', // Saturday
]

describe('the daily sheet arrangement', () => {
  it('every weekday carries the same modules — nothing dropped, nothing doubled', () => {
    for (const iso of WEEK) {
      const rows = arrangeSheetRows(new Date(`${iso}T12:00:00Z`))
      expect([...rows].sort()).toEqual([...SHEET_ROW_KEYS].sort())
    }
  })

  it('the funnies are anchored: same index every single day', () => {
    for (const iso of WEEK) {
      const rows = arrangeSheetRows(new Date(`${iso}T12:00:00Z`))
      expect(rows[FUNNIES_INDEX]).toBe('funnies')
    }
  })

  it('game rows are never adjacent, any day', () => {
    for (const iso of WEEK) {
      const rows = arrangeSheetRows(new Date(`${iso}T12:00:00Z`))
      for (let i = 0; i + 1 < rows.length; i++) {
        const pair = [rows[i], rows[i + 1]]
        const games = pair.filter((k) =>
          (GAME_ROWS as readonly string[]).includes(k),
        )
        expect(games.length, `${iso}: ${pair.join(' then ')}`).toBeLessThan(2)
      }
    }
  })

  it('the week holds at least five distinct arrangements, and the same date always answers the same', () => {
    const shapes = WEEK.map((iso) =>
      arrangeSheetRows(new Date(`${iso}T12:00:00Z`)).join('|'),
    )
    expect(new Set(shapes).size).toBeGreaterThanOrEqual(5)
    expect(arrangeSheetRows(new Date('2026-08-20T12:00:00Z')).join('|')).toBe(
      arrangeSheetRows(new Date('2026-08-20T12:00:00Z')).join('|'),
    )
  })
})
