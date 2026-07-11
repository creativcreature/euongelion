/**
 * /today — Today's Edition
 *
 * Server-rendered. Full devotional body in the initial HTML — no client
 * fetch, no interstitial, no gate. Works with JavaScript disabled.
 *
 * F-069: one client island (TodayReturningBand) sits between the edition
 * band and the reading header — greeting + continue-your-plan card for
 * returning readers. Pure progressive enhancement: it renders nothing
 * server-side and nothing without JS; the edition below is untouched.
 *
 * Daily selection: UTC day-of-year modulo the curated rotation (175
 * non-bible-365 devotionals in series order). Same date = same slug
 * everywhere (server, Googlebot, cURL).
 *
 * Cloudflare Workers note: public/devotionals/ files are ASSETS, not
 * filesystem. Content is loaded via self-fetch against NEXT_PUBLIC_APP_URL.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import TodayReturningBand from '@/components/TodayReturningBand'
import {
  pickTodaySlug,
  findSeriesForSlug,
  fetchTodayDevotional,
  formatEditionDate,
  formatEditionSlug,
} from '@/lib/today-devotional'
import { DEVOTIONAL_TEASERS } from '@/data/devotional-teasers'
import type { Devotional, Module, Panel } from '@/types'

// ISR: revalidate every hour so the edition date is always correct
export const revalidate = 3600

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const now = new Date()
  const slug = pickTodaySlug(now)
  const meta = findSeriesForSlug(slug)
  const teaser = DEVOTIONAL_TEASERS[slug] ?? meta?.series.question ?? undefined

  const title = meta?.day.title
    ? `${meta.day.title} | Today's Edition`
    : "Today's Edition | Euangelion"

  return {
    title,
    description:
      teaser ??
      "Today's devotional from Euangelion — daily bread for the cluttered, hungry soul.",
    alternates: {
      canonical: '/today',
    },
    openGraph: {
      title: title,
      description:
        teaser ??
        "Today's devotional — scripture, reflection, and prayer for today.",
      type: 'article',
      url: 'https://euangelion.app/today',
    },
  }
}

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

/** Render markdown-style bold (**word**) as <strong> inline HTML. */
function inlineMd(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

/** Render a panel paragraph block (panels-format devotionals). */
function PanelContent({ panel }: { panel: Panel }) {
  if (panel.type === 'cover') return null

  const paragraphs = (panel.content ?? '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="today-section" role="region">
      {panel.heading && (
        <h2 className="today-section-heading text-label">{panel.heading}</h2>
      )}
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="today-body"
          dangerouslySetInnerHTML={{ __html: inlineMd(p) }}
        />
      ))}
    </div>
  )
}

/** Render a single module (modules-format devotionals). */
function ModuleBlock({ mod }: { mod: Module }) {
  switch (mod.type) {
    case 'scripture': {
      const passage =
        typeof mod.passage === 'string'
          ? mod.passage
          : ((mod as { passage?: string }).passage ?? '')
      const reference =
        (mod as { reference?: string }).reference ??
        (mod as { scriptureReference?: string }).scriptureReference ??
        ''
      const translation = (mod as { translation?: string }).translation ?? ''
      return (
        <blockquote className="today-scripture" cite={reference}>
          <p
            className="today-scripture-text"
            dangerouslySetInnerHTML={{ __html: inlineMd(passage) }}
          />
          {reference && (
            <footer className="today-scripture-ref text-label">
              {reference}
              {translation ? ` · ${translation}` : ''}
            </footer>
          )}
        </blockquote>
      )
    }

    case 'vocab': {
      const word = (mod as { word?: string }).word ?? ''
      const meaning = (mod as { meaning?: string }).meaning ?? ''
      const rootMeaning = (mod as { rootMeaning?: string }).rootMeaning ?? ''
      const hebrewWord =
        (mod as { hebrewOriginal?: string }).hebrewOriginal ?? word
      return (
        <aside className="today-vocab">
          <p className="today-vocab-word" lang="he">
            {hebrewWord}
          </p>
          <p className="today-vocab-meaning text-label">{meaning}</p>
          {rootMeaning && <p className="today-vocab-root">{rootMeaning}</p>}
        </aside>
      )
    }

    case 'teaching':
    case 'story':
    case 'insight':
    case 'bridge': {
      const heading = (mod as { heading?: string }).heading ?? ''
      const body =
        (mod as { body?: string }).body ??
        (mod as { content?: string }).content ??
        ''
      const paragraphs = body
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
      return (
        <div className="today-section">
          {heading && (
            <h2 className="today-section-heading text-label">{heading}</h2>
          )}
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="today-body"
              dangerouslySetInnerHTML={{ __html: inlineMd(p) }}
            />
          ))}
        </div>
      )
    }

    case 'reflection': {
      const prompt = (mod as { prompt?: string }).prompt ?? ''
      return (
        <div className="today-reflection">
          <p className="text-label today-reflection-kicker">REFLECT</p>
          <p className="today-reflection-prompt">{prompt}</p>
        </div>
      )
    }

    case 'prayer': {
      const prayerText =
        (mod as { prayerText?: string }).prayerText ??
        (mod as { content?: string }).content ??
        ''
      return (
        <div className="today-prayer">
          <p className="text-label today-prayer-kicker">PRAYER</p>
          <p
            className="today-prayer-text"
            dangerouslySetInnerHTML={{ __html: inlineMd(prayerText) }}
          />
        </div>
      )
    }

    case 'takeaway': {
      const commitment =
        (mod as { commitment?: string }).commitment ??
        (mod as { content?: string }).content ??
        ''
      return (
        <div className="today-takeaway">
          <p className="text-label today-takeaway-kicker">THIS WEEK</p>
          <p
            className="today-takeaway-text"
            dangerouslySetInnerHTML={{ __html: inlineMd(commitment) }}
          />
        </div>
      )
    }

    case 'profile': {
      const name = (mod as { name?: string }).name ?? ''
      const keyQuote = (mod as { keyQuote?: string }).keyQuote ?? ''
      return (
        <div className="today-profile">
          {name && <p className="text-label today-profile-name">{name}</p>}
          {keyQuote && (
            <blockquote className="today-profile-quote">
              <p>{keyQuote}</p>
            </blockquote>
          )}
        </div>
      )
    }

    // comprehension, resource, etc. — omit from the reading body
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TodayPage() {
  const now = new Date()
  const slug = pickTodaySlug(now)
  const meta = findSeriesForSlug(slug)
  const devotional = await fetchTodayDevotional(slug)

  const editionDate = formatEditionDate(now)
  const editionSlug = formatEditionSlug(now)

  const seriesTitle = meta?.series.title ?? 'Daily Devotional'
  const seriesSlug = meta?.seriesSlug ?? ''
  const dayTitle = devotional?.title ?? meta?.day.title ?? 'Today'
  const dayNumber = meta?.day.day ?? 1
  const scriptureRef =
    (devotional as (Devotional & { scriptureReference?: string }) | null)
      ?.scriptureReference ??
    meta?.series.framework?.split(' - ')[0] ??
    ''
  const teaser = DEVOTIONAL_TEASERS[slug] ?? meta?.series.question ?? ''

  // Modules-format (Substack/rich) vs. panels-format (Wake-Up / legacy)
  const hasModules =
    Array.isArray(
      (devotional as (Devotional & { modules?: unknown[] }) | null)?.modules,
    ) &&
    ((devotional as Devotional & { modules?: unknown[] })?.modules?.length ??
      0) > 0

  const hasPanels =
    !hasModules &&
    Array.isArray(
      (devotional as (Devotional & { panels?: unknown[] }) | null)?.panels,
    ) &&
    ((devotional as Devotional & { panels?: unknown[] })?.panels?.length ?? 0) >
      0

  const modules: Module[] = hasModules
    ? ((devotional as Devotional & { modules?: Module[] })?.modules ?? [])
    : []

  const panels: Panel[] = hasPanels
    ? ((devotional as Devotional & { panels?: Panel[] })?.panels ?? [])
    : []

  // JSON-LD: Article schema
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: dayTitle,
    description: teaser,
    datePublished: now.toISOString().split('T')[0],
    publisher: {
      '@type': 'Organization',
      name: 'Euangelion',
      url: 'https://euangelion.app',
    },
    url: 'https://euangelion.app/today',
    isPartOf: {
      '@type': 'CreativeWorkSeries',
      name: seriesTitle,
    },
    ...(scriptureRef
      ? { about: { '@type': 'Book', name: 'Bible', description: scriptureRef } }
      : {}),
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
        name: "Today's Edition",
        item: 'https://euangelion.app/today',
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
          {`Today's Edition — ${dayTitle} — Euangelion`}
        </h1>

        <EuangelionShellHeader />

        {/* Edition masthead band */}
        <div className="today-edition-band">
          <p className="text-label today-edition-label">
            <span className="text-gold">TODAY&rsquo;S EDITION</span>
            <span aria-hidden="true"> · </span>
            <time dateTime={now.toISOString().split('T')[0]}>
              {editionSlug}
            </time>
          </p>
          <p className="today-edition-tagline vw-small">
            Daily bread for the cluttered, hungry soul.
          </p>
        </div>

        {/* Returning-user band (F-069) — client island, renders nothing
            until the active-plan fetch resolves (and nothing without JS). */}
        <TodayReturningBand />

        {/* Reading header */}
        <header className="today-reading-header">
          {scriptureRef && (
            <p className="text-label today-scripture-overline">
              {scriptureRef}
            </p>
          )}
          <p className="text-label today-series-kicker mock-kicker">
            {seriesTitle}
            {dayNumber > 1 ? ` · DAY ${dayNumber}` : ''}
          </p>
          <h2 className="today-headline mock-title">{dayTitle}</h2>
          {teaser && <p className="today-teaser mock-subcopy">{teaser}</p>}
        </header>

        {/* Rule */}
        <div className="mock-rule today-rule" aria-hidden="true" />

        {/* Reading body — server-rendered, full text in initial HTML */}
        <article
          className="today-reading-body"
          aria-label={`${dayTitle} reading`}
        >
          {devotional === null && (
            <div className="today-fallback">
              <p className="mock-subcopy">
                {`Today's reading didn't load. `}
                <Link href={`/devotional/${slug}`} className="link-highlight">
                  Read it here
                </Link>
                .
              </p>
            </div>
          )}

          {/* Modules format (Substack/rich devotionals) */}
          {hasModules &&
            modules.map((mod, i) => <ModuleBlock key={i} mod={mod} />)}

          {/* Panels format (Wake-Up / legacy devotionals) */}
          {hasPanels &&
            panels
              .filter((p) => p.type !== 'cover')
              .map((panel, i) => <PanelContent key={i} panel={panel} />)}
        </article>

        {/* Navigation footer */}
        <nav className="today-nav-footer" aria-label="Reading navigation">
          <Link
            href={`/devotional/${slug}`}
            className="mock-btn mock-btn-inline text-label"
          >
            OPEN FULL READER
          </Link>
          {seriesSlug && (
            <Link
              href={`/series/${seriesSlug}`}
              className="text-label today-series-link"
            >
              View all of {seriesTitle} &rarr;
            </Link>
          )}
        </nav>

        {/* Colophon */}
        <div className="today-colophon">
          <p className="vw-small text-secondary">
            <time dateTime={now.toISOString().split('T')[0]}>
              {editionDate}
            </time>
            {' · '}
            <Link href="/how-we-write" className="link-highlight">
              How we write
            </Link>
          </p>
        </div>

        <SiteFooter />
      </main>
    </div>
  )
}
