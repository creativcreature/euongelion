/**
 * /authors/[slug] — one page per masthead name (SA-089 follow-on).
 *
 * Founder: "each listed author needs a page dedicated to them (with photo
 * hopefully) and small bio and where their words are used on site."
 *
 * The two authors are the colophon's two credits: Milo (writer — the house
 * pseudonym for the AI-assisted composition process) and James Parker
 * (editor). No photograph of either exists and none may be fabricated, so
 * each page shows an author MARK — an audit-clean plate from the print
 * archive — captioned so it never claims to be a likeness.
 *
 * Server-rendered, statically generated for both slugs.
 */

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { AUTHOR_SLUGS, getAuthor } from '@/data/authors'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return AUTHOR_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const author = getAuthor(slug)
  if (!author) return { title: 'Author Not Found' }

  return {
    title: `${author.name} — ${author.role}`,
    description: author.summary,
    alternates: { canonical: `/authors/${author.slug}` },
    openGraph: {
      title: `${author.name} | Euangelion`,
      description: author.summary,
      type: 'profile',
      url: `https://euangelion.app/authors/${author.slug}`,
    },
  }
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params
  const author = getAuthor(slug)
  if (!author) notFound()

  return (
    <div className="mock-home min-h-screen">
      <main id="main-content" className="mock-paper min-h-screen">
        <EuangelionShellHeader />

        <div className="shell-content-pad mx-auto max-w-3xl">
          <Breadcrumbs
            className="mb-7"
            items={[
              { label: 'HOME', href: '/' },
              { label: 'HOW WE WRITE', href: '/how-we-write' },
              { label: author.name.toUpperCase() },
            ]}
          />

          <p className="text-label mock-kicker text-gold mb-2">
            {author.role.toUpperCase()}
          </p>
          <h1 className="text-display vw-heading-lg mb-8">{author.name}</h1>

          <div className="author-page-grid mb-12">
            <figure className="author-mark">
              <span className="author-mark-plate">
                <Image
                  src={author.mark.image}
                  alt={author.mark.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 260px"
                  className="author-mark-img"
                />
              </span>
              <figcaption className="author-mark-caption">
                Author mark, not a likeness &mdash; {author.mark.note}
              </figcaption>
            </figure>

            <div className="author-bio">
              {author.bio.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="author-bio-p">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="mock-rule" aria-hidden="true" />

          <section
            className="author-appearances-section"
            aria-label="Where their words appear"
          >
            <p className="text-label mock-kicker text-gold">
              WHERE THEIR WORDS APPEAR
            </p>
            <ul className="author-appearances">
              {author.appearances.map((appearance) => (
                <li
                  key={`${appearance.href}-${appearance.label}`}
                  className="author-appearance"
                >
                  <Link
                    href={appearance.href}
                    className="author-appearance-link"
                  >
                    <span className="author-appearance-label">
                      {appearance.label}
                    </span>
                    <span className="author-appearance-desc">
                      {appearance.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <SiteBottom />
      </main>
    </div>
  )
}
