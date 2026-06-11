/**
 * /sunday — The Sunday Edition
 *
 * A weekly long-form devotional surface. Server-rendered with full text in
 * initial HTML. Piece is selected deterministically by ISO week so the same
 * URL always returns the same content within a given week.
 *
 * Layout: single-column on mobile, two-column body on desktop (≥ 1024px).
 * Typography: display serif headline, drop cap on first paragraph, pull
 * quotes mid-body, larger line-height for long-form reading comfort.
 * Read time: "≈ N min read" calculated from total word count.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import ShareButton from '@/components/ShareButton'
import {
  pickSundayEntry,
  fetchSundayDevotional,
  formatSundayEditionDate,
  isoWeekNumber,
  isoWeekYear,
} from '@/lib/sunday-edition'

// ---------------------------------------------------------------------------
// Extended devotional shape (module-format, used by long-form pieces).
// The canonical Devotional type uses `panels`; module-format uses `modules`.
// We read the raw JSON loosely here to avoid touching the shared type.
// ---------------------------------------------------------------------------

interface RawModule {
  type: string
  heading?: string
  passage?: string
  reference?: string
  translation?: string
  body?: string
  content?: string
  prayerText?: string
  prompt?: string
  keyInsight?: string
  word?: string
  transliteration?: string
  definition?: string
  meaning?: string
  usage?: string
  ancientTruth?: string
  modernApplication?: string
  connectionPoint?: string
}

interface LongFormDevotional {
  day: number
  title: string
  subtitle?: string
  teaser?: string
  anchorVerse?: string
  framework?: string
  scriptureReference?: string
  totalWords?: number
  modules?: RawModule[]
}

// ---------------------------------------------------------------------------
// Read time helper
// ---------------------------------------------------------------------------

function estimateReadMinutes(words: number): number {
  // Average adult reading pace: ~238 wpm.  Long-form devotionals also invite
  // pausing for reflection — we slow the estimate slightly.
  return Math.max(8, Math.round(words / 200))
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const now = new Date()
  const entry = pickSundayEntry(now)
  const dateLabel = formatSundayEditionDate(now)
  const week = isoWeekNumber(now)
  const year = isoWeekYear(now)

  return {
    title: `Sunday Edition · Week ${week}, ${year}`,
    description: `${entry.seriesTitle} — ${dateLabel}. Long-form devotional reading on Euangelion.`,
    openGraph: {
      title: `The Sunday Edition — ${entry.seriesTitle}`,
      description: `${dateLabel} · Long-form devotional. Daily bread for the cluttered, hungry soul.`,
      url: 'https://euangelion.app/sunday',
      type: 'article',
    },
    twitter: { card: 'summary_large_image' },
  }
}

// ---------------------------------------------------------------------------
// Module renderers — plain HTML output (SSR, no client JS needed)
// ---------------------------------------------------------------------------

function ScriptureBlock({ mod }: { mod: RawModule }) {
  return (
    <div className="sunday-scripture">
      <blockquote className="sunday-scripture-text type-prose">
        {mod.passage}
      </blockquote>
      {(mod.reference || mod.translation) && (
        <p className="sunday-scripture-ref">
          {mod.reference}
          {mod.translation ? ` (${mod.translation})` : ''}
        </p>
      )}
    </div>
  )
}

function TeachingBlock({ mod, isFirst }: { mod: RawModule; isFirst: boolean }) {
  const body = mod.body ?? mod.content ?? ''
  const paragraphs = body.split(/\n\n+/).filter(Boolean)

  return (
    <div className="sunday-teaching">
      {mod.heading && <h2 className="sunday-section-head">{mod.heading}</h2>}
      {paragraphs.map((para, i) => {
        const addDropCap = isFirst && i === 0
        return (
          <p
            key={i}
            className={`sunday-body-para type-prose${addDropCap ? ' drop-cap' : ''}`}
          >
            {para}
          </p>
        )
      })}
      {mod.keyInsight && (
        <div className="sunday-pull-quote">
          <p>{mod.keyInsight}</p>
        </div>
      )}
    </div>
  )
}

function PullQuoteBlock({ text }: { text: string }) {
  return (
    <aside className="sunday-pull-quote sunday-pull-quote--standalone">
      <p>{text}</p>
    </aside>
  )
}

function ReflectionBlock({ mod }: { mod: RawModule }) {
  return (
    <div className="sunday-reflection">
      {mod.heading && <h3 className="sunday-reflection-head">{mod.heading}</h3>}
      {mod.prompt && (
        <p className="sunday-body-para type-prose italic">{mod.prompt}</p>
      )}
    </div>
  )
}

function PrayerBlock({ mod }: { mod: RawModule }) {
  const text = mod.prayerText ?? mod.body ?? mod.content ?? ''
  return (
    <div className="sunday-prayer">
      <p className="sunday-prayer-label">A PRAYER</p>
      <p className="sunday-body-para type-prose italic">{text}</p>
    </div>
  )
}

function BridgeBlock({ mod }: { mod: RawModule }) {
  return (
    <div className="sunday-bridge">
      {mod.ancientTruth && (
        <div className="sunday-bridge-row">
          <span className="sunday-bridge-label">Ancient truth</span>
          <p className="sunday-body-para type-prose">{mod.ancientTruth}</p>
        </div>
      )}
      {mod.modernApplication && (
        <div className="sunday-bridge-row">
          <span className="sunday-bridge-label">Today</span>
          <p className="sunday-body-para type-prose">{mod.modernApplication}</p>
        </div>
      )}
      {mod.connectionPoint && (
        <div className="sunday-bridge-row">
          <span className="sunday-bridge-label">The connection</span>
          <p className="sunday-body-para type-prose">{mod.connectionPoint}</p>
        </div>
      )}
    </div>
  )
}

function VocabBlock({ mod }: { mod: RawModule }) {
  return (
    <div className="sunday-vocab">
      {mod.word && (
        <p className="sunday-vocab-word" lang="grc">
          {mod.word}
        </p>
      )}
      {mod.transliteration && (
        <p className="sunday-vocab-transliteration">[{mod.transliteration}]</p>
      )}
      {(mod.definition ?? mod.meaning) && (
        <p className="sunday-vocab-def">{mod.definition ?? mod.meaning}</p>
      )}
      {mod.usage && <p className="sunday-body-para type-prose">{mod.usage}</p>}
    </div>
  )
}

function renderModule(
  mod: RawModule,
  index: number,
  firstTeachingDone: boolean,
) {
  switch (mod.type) {
    case 'scripture':
      return <ScriptureBlock key={index} mod={mod} />
    case 'teaching':
      return (
        <TeachingBlock key={index} mod={mod} isFirst={!firstTeachingDone} />
      )
    case 'story':
      return <TeachingBlock key={index} mod={mod} isFirst={false} />
    case 'insight':
      return <TeachingBlock key={index} mod={mod} isFirst={false} />
    case 'reflection':
      return <ReflectionBlock key={index} mod={mod} />
    case 'prayer':
      return <PrayerBlock key={index} mod={mod} />
    case 'bridge':
      return <BridgeBlock key={index} mod={mod} />
    case 'vocab':
      return <VocabBlock key={index} mod={mod} />
    case 'pullquote': {
      const text = mod.body ?? mod.content ?? ''
      return text ? <PullQuoteBlock key={index} text={text} /> : null
    }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SundayPage() {
  const now = new Date()
  const entry = pickSundayEntry(now)
  const dateLabel = formatSundayEditionDate(now)
  const week = isoWeekNumber(now)
  const year = isoWeekYear(now)

  // Fetch full devotional content
  const rawData = await fetchSundayDevotional(entry.daySlug)
  const devotional = rawData as unknown as LongFormDevotional | null

  // Gather modules (module-format devotionals)
  const modules: RawModule[] = devotional?.modules ?? []

  // Derive key pieces for Article JSON-LD and page header
  const scriptureModule = modules.find((m) => m.type === 'scripture')
  const anchorVerse = scriptureModule?.passage ?? ''
  const anchorVerseRef =
    scriptureModule?.reference ??
    devotional?.anchorVerse ??
    devotional?.framework ??
    ''

  const totalWords = devotional?.totalWords ?? 0
  const readMinutes = totalWords > 0 ? estimateReadMinutes(totalWords) : null

  // Filter to renderable module types, then track whether we've seen the
  // first teaching block (for drop cap placement). Using reduce to avoid
  // mutable variable mutation inside map (ESLint react-hooks/immutability).
  const SKIP_TYPES = new Set([
    'comprehension',
    'match',
    'order',
    'reveal',
    'resource',
    'profile',
    'hero-card',
    'recap',
    'sabbath',
    'video',
    'inline-image',
    'journey',
    'cta',
    'art',
    'voice',
    'interactive',
    'takeaway',
    'chronology',
    'geography',
    'visual',
  ])

  const renderedModules = modules
    .filter((m) => !SKIP_TYPES.has(m.type))
    .reduce<{ elements: React.ReactNode[]; seenTeaching: boolean }>(
      (acc, mod, i) => {
        const isTeachingType = mod.type === 'teaching' || mod.type === 'story'
        const isFirst = isTeachingType && !acc.seenTeaching
        const element = renderModule(mod, i, !isFirst)
        return {
          elements: element ? [...acc.elements, element] : acc.elements,
          seenTeaching: acc.seenTeaching || isTeachingType,
        }
      },
      { elements: [], seenTeaching: false },
    ).elements

  // Article JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: devotional?.title ?? entry.seriesTitle,
    description: devotional?.teaser ?? '',
    isPartOf: {
      '@type': 'Periodical',
      name: 'Euangelion Sunday Edition',
    },
    datePublished: now.toISOString().slice(0, 10),
    publisher: {
      '@type': 'Organization',
      name: 'Euangelion',
      url: 'https://euangelion.app',
    },
    url: 'https://euangelion.app/sunday',
    inLanguage: 'en',
  }

  return (
    <div className="newspaper-reading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EuangelionShellHeader />

      <main id="main-content" className="sunday-page">
        {/* ── Masthead rule ─────────────────────────────────────────── */}
        <header className="sunday-header">
          <div className="sunday-header-meta">
            <span className="sunday-edition-label">THE SUNDAY EDITION</span>
            <span className="sunday-header-sep" aria-hidden="true">
              &middot;
            </span>
            <span className="sunday-week-label">
              WEEK {week}, {year}
            </span>
            <span className="sunday-header-sep" aria-hidden="true">
              &middot;
            </span>
            <time
              className="sunday-date-label"
              dateTime={now.toISOString().slice(0, 10)}
            >
              {dateLabel}
            </time>
          </div>

          {readMinutes && (
            <p className="sunday-read-time">&#8776; {readMinutes} min read</p>
          )}
        </header>

        {/* ── Article folio ─────────────────────────────────────────── */}
        <div className="sunday-folio">
          <p className="sunday-series-kicker">
            <Link
              href={`/series/${entry.seriesSlug}`}
              className="sunday-series-link"
            >
              {entry.seriesTitle}
            </Link>
          </p>

          <h1 className="sunday-headline">
            {devotional?.title ?? entry.daySlug}
          </h1>

          {devotional?.subtitle && (
            <p className="sunday-dek">{devotional.subtitle}</p>
          )}

          {devotional?.teaser && !devotional.subtitle && (
            <p className="sunday-dek">{devotional.teaser}</p>
          )}

          {/* Scripture lead */}
          {anchorVerse && (
            <div className="sunday-scripture sunday-scripture--lead">
              <blockquote className="sunday-scripture-text type-prose">
                {anchorVerse}
              </blockquote>
              {anchorVerseRef && (
                <p className="sunday-scripture-ref">{anchorVerseRef}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Body columns ──────────────────────────────────────────── */}
        <article className="sunday-body" aria-label="Sunday Edition article">
          <div className="sunday-body-inner">
            {renderedModules.length > 0 ? (
              renderedModules
            ) : (
              /* Fallback for panel-format devotionals */
              <p className="sunday-body-para type-prose">
                Read the full devotional at{' '}
                <Link
                  href={`/wake-up/devotional/${entry.daySlug}`}
                  className="sunday-inline-link"
                >
                  {entry.seriesTitle}
                </Link>
                .
              </p>
            )}
          </div>
        </article>

        {/* ── Footer: share + archive link ──────────────────────────── */}
        <footer className="sunday-footer">
          <div className="sunday-footer-inner">
            <div className="sunday-footer-share">
              <ShareButton
                title={`Euangelion Sunday Edition · ${devotional?.title ?? entry.seriesTitle}`}
                text={
                  anchorVerse
                    ? `"${anchorVerse.slice(0, 120)}" — ${anchorVerseRef}`
                    : undefined
                }
                url="https://euangelion.app/sunday"
                label="Share this edition"
              />
            </div>
            <Link href="/sunday/archive" className="sunday-archive-link">
              PAST EDITIONS &rarr;
            </Link>
          </div>
          <p className="sunday-footer-note">
            Read the full series:{' '}
            <Link
              href={`/series/${entry.seriesSlug}`}
              className="sunday-inline-link"
            >
              {entry.seriesTitle}
            </Link>
          </p>
        </footer>
      </main>

      <SiteFooter />
    </div>
  )
}
