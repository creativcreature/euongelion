/**
 * How to read — the guide pages (/guides, /guides/[slug]).
 *
 * Founder 2026-08-18: the Daily Bread's three guide teasers "need to lead to
 * more robust pages that explain the section in more detail. They feel
 * incomplete right now." The contract under that:
 *
 *   - every GUIDES entry carries a slug, and every slug has a full essay in
 *     guide-essays.ts — a card without its page is exactly the incompleteness
 *     the founder named;
 *   - slugs are unique and kebab-case (they are route segments);
 *   - generateStaticParams covers all six, so every page is built statically;
 *   - each essay clears a real length floor (>400 words) — "robust" is the
 *     requirement, and a two-paragraph essay is a teaser with margins;
 *   - the expanded steps mirror the card's steps VERBATIM, index-aligned, so
 *     the page never contradicts the paper that led to it.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { existsSync } from 'fs'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GUIDES } from '@/data/daily-edition'
import { GUIDE_ESSAYS, getGuideEssay } from '@/data/guide-essays'
import GuidePage, { generateStaticParams } from '@/app/guides/[slug]/page'
import GuidesIndexPage from '@/app/guides/page'

vi.mock('@/components/EuangelionShellHeader', () => ({
  default: () => <div data-testid="shell-header" />,
}))

vi.mock('@/components/SiteBottom', () => ({
  default: () => <div data-testid="site-bottom" />,
}))

const wordCount = (paragraphs: string[]): number =>
  paragraphs.join(' ').split(/\s+/).filter(Boolean).length

describe('guide data contract', () => {
  it('has exactly the six expected slugs, kebab-case, unique', () => {
    const slugs = GUIDES.map((g) => g.slug)
    expect(slugs).toEqual([
      'read-a-whole-book',
      'who-is-speaking',
      'scripture-interprets-scripture',
      'lectio-divina',
      'word-roots',
      'read-together',
    ])
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('every guide has an essay, and every essay belongs to a guide', () => {
    const guideSlugs = GUIDES.map((g) => g.slug)
    const essaySlugs = GUIDE_ESSAYS.map((e) => e.slug)
    expect(essaySlugs.sort()).toEqual([...guideSlugs].sort())
    // The lookup THROWS on a missing essay — Rule 1, no thinner page.
    for (const slug of guideSlugs) {
      expect(getGuideEssay(slug).slug).toBe(slug)
    }
    expect(() => getGuideEssay('not-a-guide')).toThrow(/no guide essay/)
  })

  it('every essay clears the length floor (>400 words)', () => {
    for (const essay of GUIDE_ESSAYS) {
      const words = wordCount(essay.essay)
      expect(words, `${essay.slug}: ${words} words`).toBeGreaterThan(400)
    }
  })

  it('expanded steps mirror the card steps verbatim, index-aligned, each with real how-to', () => {
    for (const guide of GUIDES) {
      const essay = getGuideEssay(guide.slug)
      expect(essay.steps.map((s) => s.step)).toEqual(guide.steps)
      for (const detail of essay.steps) {
        // "2-3 sentences of how-to" — a one-liner is a caption, not a how.
        expect(
          detail.how.length,
          `${guide.slug}: "${detail.step}"`,
        ).toBeGreaterThan(120)
      }
    }
  })

  it('every essay carries 3-4 mistakes and 2-3 go-deeper passages, each explained', () => {
    for (const essay of GUIDE_ESSAYS) {
      expect(essay.mistakes.length).toBeGreaterThanOrEqual(3)
      expect(essay.mistakes.length).toBeLessThanOrEqual(4)
      for (const mistake of essay.mistakes) {
        expect(mistake.name.length).toBeGreaterThan(0)
        expect(mistake.body.length).toBeGreaterThan(40)
      }
      expect(essay.goDeeper.length).toBeGreaterThanOrEqual(2)
      expect(essay.goDeeper.length).toBeLessThanOrEqual(3)
      for (const passage of essay.goDeeper) {
        expect(passage.reference.length).toBeGreaterThan(0)
        expect(passage.why.length).toBeGreaterThan(20)
      }
    }
  })

  it('every guide plate exists on disk', () => {
    for (const guide of GUIDES) {
      const file = path.join(process.cwd(), 'public', guide.image)
      expect(existsSync(file), guide.image).toBe(true)
    }
  })
})

describe('/guides/[slug] route', () => {
  afterEach(cleanup)

  it('generateStaticParams covers all six guides', () => {
    expect(generateStaticParams()).toEqual(
      GUIDES.map((g) => ({ slug: g.slug })),
    )
  })

  it('renders the full page: hero, head, essay, steps, mistakes, go deeper', async () => {
    const guide = GUIDES.find((g) => g.slug === 'lectio-divina')!
    const essay = getGuideEssay('lectio-divina')

    const element = await GuidePage({
      params: Promise.resolve({ slug: 'lectio-divina' }),
    })
    render(element)

    expect(screen.getByAltText(guide.alt)).toBeInTheDocument()
    expect(screen.getByText(guide.title)).toBeInTheDocument()
    expect(screen.getByText(guide.standfirst)).toBeInTheDocument()
    expect(screen.getByText(guide.minutes)).toBeInTheDocument()

    // The essay is actually on the page, not just in the data file.
    for (const paragraph of essay.essay) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }

    expect(
      screen.getByRole('heading', { name: 'The steps' }),
    ).toBeInTheDocument()
    for (const detail of essay.steps) {
      expect(screen.getByText(detail.step)).toBeInTheDocument()
      expect(screen.getByText(detail.how)).toBeInTheDocument()
    }

    expect(
      screen.getByRole('heading', { name: 'Common mistakes' }),
    ).toBeInTheDocument()
    for (const mistake of essay.mistakes) {
      expect(screen.getByText(mistake.name)).toBeInTheDocument()
    }

    expect(
      screen.getByRole('heading', { name: 'Go deeper' }),
    ).toBeInTheDocument()
    for (const passage of essay.goDeeper) {
      expect(screen.getByText(passage.reference)).toBeInTheDocument()
      expect(screen.getByText(passage.why)).toBeInTheDocument()
    }
  })

  it('renders every guide page without throwing', async () => {
    for (const guide of GUIDES) {
      const element = await GuidePage({
        params: Promise.resolve({ slug: guide.slug }),
      })
      render(element)
      expect(screen.getByText(guide.title)).toBeInTheDocument()
      cleanup()
    }
  })
})

describe('/guides index route', () => {
  afterEach(cleanup)

  it('lists all six guides, each linking to its full page', () => {
    render(<GuidesIndexPage />)

    for (const guide of GUIDES) {
      // Two links carry the guide's accessible name: the plate (aria-label)
      // and the title. Both must lead to the same page.
      const links = screen.getAllByRole('link', { name: guide.title })
      expect(links.length).toBeGreaterThanOrEqual(1)
      for (const link of links) {
        expect(link).toHaveAttribute('href', `/guides/${guide.slug}`)
      }
    }
    expect(
      screen.getAllByRole('link', { name: /read the full guide/i }),
    ).toHaveLength(GUIDES.length)
  })
})
