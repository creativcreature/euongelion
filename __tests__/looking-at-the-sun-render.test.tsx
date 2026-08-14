import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ModuleRenderer from '@/components/ModuleRenderer'

afterEach(cleanup)

/**
 * Rendered-DOM assertion for the commissioned reading (SA-036 / F-087).
 *
 * The devo-go pipeline requires this because curl proves delivery, not
 * rendering: a module the renderer cannot normalise ships a silent gap in the
 * page (the bordered empty panels that made the 2026-07-12 regression visible
 * were removed in July, so a null render now looks like nothing at all).
 *
 * This mounts the REAL day file rather than fixtures, so a field renamed in the
 * content or dropped by a future normaliser fails here instead of in
 * production.
 */
const DAY = JSON.parse(
  readFileSync(
    join(process.cwd(), 'public/devotionals/looking-at-the-sun-day-1.json'),
    'utf-8',
  ),
) as { modules: Array<Record<string, unknown>> }

describe('looking-at-the-sun day 1 — every module reaches the DOM', () => {
  it('renders all 28 modules without producing an empty page', () => {
    expect(DAY.modules).toHaveLength(28)
    for (const mod of DAY.modules) {
      const { container } = render(<ModuleRenderer module={mod as never} />)
      expect(
        container.textContent?.trim().length ?? 0,
        `module "${String(mod.type)}" rendered nothing`,
      ).toBeGreaterThan(0)
      cleanup()
    }
  })

  it('renders the two-minute open so a reader who stops at the CTA has a whole reading', () => {
    for (const mod of DAY.modules.slice(0, 6)) {
      render(<ModuleRenderer module={mod as never} />)
    }
    // Anchor scripture, the day's word, the write-up, and the way out.
    expect(
      screen.getAllByText(/they shall run, and not be weary/).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/qavah/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Who This Was Said To/).length).toBeGreaterThan(
      0,
    )
    expect(screen.getAllByText(/DEEP DIVE/).length).toBeGreaterThan(0)
  })

  it('renders the deep dive prose that carries the teaching', () => {
    for (const mod of DAY.modules.slice(6)) {
      render(<ModuleRenderer module={mod as never} />)
    }
    // One assertion per prose-bearing module type used in the deep dive.
    expect(screen.getAllByText(/Looking unto Jesus/).length).toBeGreaterThan(0) // scripture
    expect(
      screen.getAllByText(/hapax|not found anywhere else/i).length,
    ).toBeGreaterThan(0) // teaching
    expect(screen.getAllByText(/aphoraō/).length).toBeGreaterThan(0) // vocab
    expect(screen.getAllByText(/Get up and eat/).length).toBeGreaterThan(0) // teaching C
    expect(screen.getAllByText(/only stand and waite/).length).toBeGreaterThan(
      0,
    ) // story
    expect(screen.getAllByText(/demeurer en repos/).length).toBeGreaterThan(0) // insight
    expect(screen.getAllByText(/Martha of Bethany/).length).toBeGreaterThan(0) // profile
  })

  it('keeps both inline images pointed at files that exist in the repo', () => {
    const images = DAY.modules.filter((m) => m.type === 'inline-image')
    expect(images).toHaveLength(2)
    for (const image of images) {
      const src = String(image.inlineImageSrc)
      expect(src.startsWith('/images/')).toBe(true)
      expect(() =>
        readFileSync(join(process.cwd(), 'public', src)),
      ).not.toThrow()
      // The caption IS the contextual justification for the image being used.
      expect(String(image.inlineImageCaption).length).toBeGreaterThan(40)
      expect(String(image.inlineImageAlt).length).toBeGreaterThan(20)
    }
  })
})
