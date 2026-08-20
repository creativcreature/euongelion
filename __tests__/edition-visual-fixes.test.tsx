/**
 * SA-114 / F-158 — the founder's morning critique, wave one (2026-08-20):
 *
 *  1. "The comic is the wrong format and is being cropped. It needs to be
 *     shown in full and be responsive." — StripPanel renders the strip at
 *     its OWN aspect ratio (width/height from the payload when present),
 *     never cover-cropped into a fixed 3:2 box.
 *  2. "Anything that is red letter Jesus should appear in red." — the Red
 *     Letters quote carries the red-letter class the CSS paints crimson.
 *  3. "The [word search] needs to look like someone circled the words upon
 *     selection — red circle." — a found word draws a red capsule over its
 *     run in an SVG overlay; the overlay grows one capsule per found word.
 *  4. "Where is this from says 3/3 but no idea what that is in reference
 *     to." — every quiz instance explains itself in one line.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import React from 'react'
import {
  StripPanel,
  RedLetterColumn,
} from '@/components/edition/EditionSections'
import WordSearchClient from '@/components/edition/puzzles/WordSearchClient'

afterEach(cleanup)

describe('the strip prints in full (no crop)', () => {
  it('renders at the payload aspect ratio with intrinsic dimensions, not a cover-cropped fill', () => {
    const { container } = render(
      <StripPanel
        strip={{
          image: '/images/edition/strip/echo-dust-001b.jpg',
          alt: 'the strip',
          caption: 'Echo & Dust — No. 1',
          panelId: 'echo-dust-001b',
          width: 1745,
          height: 850,
        }}
      />,
    )
    const img = container.querySelector('img')!
    expect(img.getAttribute('width')).toBe('1745')
    expect(img.getAttribute('height')).toBe('850')
    // the plate must not carry the fixed-ratio cover crop
    const plate = container.querySelector('.edition-strip-plate')!
    expect(plate.className).toContain('edition-strip-plate--intrinsic')
  })
})

describe('the red letters are red', () => {
  it('the quote carries the red-letter voice class', () => {
    const { container } = render(
      <RedLetterColumn
        saying={{
          text: 'Come to Me, all you who are weary.',
          reference: 'Matthew 11:28',
          translation: 'BSB',
        }}
      />,
    )
    const quote = container.querySelector('.edition-redletter-text')!
    expect(quote.className).toContain('red-letter-voice')
  })
})

describe('found words get circled in red', () => {
  const puzzle = {
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

  it('tapping both ends of a word adds a red capsule to the overlay', async () => {
    const user = userEvent.setup()
    const { container } = render(<WordSearchClient puzzle={puzzle as never} />)
    expect(container.querySelectorAll('.puzzle-ws-circle').length).toBe(0)
    await user.click(
      screen.getByRole('gridcell', { name: 'Row 1 column 1, C' }),
    )
    await user.click(
      screen.getByRole('gridcell', { name: 'Row 1 column 3, T' }),
    )
    const circles = container.querySelectorAll('.puzzle-ws-circle')
    expect(circles.length).toBe(1)
  })
})
