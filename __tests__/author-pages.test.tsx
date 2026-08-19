/**
 * Author pages — the masthead's two names (SA-089 follow-on).
 *
 * Founder: "each listed author needs a page dedicated to them (with photo
 * hopefully) and small bio and where their words are used on site."
 *
 * The contract under test:
 *  - both colophon credits (milo, james-parker) render a dedicated page;
 *  - bios are non-empty and honest in length (120–200 words);
 *  - the "portrait" is an author MARK from the audited print archive —
 *    every rendered <img> resolves to a real file on disk, and the caption
 *    says "Author mark" so it never claims to be a likeness;
 *  - the AuthorColophon byline names link to pages that actually resolve.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import AuthorPage from '@/app/authors/[slug]/page'
import AuthorColophon from '@/components/devotional/AuthorColophon'
import { AUTHORS, AUTHOR_SLUGS, getAuthor } from '@/data/authors'

vi.mock('@/components/EuangelionShellHeader', () => ({
  default: () => <div data-testid="shell-header" />,
}))
vi.mock('@/components/SiteBottom', () => ({
  default: () => <div data-testid="site-bottom" />,
}))

afterEach(cleanup)

async function renderAuthorPage(slug: string) {
  const element = await AuthorPage({ params: Promise.resolve({ slug }) })
  return render(element)
}

/** Resolve a rendered img src (raw or next/image-optimized) to its
 * public/ path. */
function publicPathOf(src: string): string {
  const url = new URL(src, 'http://localhost')
  if (url.pathname === '/_next/image') {
    const inner = url.searchParams.get('url')
    if (!inner) throw new Error(`optimizer URL without url param: ${src}`)
    return decodeURIComponent(inner)
  }
  return url.pathname
}

describe('author pages (SA-089 follow-on)', () => {
  it('registers exactly the two masthead credits — Milo and James Parker', () => {
    expect(AUTHOR_SLUGS).toEqual(['milo', 'james-parker'])
    expect(getAuthor('milo')?.name).toBe('Milo')
    expect(getAuthor('james-parker')?.name).toBe('James Parker')
  })

  it.each(AUTHORS.map((a) => [a.slug, a.name] as const))(
    '/authors/%s renders the page with name, role, bio and mark caption',
    async (slug, name) => {
      const author = getAuthor(slug)
      expect(author).toBeDefined()

      await renderAuthorPage(slug)

      expect(
        screen.getByRole('heading', { level: 1, name }),
      ).toBeInTheDocument()
      expect(screen.getByText(author!.role.toUpperCase())).toBeInTheDocument()

      // Every bio paragraph reaches the DOM non-empty.
      for (const paragraph of author!.bio) {
        expect(paragraph.trim().length).toBeGreaterThan(0)
        expect(screen.getByText(paragraph)).toBeInTheDocument()
      }

      // The mark is captioned as a mark — never presented as a likeness.
      expect(screen.getByText(/Author mark, not a likeness/)).toBeTruthy()
    },
  )

  it.each(AUTHORS.map((a) => [a.slug] as const))(
    '/authors/%s keeps the bio honest in length: 120–200 words',
    (slug) => {
      const words = getAuthor(slug)!.bio.join(' ').split(/\s+/).filter(Boolean)
      expect(words.length).toBeGreaterThanOrEqual(120)
      expect(words.length).toBeLessThanOrEqual(200)
    },
  )

  it('Milo says plainly it is the house pseudonym for an AI process', () => {
    const bio = getAuthor('milo')!.bio.join(' ')
    expect(bio).toMatch(/pseudonym/i)
    expect(bio).toMatch(/AI/)
    expect(bio).toMatch(/not a person/i)
  })

  it.each(AUTHORS.map((a) => [a.slug] as const))(
    '/authors/%s renders no <img> without an existing file on disk',
    async (slug) => {
      const { container } = await renderAuthorPage(slug)
      const imgs = Array.from(container.querySelectorAll('img'))
      expect(imgs.length).toBeGreaterThan(0)
      for (const img of imgs) {
        const publicPath = publicPathOf(img.getAttribute('src') ?? '')
        expect(publicPath.startsWith('/')).toBe(true)
        const onDisk = join(process.cwd(), 'public', publicPath)
        expect(existsSync(onDisk), `missing on disk: ${publicPath}`).toBe(true)
      }
    },
  )

  it('links where their words appear: Milo → /series and /daily-bread', async () => {
    await renderAuthorPage('milo')
    const section = screen.getByRole('region', {
      name: 'Where their words appear',
    })
    const hrefs = within(section)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/series')
    expect(hrefs).toContain('/daily-bread')
  })

  it('links where their words appear: James Parker → /how-we-write', async () => {
    await renderAuthorPage('james-parker')
    const section = screen.getByRole('region', {
      name: 'Where their words appear',
    })
    const hrefs = within(section)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/how-we-write')
  })

  it('rejects an unknown slug instead of rendering a plausible page', async () => {
    await expect(
      AuthorPage({ params: Promise.resolve({ slug: 'augustine' }) }),
    ).rejects.toThrow()
  })
})

describe('AuthorColophon byline links (SA-089 follow-on)', () => {
  it('links the default credits to author pages that resolve', () => {
    render(<AuthorColophon />)

    const milo = screen.getByRole('link', { name: 'Milo' })
    const james = screen.getByRole('link', { name: 'James Parker' })
    expect(milo.getAttribute('href')).toBe('/authors/milo')
    expect(james.getAttribute('href')).toBe('/authors/james-parker')

    // The linked slugs must be pages the route can actually render.
    for (const href of [milo, james].map((a) => a.getAttribute('href')!)) {
      const slug = href.replace('/authors/', '')
      expect(getAuthor(slug), `dead colophon link: ${href}`).toBeDefined()
    }
  })

  it('leaves an overridden byline that matches no author page unlinked', () => {
    render(<AuthorColophon writer="Charles Spurgeon" />)
    expect(screen.getByText('Charles Spurgeon')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Charles Spurgeon' })).toBeNull()
  })
})
