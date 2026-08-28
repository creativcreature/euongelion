/**
 * The word search must FIT a phone, not hide columns behind an inner
 * scroll (founder, 2026-08-21: mobile consistency pass — the board
 * clipped two columns at 375px with no affordance). Under 420px the
 * cells go fluid, exactly like the crossword's. jsdom cannot evaluate
 * media queries, so this pins the stylesheet text the way the
 * styled-jsx guards do.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/app/globals.css', 'utf8')

describe('word-search mobile fit (SA-114 / F-158)', () => {
  it('has a narrow-viewport block that lifts the 34px cell floor', () => {
    const m = css.match(
      /@media \(max-width: 419px\) \{[^}]*\.puzzle-ws-grid \{([^}]*)\}/,
    )
    expect(m, 'narrow-viewport .puzzle-ws-grid override missing').toBeTruthy()
    const body = m![1]
    expect(body).toContain('minmax(0, 1fr)')
    expect(body).toContain('min-width: 0')
  })

  it('keeps the 34px floor for wider screens (the base rule is unchanged)', () => {
    expect(css).toContain(
      'grid-template-columns: repeat(12, minmax(34px, 1fr))',
    )
  })
})
