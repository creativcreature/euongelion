import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import ModuleRenderer from '@/components/ModuleRenderer'

// Auto-cleanup is not configured for this suite, so every render accumulated in
// the document and React's scheduler kept flushing after the test environment
// was torn down ("window is not defined"). Unmounting between tests removes the
// noise and stops role queries from matching a previous test's markup.
afterEach(cleanup)

/**
 * Regression guard for the Jabez ship (2026-07-12, SA-029/F-081):
 * normalizeModule destructured `content` off every module and only
 * restored it when it was a nested OBJECT (legacy Substack shape).
 * The canonical flat format — `content` as the prose string, exactly
 * as the Module type declares — was silently discarded, so teaching /
 * story / insight / pullquote modules rendered as empty bordered
 * panels on every day page. These tests render the REAL components
 * and assert the prose reaches the DOM.
 */
describe('ModuleRenderer — flat string `content` (canonical format)', () => {
  it('renders teaching prose from a flat content string', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'teaching',
          heading: 'The Names That Stick',
          content: 'Somebody named you. Probably without a birth certificate.',
        }}
      />,
    )
    expect(screen.getByText(/Somebody named you/)).toBeInTheDocument()
    expect(screen.getByText('The Names That Stick')).toBeInTheDocument()
  })

  it('renders story prose from a flat content string', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'story',
          heading: 'The Boy Born Dead',
          content:
            'On October 28, 1953, a baby was delivered without a heartbeat.',
        }}
      />,
    )
    expect(
      screen.getByText(/delivered without a heartbeat/),
    ).toBeInTheDocument()
  })

  it('renders insight prose from a flat content string', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'insight',
          content: 'The grant did not run along the bloodline.',
        }}
      />,
    )
    expect(
      screen.getByText(/did not run along the bloodline/),
    ).toBeInTheDocument()
  })

  it('renders pullquote text from a flat content string', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'pullquote',
          content: 'The sentence has one subject.',
        }}
      />,
    )
    expect(screen.getByText(/The sentence has one subject/)).toBeInTheDocument()
  })

  it('still spreads legacy nested-object content shapes', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'teaching',
          content: { content: 'Nested legacy prose survives.' } as never,
        }}
      />,
    )
    expect(screen.getByText(/Nested legacy prose survives/)).toBeInTheDocument()
  })

  it('still maps legacy body -> content', () => {
    render(
      <ModuleRenderer
        module={
          {
            type: 'teaching',
            body: 'Legacy body prose survives.',
          } as never
        }
      />,
    )
    expect(screen.getByText(/Legacy body prose survives/)).toBeInTheDocument()
  })
})

/**
 * Regression guard for the Harvest ship (2026-07-26, SA-030/SA-031/
 * F-082): the Two-Minute Open `cta` module and the riso `inline-image`
 * module are silent-drop hazards — CtaModule returns null when
 * ctaLabel/ctaHref are missing, and a renderer regression would strip
 * them exactly like the Jabez flat-content bug above. Render the REAL
 * components and assert the DOM.
 */
describe('ModuleRenderer — cta + inline-image (Harvest shapes)', () => {
  it('renders the DEEP DIVE cta with label, href, and subtext', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'cta',
          ctaLabel: 'DEEP DIVE',
          ctaHref: '#devotional-section-6',
          ctaSubtext: 'That was a whole reading.',
        }}
      />,
    )
    const link = screen.getByRole('link', { name: /DEEP DIVE/ })
    expect(link).toHaveAttribute('href', '#devotional-section-6')
    expect(screen.getByText(/That was a whole reading/)).toBeInTheDocument()
  })

  // SA-034 (2026-08-10): the Two-Minute Open gained a short write-up ABOUT the
  // anchor scripture between the vocab word and the reflection, which pushes
  // the deep dive's first module to index 6 -> section id 7. Both the extra
  // teaching module and the retargeted cta are silent-drop hazards of exactly
  // the kind that shipped blank panels on the Jabez build.
  it('renders the v2 open write-up about the anchor scripture', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'teaching',
          heading: 'What the Verse Is Doing',
          content:
            'Hosea is not describing wickedness so much as management — a nation with working altars and a foreign policy.',
        }}
      />,
    )
    expect(
      screen.getByText(/working altars and a foreign policy/),
    ).toBeInTheDocument()
  })

  it('renders the v2 cta pointing past a six-module open', () => {
    // Scoped to this render's own container so the assertion stays correct even
    // if the legacy-shape cta above is ever rendered alongside it.
    const { container } = render(
      <ModuleRenderer
        module={{
          type: 'cta',
          ctaLabel: 'DEEP DIVE',
          ctaHref: '#devotional-section-7',
          ctaSubtext: 'That can be the whole of today.',
        }}
      />,
    )
    const link = within(container).getByRole('link', { name: /DEEP DIVE/ })
    expect(link).toHaveAttribute('href', '#devotional-section-7')
  })

  it('renders a sabbath module written in the canonical flat shape', () => {
    // SA-034: SabbathModule read only scripture_anchor/invitation/prayerText,
    // so a sabbath day authored with flat `content` rendered an empty gap and
    // lost the entire body of the reading. Caught in the browser, not by curl.
    render(
      <ModuleRenderer
        module={{
          type: 'sabbath',
          heading: 'Where This Was Written',
          content:
            'The book is five poems written over the ruins of Jerusalem.\n\nAnd in the middle of it, a sentence about mornings.',
        }}
      />,
    )
    expect(
      screen.getByText(/five poems written over the ruins/),
    ).toBeInTheDocument()
    expect(screen.getByText(/a sentence about mornings/)).toBeInTheDocument()
    expect(screen.getByText('Where This Was Written')).toBeInTheDocument()
  })

  it('renders markdown emphasis in a sabbath module rather than raw asterisks', () => {
    // SA-034 follow-up: the first repair routed sabbath `content` through the
    // typographer, which handles quotes and dashes but not emphasis — so the
    // one italic span on the quietest page in the series printed its asterisks.
    const { container } = render(
      <ModuleRenderer
        module={{
          type: 'sabbath',
          content:
            'If words are needed, use four: *great is thy faithfulness.*',
        }}
      />,
    )
    expect(container.querySelector('em')).toHaveTextContent(
      'great is thy faithfulness.',
    )
    expect(container.textContent).not.toContain('*')
  })

  it('renders a recap module written in the canonical flat shape', () => {
    // SA-034: RecapModule required a `days` array and returned null otherwise,
    // so a recap authored with flat `content` rendered nothing — and on a recap
    // day that is the entire reading.
    render(
      <ModuleRenderer
        module={{
          type: 'recap',
          heading: 'The Week, Walked Back',
          content:
            '**Monday.** Hosea addressed a working nation, not a ruined one.\n\n**Tuesday.** The serpent offered a likeness already given.',
        }}
      />,
    )
    expect(
      screen.getByText(/Hosea addressed a working nation/),
    ).toBeInTheDocument()
    expect(screen.getByText(/a likeness already given/)).toBeInTheDocument()
  })

  it('renders an inline-image with src, alt, and caption', () => {
    render(
      <ModuleRenderer
        module={{
          type: 'inline-image',
          inlineImageSrc: '/images/series/the-harvest/day1-banner.webp',
          inlineImageAlt:
            'A cloaked figure slipping away through a moonlit field',
          inlineImageCaption: 'While everyone slept, the enemy came.',
          inlineImageWidth: 'bleed',
        }}
      />,
    )
    const img = screen.getByAltText(/cloaked figure slipping away/)
    expect(img).toBeInTheDocument()
    expect(screen.getByText(/While everyone slept/)).toBeInTheDocument()
  })
})
