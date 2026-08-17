/**
 * /daily-bread — The Daily Bread
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
import Image from 'next/image'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { liturgicalDay } from '@/lib/liturgical'
import {
  COMMUNITY,
  DISPATCHES,
  GUIDES,
  PANELS,
  PRACTICES,
  PRAYERS,
  WORD_STUDIES,
  pickForDay,
  pickManyForDay,
  prayerFocusFor,
} from '@/data/daily-edition'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import TodayReturningBand from '@/components/TodayReturningBand'
import {
  pickTodaySlug,
  findSeriesForSlug,
  fetchTodayDevotional,
  formatEditionDate,
} from '@/lib/today-devotional'
import { DEVOTIONAL_TEASERS } from '@/data/devotional-teasers'
import type { Devotional, Module, Panel } from '@/types'

/* ── Section icons (F-098) ─────────────────────────────────────────────
   Founder: "needs images to lead thumbnails, icons etc". Line marks at one
   weight, sized to sit on the cap-height of the kicker beside them. They
   label a section; they are not decoration, so there is exactly one per
   section and none anywhere else. */

function SectionMark({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="edition-icon"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  )
}

/** An open hand — the practice is something you do. */
function PracticeIcon() {
  return (
    <SectionMark>
      <path d="M8 12V5a1.5 1.5 0 013 0v6" />
      <path d="M11 11V4a1.5 1.5 0 013 0v7" />
      <path d="M14 11V6a1.5 1.5 0 013 0v7" />
      <path d="M17 10.5a1.5 1.5 0 013 0V14a6 6 0 01-6 6h-1a6 6 0 01-6-6v-1l-2-2a1.5 1.5 0 012-2l2 2" />
    </SectionMark>
  )
}

/** An open book — the word study. */
function WordIcon() {
  return (
    <SectionMark>
      <path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5" />
      <path d="M12 6.5C13.5 5 16 4.5 20 5v13c-4-.5-6.5 0-8 1.5" />
      <path d="M12 6.5v13" />
    </SectionMark>
  )
}

/** Hands raised — the prayer list. */
function PrayerIcon() {
  return (
    <SectionMark>
      <path d="M12 20V9" />
      <path d="M12 9c0-2.5-1.4-4.6-3.5-6C7 4.5 6.5 6.7 7 9c.4 1.8 1.5 3.2 3 4" />
      <path d="M12 9c0-2.5 1.4-4.6 3.5-6C17 4.5 17.5 6.7 17 9c-.4 1.8-1.5 3.2-3 4" />
    </SectionMark>
  )
}

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
    ? `${meta.day.title} | The Daily Bread`
    : 'The Daily Bread | Euangelion'

  return {
    title,
    description:
      teaser ??
      "Today's devotional from Euangelion — daily bread for the cluttered, hungry soul.",
    alternates: {
      canonical: '/daily-bread',
    },
    openGraph: {
      title: title,
      description:
        teaser ??
        "Today's devotional — scripture, reflection, and prayer for today.",
      type: 'article',
      url: 'https://euangelion.app/daily-bread',
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

export default async function DailyBreadPage() {
  const now = new Date()
  const slug = pickTodaySlug(now)
  const meta = findSeriesForSlug(slug)
  const devotional = await fetchTodayDevotional(slug)

  const editionDate = formatEditionDate(now)
  // Edition furniture. The volume/number are DERIVED, not decorative: volume
  // counts years since the first edition, number counts days within the year,
  // so two readers on the same day always see the same edition.
  const liturgical = liturgicalDay(now)
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1)
  const dayOfYear =
    Math.floor(
      (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        startOfYear) /
        86400000,
    ) + 1
  const volume = now.getUTCFullYear() - 2025
  // Three other readings from the catalog, for the rail. Deterministic by day.
  const railSlugs = ALL_SERIES_ORDER.filter(
    (x) => SERIES_DATA[x] && x !== 'bible-365',
  )
  const alsoToday = [0, 1, 2].map(
    (i) => railSlugs[(dayOfYear * 3 + i) % railSlugs.length],
  )
  // The rest of the paper, all keyed to the same day so the edition is one
  // thing rather than a set of independently-rotating widgets.
  const practice = pickForDay(PRACTICES, dayOfYear)
  const word = pickForDay(WORD_STUDIES, dayOfYear)
  const panel = pickForDay(PANELS, dayOfYear)
  const guides = pickManyForDay(GUIDES, dayOfYear, 3)
  const focus = prayerFocusFor(now.getUTCDay())
  const editionWeekday = now.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  })

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
    url: 'https://euangelion.app/daily-bread',
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
        name: 'The Daily Bread',
        item: 'https://euangelion.app/daily-bread',
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
          {`The Daily Bread — ${dayTitle} — Euangelion`}
        </h1>

        <EuangelionShellHeader />

        {/* Masthead — the furniture a daily edition carries. Volume and
            number are derived from the date, so the same day is the same
            edition for every reader. */}
        <div className="edition-masthead">
          <div className="edition-rule-top" aria-hidden="true" />
          <p className="edition-name">The Daily Bread</p>
          <div className="edition-dateline">
            <span>
              Vol. {volume} · No. {dayOfYear}
            </span>
            <time dateTime={now.toISOString().split('T')[0]}>
              {editionDate}
            </time>
            <span>
              {liturgical.feast ??
                liturgical.dayLabel ??
                liturgical.seasonLabel}
            </span>
          </div>
          <div className="edition-rule-bottom" aria-hidden="true" />
        </div>

        {/* Front page: the lead story, and a rail of what else is in the
            edition. The rail is real catalog data chosen deterministically by
            day — not a recommendation engine pretending to be one. */}
        <div className="edition-front">
          <section className="edition-lead" aria-label="Today's reading">
            {scriptureRef && <p className="edition-kicker">{scriptureRef}</p>}
            <h2 className="edition-lead-head">{dayTitle}</h2>
            {teaser && <p className="edition-lead-stand">{teaser}</p>}
            <p className="edition-byline">
              {seriesTitle}
              {dayNumber > 1 ? ` · Day ${dayNumber}` : ''}
            </p>
            <a href="#the-reading" className="edition-jump">
              Read today&rsquo;s reading &darr;
            </a>
          </section>

          <aside className="edition-rail" aria-label="Also in this edition">
            <p className="edition-rail-head">Also in this edition</p>
            {alsoToday.map((rs) => {
              const series = SERIES_DATA[rs]
              if (!series) return null
              return (
                <Link key={rs} href={`/series/${rs}`} className="edition-brief">
                  {series.heroImage && (
                    <span className="edition-brief-thumb">
                      <Image
                        src={series.heroImage}
                        alt=""
                        fill
                        sizes="72px"
                        className="edition-brief-img"
                      />
                    </span>
                  )}
                  <span className="edition-brief-text">
                    <span className="edition-brief-head">{series.title}</span>
                    <span className="edition-brief-body">
                      {series.question}
                    </span>
                  </span>
                </Link>
              )
            })}
            <Link href="/series" className="edition-rail-more">
              The whole library &rarr;
            </Link>
          </aside>
        </div>

        {/* Returning-user band (F-069) — client island, renders nothing until
            the active-plan fetch resolves (and nothing without JS). Moved
            BELOW the front page 2026-08-16: sitting between the dateline and
            the lead story, it broke the masthead-into-headline flow that makes
            the page read as an edition. */}
        <TodayReturningBand />

        {/* ── The paper proper (F-098) ─────────────────────────────────
            Founder 2026-08-16: "The today page needs more content… and needs
            images to lead thumbnails, icons etc… the site will eventually have
            practical guides on biblke reading and studying etc too. Today page
            could lead this effort. Could use a daily cartoon."

            Everything here is OUR editorial voice, rotating deterministically
            by day of year so two readers on the same morning get the same
            paper. Nothing here reports a fact about anyone. */}

        {/* THE BENTO SHEET (F-104).
            Founder 2026-08-16: "The Entire Daily Bread page is needing
            devlopment. the hiearchies are all wrong, the spacing, the way
            information lines up. It should feel like a bento style newspaper
            layout, with content pieces broken up with box contianers and lines
            seperating and grouping information."

            So every editorial piece below the front page becomes a ruled
            COMPARTMENT, and the compartments butt edge to edge sharing their
            rules — which is how a real page is made up, and the reason a
            newspaper reads as one sheet rather than a stack of cards. */}
        <div className="paper-sheet">
          <div className="edition-band paper-box paper-box--wide" data-reveal>
            {practice && (
              <section
                className="edition-practice"
                aria-label="Today's practice"
              >
                <p className="edition-kicker">
                  <PracticeIcon />
                  The practice
                </p>
                <p className="edition-practice-do">{practice.instruction}</p>
                <p className="edition-practice-why">{practice.reason}</p>
                <p className="edition-practice-time">{practice.duration}</p>
              </section>
            )}

            {word && (
              <section className="edition-word" aria-label="Word of the day">
                <p className="edition-kicker">
                  <WordIcon />
                  {word.language} today
                </p>
                <p
                  className="edition-word-original"
                  lang={word.language === 'Greek' ? 'el' : 'he'}
                >
                  {word.word}
                </p>
                <p className="edition-word-translit">{word.translit}</p>
                <p className="edition-word-gloss">{word.gloss}</p>
                <p className="edition-word-note">{word.note}</p>
                <p className="edition-word-ref">{word.reference}</p>
              </section>
            )}
          </div>

          {guides.length > 0 && (
            <section
              className="edition-section paper-box paper-box--wide"
              data-reveal
              aria-label="How to read"
            >
              <div className="edition-section-bar">
                <h2 className="edition-section-head">How to read</h2>
                <p className="edition-section-note">
                  Practical guides to reading and studying the Bible. A new set
                  each day.
                </p>
              </div>
              <div className="edition-guides">
                {guides.map((g) => (
                  <article key={g.title} className="edition-guide">
                    <span className="edition-guide-plate" data-parallax="0.35">
                      <Image
                        src={g.image}
                        alt={g.alt}
                        fill
                        sizes="(max-width: 900px) 100vw, 30vw"
                        className="edition-guide-img"
                      />
                    </span>
                    <p className="edition-guide-kicker">{g.kicker}</p>
                    <h3 className="edition-guide-head">{g.title}</h3>
                    <p className="edition-guide-stand">{g.standfirst}</p>
                    <ol className="edition-guide-steps">
                      {g.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <p className="edition-guide-time">{g.minutes}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {panel && (
            <section
              className="edition-section paper-box paper-box--panel"
              data-reveal
              aria-label="The daily panel"
            >
              <div className="edition-section-bar">
                <h2 className="edition-section-head">The daily panel</h2>
                <p className="edition-section-note">{panel.reference}</p>
              </div>
              <figure className="edition-panel">
                <span className="edition-panel-plate" data-parallax="0.5">
                  <Image
                    src={panel.image}
                    alt={panel.alt}
                    fill
                    sizes="(max-width: 900px) 100vw, 46vw"
                    className="edition-panel-img"
                  />
                </span>
                <figcaption className="edition-panel-caption">
                  <span className="edition-panel-title">{panel.title}</span>
                  <span className="edition-panel-line">{panel.caption}</span>
                </figcaption>
              </figure>
            </section>
          )}

          <section
            className="edition-section paper-box paper-box--rail"
            data-reveal
            aria-label="The prayer list"
          >
            <div className="edition-section-bar">
              <h2 className="edition-section-head">The prayer list</h2>
              <p className="edition-section-note">
                {focus.focus} &middot; {editionWeekday}
              </p>
            </div>
            <ul className="edition-petitions">
              {focus.petitions.map((pet) => (
                <li key={pet} className="edition-petition">
                  <PrayerIcon />
                  <span>{pet}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Editorial sections. Each renders ONLY when it carries real entries —
            an empty section does not appear at all. There is no feed of global
            reports or prayer submissions yet, and inventing one would publish
            fiction as fact under a masthead. See src/data/daily-edition.ts. */}
          {DISPATCHES.length > 0 && (
            <section className="edition-section" aria-label="Dispatches">
              <h2 className="edition-section-head">Dispatches</h2>
              <div className="edition-columns">
                {DISPATCHES.map((d) => (
                  <article key={d.title} className="edition-item">
                    <h3 className="edition-item-head">{d.title}</h3>
                    <p className="edition-item-place">{d.place}</p>
                    <p className="edition-item-body">{d.body}</p>
                    <p className="edition-item-source">
                      {d.href ? (
                        <a
                          href={d.href}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {d.source}
                        </a>
                      ) : (
                        d.source
                      )}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {COMMUNITY.length > 0 && (
            <section className="edition-section" aria-label="Community">
              <h2 className="edition-section-head">Community</h2>
              <div className="edition-columns">
                {COMMUNITY.map((c) => (
                  <article key={c.title} className="edition-item">
                    <h3 className="edition-item-head">{c.title}</h3>
                    <p className="edition-item-place">
                      {c.by} · {c.place}
                    </p>
                    <p className="edition-item-body">{c.body}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {PRAYERS.length > 0 && (
            <section className="edition-section" aria-label="Prayer list">
              <h2 className="edition-section-head">The prayer list</h2>
              <ul className="edition-prayers">
                {PRAYERS.map((pr) => (
                  <li key={pr.request} className="edition-prayer">
                    <span className="edition-prayer-text">{pr.request}</span>
                    <span className="edition-prayer-from">{pr.from}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <h2 className="edition-section-head" id="the-reading">
          The reading
        </h2>

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

        <SiteBottom />
      </main>
    </div>
  )
}
