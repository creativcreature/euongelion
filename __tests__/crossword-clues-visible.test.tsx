/**
 * SA-114 / F-158 follow-through of the founder's standing Daily Bread
 * critique: "crossword has a huge blank area."
 *
 * The blank area was structural: the grid sat in the left half of a wide
 * paper box while every clue hid behind a collapsed <details> below it —
 * the right half of the compartment was printed empty every day.
 *
 * The contract now:
 *  1. The clue lists (Across + Down, with their clue text) are ALWAYS in
 *     the DOM, as siblings of the grid inside a `.puzzle-cw-layout` wrapper,
 *     so desktop CSS can set them beside the grid where the blank was.
 *  2. There is NO <details> collapse. Mobile gets a toggle BUTTON with
 *     aria-expanded; visibility is class-driven (`--closed`), so wide
 *     viewports can override it in CSS and always show the clues.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import React from 'react'
import CrosswordClient from '@/components/edition/puzzles/CrosswordClient'
import type { CrosswordPayload } from '@/lib/edition/kinds'

afterEach(cleanup)

const puzzle: CrosswordPayload = {
  size: 3,
  source: 'Scripture words, generated for the test',
  grid: [
    ['C', 'A', 'T'],
    ['O', null, null],
    ['W', null, null],
  ],
  clues: {
    across: [
      {
        number: 1,
        row: 0,
        col: 0,
        clue: 'A small lion of the house',
        answer: 'CAT',
      },
    ],
    down: [
      {
        number: 1,
        row: 0,
        col: 0,
        clue: 'It lows in the manger story',
        answer: 'COW',
      },
    ],
  },
}

describe('the crossword clue panel (the blank-area fix)', () => {
  it('renders both clue lists in the DOM as siblings of the grid, inside the layout wrapper', () => {
    const { container } = render(<CrosswordClient puzzle={puzzle} />)
    const layout = container.querySelector('.puzzle-cw-layout')
    expect(layout).not.toBeNull()
    // clue text is present without any interaction
    expect(screen.getByText('A small lion of the house')).toBeTruthy()
    expect(screen.getByText('It lows in the manger story')).toBeTruthy()
    // the clue panel and the grid column are both direct children of the layout
    const cluePanel = container.querySelector('.puzzle-cw-cluelists')
    expect(cluePanel?.parentElement).toBe(layout)
    expect(
      layout?.querySelector('.puzzle-cw-main .puzzle-cw-grid'),
    ).not.toBeNull()
  })

  it('has no <details> collapse — the clues are not hidden behind a disclosure on desktop', () => {
    const { container } = render(<CrosswordClient puzzle={puzzle} />)
    expect(container.querySelector('details')).toBeNull()
  })

  it('clues print OPEN by default — a paper prints its clues (founder, 2026-08-21: mobile showed a bare grid)', async () => {
    const user = userEvent.setup()
    const { container } = render(<CrosswordClient puzzle={puzzle} />)
    const toggle = screen.getByRole('button', { name: /hide clues/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const panel = container.querySelector('.puzzle-cw-cluelists')
    expect(panel?.className).not.toContain('puzzle-cw-cluelists--closed')
    // the toggle collapses them class-driven, not unmounting
    await user.click(toggle)
    expect(
      screen
        .getByRole('button', { name: /all clues/i })
        .getAttribute('aria-expanded'),
    ).toBe('false')
    expect(panel?.className).toContain('puzzle-cw-cluelists--closed')
    // clue text never left the DOM
    expect(screen.getByText('A small lion of the house')).toBeTruthy()
  })
})
