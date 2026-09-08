import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import ModuleRenderer from '@/components/ModuleRenderer'

afterEach(cleanup)

/**
 * Rendered-DOM assertion for Sought and Crowned (SA-135 / F-179).
 *
 * devo-go Phase 12 and traps §1 both require this and it was skipped on the
 * first ship: the series was verified with curl against production, which
 * proves the bytes are delivered and proves nothing about whether they paint.
 * The precedent is the Jabez ship (2026-07-12), where every day page returned
 * a perfect JSON payload over HTTP while the reader rendered empty panels,
 * because normalizeModule discarded flat string `content`.
 *
 * Since the bordered panels were removed on 2026-07-22, a null render now
 * ships a SILENT GAP rather than a visible empty box — harder to spot, so the
 * assertion matters more, not less.
 *
 * These tests read the REAL shipped day files rather than fixtures, so they
 * fail if the authored shape ever drifts from what the renderer accepts.
 */
const DIR = path.join(process.cwd(), 'public/devotionals')
const days = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
  day: d,
  data: JSON.parse(
    fs.readFileSync(path.join(DIR, `sought-and-crowned-day-${d}.json`), 'utf8'),
  ),
}))

// Module types that carry reader-facing prose in `content`. If one of these
// renders nothing, a whole section of the reading is missing from the page.
const PROSE = new Set(['teaching', 'story', 'insight', 'recap', 'sabbath'])

describe('Sought and Crowned — every prose module reaches the DOM', () => {
  days.forEach(({ day, data }) => {
    it(`day ${day}: every prose module paints`, () => {
      const prose = data.modules.filter(
        (m: { type: string; content?: unknown }) =>
          PROSE.has(m.type) && typeof m.content === 'string',
      )
      expect(prose.length).toBeGreaterThan(0)

      prose.forEach((m: { type: string; content: string }) => {
        const { container, unmount } = render(<ModuleRenderer module={m} />)
        // Take a distinctive run of words from the middle of the module so the
        // assertion cannot pass on a heading alone.
        const words = m.content
          .replace(/[#*>_`]/g, ' ')
          .split(/\s+/)
          .filter(Boolean)
        const probe = words.slice(6, 12).join(' ')
        expect(
          container.textContent?.replace(/\s+/g, ' '),
          `${m.type} module rendered empty on day ${day}`,
        ).toContain(probe.replace(/\s+/g, ' '))
        unmount()
      })
    })
  })
})

describe('Sought and Crowned — the Two-Minute Open v2 sequence paints', () => {
  days.forEach(({ day, data }) => {
    if (data.format !== 'two-minute-open-v2') return
    it(`day ${day}: opens scripture → vocab → teaching → reflection → prayer → cta`, () => {
      const seq = data.modules
        .slice(0, 6)
        .map((m: { type: string }) => m.type)
      expect(seq).toEqual([
        'scripture',
        'vocab',
        'teaching',
        'reflection',
        'prayer',
        'cta',
      ])

      // The cta is the silent-drop hazard: CtaModule returns null when its
      // label or href is missing, which would strand the reader at the end of
      // the open with no route into the deep dive.
      const cta = data.modules[5]
      const { container } = render(<ModuleRenderer module={cta} />)
      const link = container.querySelector('a[href="#devotional-section-7"]')
      expect(link, `day ${day} cta did not render a deep-dive link`).not.toBeNull()
    })
  })
})

describe('Sought and Crowned — plates and vocab paint', () => {
  it('every inline-image renders with its alt text and caption', () => {
    days.forEach(({ day, data }) => {
      const imgs = data.modules.filter(
        (m: { type: string }) => m.type === 'inline-image',
      )
      expect(imgs.length, `day ${day} has fewer than 3 plates`).toBeGreaterThanOrEqual(3)
      imgs.forEach((m: { inlineImageAlt: string; inlineImageCaption: string }) => {
        const { container, unmount } = render(<ModuleRenderer module={m} />)
        expect(container.querySelector('img')).not.toBeNull()
        expect(container.textContent).toContain(
          m.inlineImageCaption.slice(0, 24),
        )
        unmount()
      })
    })
  })

  it('the Hebrew and Greek vocab modules render their transliteration', () => {
    days.forEach(({ day, data }) => {
      const vocab = data.modules.filter(
        (m: { type: string }) => m.type === 'vocab',
      )
      vocab.forEach((m: { word: string; transliteration: string }) => {
        const { container, unmount } = render(<ModuleRenderer module={m} />)
        const text = container.textContent ?? ''
        expect(text, `day ${day} vocab lost its word`).toContain(m.word)
        expect(
          text,
          `day ${day}: ${m.word} rendered without transliteration`,
        ).toContain(m.transliteration)
        unmount()
      })
    })
  })
})

describe("Sought and Crowned — Christ's words keep their attribution", () => {
  it('every module the resolver marked red still carries redLetter on disk', () => {
    const marked = days.flatMap(({ day, data }) =>
      data.modules
        .filter((m: { redLetter?: string[] }) => Array.isArray(m.redLetter))
        .map((m: { reference: string; redLetter: string[] }) => ({
          day,
          reference: m.reference,
          spans: m.redLetter,
        })),
    )
    // The resolver marked Luke 19:10 and Luke 14:21; Ezekiel and the epistles
    // stay black. A regression that dropped attribution would empty this.
    expect(marked.length).toBeGreaterThan(0)
    marked.forEach((m) => {
      expect(m.spans.length, `${m.reference} marked red with no spans`).toBeGreaterThan(0)
    })
  })
})
