/**
 * /guides — How to Read, the index.
 *
 * All six reading guides in one place, in the same visual language as the
 * Daily Bread's "How to read" section — plate-led cards, kicker, standfirst,
 * minutes. The paper prints three a day; this is the whole shelf, each card
 * leading to its full page (/guides/[slug]).
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { GUIDES } from '@/data/daily-edition'

export const metadata: Metadata = {
  title: 'How to Read | Reading Guides',
  description:
    'Practical guides to reading and studying the Bible — whole books, who is speaking, scripture interpreting scripture, lectio divina, word roots, and reading together.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'How to Read | Euangelion',
    description:
      'Six practical guides to reading and studying the Bible. Method, not mystique.',
    type: 'website',
    url: 'https://euangelion.app/guides',
  },
}

export default function GuidesIndexPage() {
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'How to Read — Reading Guides | Euangelion',
    description:
      'Practical guides to reading and studying the Bible, from the Daily Bread.',
    url: 'https://euangelion.app/guides',
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: 'Euangelion',
      url: 'https://euangelion.app',
    },
    hasPart: GUIDES.map((guide) => ({
      '@type': 'Article',
      name: guide.title,
      url: `https://euangelion.app/guides/${guide.slug}`,
    })),
  }

  return (
    <div className="mock-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <main id="main-content" className="mock-paper">
        <h1 className="sr-only">How to Read — Reading Guides — Euangelion</h1>

        <EuangelionShellHeader />

        <div className="guides-index-head">
          <p className="edition-guide-kicker">From The Daily Bread</p>
          <p className="guides-index-title">How to read</p>
          <p className="guides-index-dek">
            Practical guides to reading and studying the Bible. The paper prints
            three a day; here is the whole shelf. No expertise assumed, nothing
            to buy — a method, the honest ways it goes wrong, and somewhere to
            try it today.
          </p>
        </div>

        <div className="guides-index-grid">
          {GUIDES.map((guide) => (
            <article key={guide.slug} className="edition-guide">
              <Link
                href={`/guides/${guide.slug}`}
                className="edition-guide-plate"
                aria-label={guide.title}
                data-parallax="0.35"
              >
                <Image
                  src={guide.image}
                  alt={guide.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 45vw"
                  className="edition-guide-img"
                />
              </Link>
              <p className="edition-guide-kicker">{guide.kicker}</p>
              <h2 className="edition-guide-head">
                <Link
                  href={`/guides/${guide.slug}`}
                  className="guide-card-titlelink"
                >
                  {guide.title}
                </Link>
              </h2>
              <p className="edition-guide-stand">{guide.standfirst}</p>
              <p className="edition-guide-time">{guide.minutes}</p>
              <Link
                href={`/guides/${guide.slug}`}
                className="edition-rail-more"
              >
                Read the full guide &rarr;
              </Link>
            </article>
          ))}
        </div>

        <div className="guides-index-foot">
          <Link href="/daily-bread" className="edition-rail-more">
            Back to The Daily Bread &rarr;
          </Link>
        </div>

        <SiteBottom />
      </main>
    </div>
  )
}
