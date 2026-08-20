/**
 * SA-114 / F-158 — founder: "The page can also have a color by the number
 * kinda thing, where they can fill in premade art either using a crayon
 * scribble or a color dropper. So its a mini art game."
 *
 * Contract: premade line art with numbered regions; tapping a region fills
 * it with the selected crayon as a scribble; the dropper picks up a color
 * from a filled region; progress persists (same store as the puzzles).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import React from 'react'
import ColoringClient from '@/components/edition/puzzles/ColoringClient'
import { COLORING_BANK, pickColoringForDay } from '@/data/coloring-bank'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

describe('the coloring corner', () => {
  it('the bank rotates deterministically by day and every artwork has numbered regions', () => {
    expect(COLORING_BANK.length).toBeGreaterThanOrEqual(3)
    for (const art of COLORING_BANK) {
      expect(art.regions.length).toBeGreaterThanOrEqual(5)
      for (const r of art.regions) expect(r.n).toBeGreaterThanOrEqual(1)
    }
    const a = pickColoringForDay(new Date('2026-08-20T12:00:00Z'))
    const b = pickColoringForDay(new Date('2026-08-20T18:00:00Z'))
    expect(a.id).toBe(b.id)
  })

  it('tapping a region fills it with the selected crayon, and it survives a reload', async () => {
    const user = userEvent.setup()
    const art = COLORING_BANK[0]
    const first = render(<ColoringClient art={art} />)
    const region = first.container.querySelector('[data-region="0"]')!
    expect(region.getAttribute('fill')).toBe('none')
    await user.click(screen.getByRole('button', { name: /crayon 2/i }))
    await user.click(region as HTMLElement)
    expect(region.getAttribute('fill')).toContain('url(#')
    first.unmount()

    const second = render(<ColoringClient art={art} />)
    expect(
      second.container.querySelector('[data-region="0"]')!.getAttribute('fill'),
    ).toContain('url(#')
  })

  it('the dropper picks up the color of a filled region', async () => {
    const user = userEvent.setup()
    const art = COLORING_BANK[0]
    const { container } = render(<ColoringClient art={art} />)
    await user.click(screen.getByRole('button', { name: /crayon 3/i }))
    await user.click(
      container.querySelector('[data-region="1"]') as HTMLElement,
    )
    // switch crayon, then use the dropper on the region we filled
    await user.click(screen.getByRole('button', { name: /crayon 1/i }))
    await user.click(screen.getByRole('button', { name: /dropper/i }))
    await user.click(
      container.querySelector('[data-region="1"]') as HTMLElement,
    )
    // dropper picked crayon 3 — the next tap paints with it
    await user.click(
      container.querySelector('[data-region="2"]') as HTMLElement,
    )
    expect(
      container.querySelector('[data-region="2"]')!.getAttribute('fill'),
    ).toBe(container.querySelector('[data-region="1"]')!.getAttribute('fill'))
  })
})
