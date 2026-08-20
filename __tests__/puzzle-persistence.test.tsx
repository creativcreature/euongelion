/**
 * SA-114 / F-158 — founder, 2026-08-20: "It should also save and remember
 * user choices etc. I filled out the word search early... refreshed the
 * page and my entries were lost."
 *
 * The contract: puzzle progress survives a reload. Each puzzle persists to
 * localStorage under a key derived from its OWN content (theme/words/clues),
 * so a new day's puzzle naturally starts clean while today's remembers.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import React from 'react'
import WordSearchClient from '@/components/edition/puzzles/WordSearchClient'
import CrosswordClient from '@/components/edition/puzzles/CrosswordClient'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

const wsPuzzle = {
  theme: 'Test',
  size: 4,
  grid: [
    ['C', 'A', 'T', 'X'],
    ['Q', 'Z', 'P', 'L'],
    ['D', 'O', 'G', 'M'],
    ['B', 'N', 'V', 'W'],
  ],
  words: ['CAT', 'DOG'],
  placements: [
    { word: 'CAT', row: 0, col: 0, dRow: 0, dCol: 1 },
    { word: 'DOG', row: 2, col: 0, dRow: 0, dCol: 1 },
  ],
}

const cwPuzzle = {
  size: 3,
  source: 'test',
  grid: [
    ['C', 'A', 'T'],
    ['O', null, null],
    ['W', null, null],
  ],
  clues: {
    across: [{ number: 1, row: 0, col: 0, clue: 'House lion', answer: 'CAT' }],
    down: [{ number: 1, row: 0, col: 0, clue: 'It moos', answer: 'COW' }],
  },
}

describe('word search progress survives a reload', () => {
  it('a found word (and its red circle) is still there after unmount/remount', async () => {
    const user = userEvent.setup()
    const first = render(<WordSearchClient puzzle={wsPuzzle as never} />)
    await user.click(
      screen.getByRole('gridcell', { name: 'Row 1 column 1, C' }),
    )
    await user.click(
      screen.getByRole('gridcell', { name: 'Row 1 column 3, T' }),
    )
    expect(first.container.querySelectorAll('.puzzle-ws-circle').length).toBe(1)
    first.unmount()

    const second = render(<WordSearchClient puzzle={wsPuzzle as never} />)
    // restored: the found count line and the circle overlay both return
    expect(await screen.findByText(/1 of 2 found/i)).toBeTruthy()
    expect(second.container.querySelectorAll('.puzzle-ws-circle').length).toBe(
      1,
    )
  })
})

describe('crossword entries survive a reload', () => {
  it('a typed letter is still on the grid after unmount/remount', async () => {
    const user = userEvent.setup()
    const first = render(<CrosswordClient puzzle={cwPuzzle as never} />)
    await user.click(
      screen.getByRole('gridcell', { name: 'Row 1 column 1, empty' }),
    )
    await user.keyboard('C')
    first.unmount()

    render(<CrosswordClient puzzle={cwPuzzle as never} />)
    expect(
      await screen.findByRole('gridcell', { name: 'Row 1 column 1, C' }),
    ).toBeTruthy()
  })
})
