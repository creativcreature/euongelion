/**
 * /guides/[slug] — one "How to read" guide, in full.
 *
 * The Daily Bread prints each guide as a card (kicker, standfirst, four
 * steps). Founder 2026-08-18: the cards "need to lead to more robust pages
 * that explain the section in more detail. They feel incomplete right now."
 * This page is the robust version: the guide's plate as a hero, the essay,
 * every step expanded into actual how-to, the honest mistakes, and passages
 * to try the method on today.
 *
 * Server-rendered, fully static — the six guides are committed editorial
 * (GUIDES in src/data/daily-edition.ts; essays in src/data/guide-essays.ts),
 * so every page is known at build time via generateStaticParams.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { GUIDES } from '@/data/daily-edition'
import { getGuideEssay } from '@/data/guide-essays'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) return { title: 'Guide Not Found' }

  return {
    title: `${guide.title} | How to Read`,
    description: guide.standfirst,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      title: `${guide.title} | Euangelion`,
      description: guide.standfirst,
      type: 'article',
      url: `https://euangelion.app/guides/${slug}`,
    },
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) notFound()

  // A guide listed without its essay is a build defect — this THROWS rather
  // than rendering a thinner page (Development Rule 1).
  const full = getGuideEssay(guide.slug)

  const pageUrl = `https://euangelion.app/guides/${guide.slug}`

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.standfirst,
    url: pageUrl,
    inLanguage: 'en',
    image: `https://euangelion.app${guide.image}`,
    publisher: {
      '@type': 'Organization',
      name: 'Euangelion',
      url: 'https://euangelion.app',
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://euangelion.app',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'How to Read',
        item: 'https://euangelion.app/guides',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: pageUrl,
      },
    ],
  }

  return (
    <div className="mock-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main id="main-content" className="mock-paper">
        <h1 className="sr-only">
          {`${guide.title} — How to Read — Euangelion`}
        </h1>

        <EuangelionShellHeader />

        <article className="guide-page">
          {/* The plate leads — same art-forward rule as the paper itself. */}
          <span className="guide-page-plate">
            <Image
              src={guide.image}
              alt={guide.alt}
              fill
              sizes="(max-width: 900px) 100vw, 46rem"
              className="edition-guide-img"
              priority
            />
          </span>

          <header className="guide-page-head">
            <p className="edition-guide-kicker">
              <Link href="/guides" className="guide-page-kicker-link">
                How to read
              </Link>
              {' · '}
              {guide.kicker}
            </p>
            <p className="guide-page-title">{guide.title}</p>
            <p className="guide-page-stand">{guide.standfirst}</p>
            <p className="guide-page-meta">{guide.minutes}</p>
          </header>

          {/* The essay. */}
          <div className="guide-page-essay">
            {full.essay.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {/* The steps, expanded. */}
          <section className="guide-page-section" aria-label="The steps">
            <div className="edition-section-bar">
              <h2 className="edition-section-head">The steps</h2>
              <p className="edition-section-note">
                The card&rsquo;s four steps, with the how
              </p>
            </div>
            <ol className="guide-page-steps">
              {full.steps.map((detail) => (
                <li key={detail.step}>
                  <p className="guide-page-step-lead">{detail.step}</p>
                  <p className="guide-page-step-how">{detail.how}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* The honest failure modes. */}
          <section className="guide-page-section" aria-label="Common mistakes">
            <div className="edition-section-bar">
              <h2 className="edition-section-head">Common mistakes</h2>
              <p className="edition-section-note">
                Every method has them. These are this one&rsquo;s.
              </p>
            </div>
            <ul className="guide-page-mistakes">
              {full.mistakes.map((mistake) => (
                <li key={mistake.name}>
                  <p className="guide-page-mistake-name">{mistake.name}</p>
                  <p className="guide-page-mistake-body">{mistake.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Where to try it today. */}
          <section className="guide-page-section" aria-label="Go deeper">
            <div className="edition-section-bar">
              <h2 className="edition-section-head">Go deeper</h2>
              <p className="edition-section-note">
                Passages to try the method on today
              </p>
            </div>
            <ul className="guide-page-deeper">
              {full.goDeeper.map((passage) => (
                <li key={passage.reference}>
                  <p className="guide-page-deeper-ref">{passage.reference}</p>
                  <p className="guide-page-deeper-why">{passage.why}</p>
                </li>
              ))}
            </ul>
          </section>

          <nav className="guide-page-footer" aria-label="Guide navigation">
            <Link href="/guides" className="edition-rail-more">
              All six guides &rarr;
            </Link>
            <Link href="/daily-bread" className="edition-rail-more">
              Back to The Daily Bread &rarr;
            </Link>
          </nav>
        </article>

        <SiteBottom />
      </main>
    </div>
  )
}
