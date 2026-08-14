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
type Day = { modules: Array<Record<string, unknown>>; chiasm_position: string }

const DAYS: Day[] = [1, 2, 3, 4, 5, 6, 7].map(
  (n) =>
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          `public/devotionals/looking-at-the-sun-day-${n}.json`,
        ),
        'utf-8',
      ),
    ) as Day,
)
const DAY = DAYS[0]

describe('looking-at-the-sun — every module of every day reaches the DOM', () => {
  it('renders every module of all seven days without producing an empty page', () => {
    expect(DAYS).toHaveLength(7)
    expect(DAYS.map((d) => d.chiasm_position)).toEqual([
      'A',
      'B',
      'C',
      'B-prime',
      'A-prime',
      'recap',
      'sabbath',
    ])
    for (const mod of DAYS.flatMap((d) => d.modules)) {
      const { container } = render(<ModuleRenderer module={mod as never} />)
      expect(
        container.textContent?.trim().length ?? 0,
        `module "${String(mod.type)}" rendered nothing`,
      ).toBeGreaterThan(0)
      cleanup()
    }
  })

  // Days 1-6 declare two-minute-open-v2; day 7 (sabbath) is its own short form.
  it.each([0, 1, 2, 3, 4, 5])(
    'renders day %i+1 two-minute open so a reader who stops at the CTA has a whole reading',
    (i) => {
      for (const mod of DAYS[i].modules.slice(0, 6)) {
        render(<ModuleRenderer module={mod as never} />)
      }
      // The open's own word study and its way out must both reach the DOM.
      expect(screen.getAllByText(/DEEP DIVE/).length).toBeGreaterThan(0)
      const vocab = DAYS[i].modules[1] as { transliteration?: string }
      expect(
        screen.getAllByText(new RegExp(String(vocab.transliteration))).length,
      ).toBeGreaterThan(0)
    },
  )

  it('renders the prose that carries each day of the week', () => {
    for (const mod of DAYS.flatMap((d) => d.modules)) {
      render(<ModuleRenderer module={mod as never} />)
    }
    // One distinctive phrase per day, spanning teaching, story, insight, vocab
    // and profile modules.
    const probes: RegExp[] = [
      /surely the people is grass/, // day 1 scripture
      /a rose plucked straight from a brier/, // day 1 story
      /medicinal qualities to the marsh/, // day 1 insight
      /not found anywhere else/i, // day 2 vocab
      /six years, to one/i, // day 2 story
      /Get up and eat, or the journey/, // day 3 scripture
      /a voice of a thin silence/, // day 3 vocab
      /would not give grace to the soul/, // day 3 story
      /noise and clutter of my kitchen/, // day 4 story
      /demeurer en repos/, // day 4 insight
      /only stand and waite/, // day 5 story
      /author and finisher/, // day 5 scripture
      /The Week, Gathered/, // day 6 recap
      /He maketh me to lie down/, // day 7 sabbath
    ]
    for (const probe of probes) {
      expect(
        screen.getAllByText(probe).length,
        `no element matched ${probe}`,
      ).toBeGreaterThan(0)
    }
  })

  it('keeps every inline image pointed at a file that exists in the repo', () => {
    const images = DAYS.flatMap((d) => d.modules).filter(
      (m) => m.type === 'inline-image',
    )
    expect(images.length).toBeGreaterThanOrEqual(7)
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
