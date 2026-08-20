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

import ListenButton from '@/components/audio/ListenButton'
import { itemForSlug } from '@/lib/audio/queue-builder'
import Link from 'next/link'
import Image from 'next/image'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { liturgicalDay } from '@/lib/liturgical'
import { GUIDES, pickManyForDay } from '@/data/daily-edition'
import type { Edition } from '@/lib/edition/store'
import { effectiveEditionDate, getLiveEdition } from '@/lib/edition/deadline'
import { arrangeSheetRows, type SheetRowKey } from '@/lib/edition/arrange'
import { Fragment, type ReactNode } from 'react'
import { getEditionPreview } from '@/lib/edition/preview'
import PreviewChrome from '@/components/edition/PreviewChrome'
import {
  ArchiveBox,
  B365Box,
  EditionUnavailable,
  LettersColumn,
  NoticesColumn,
  PrayerColumn,
  ProverbBox,
  QuestionBox,
  RedLetterColumn,
  ScreeningRoom,
  StripPanel,
  VerseBox,
  VoicesColumn,
  WitnessColumn,
} from '@/components/edition/EditionSections'
import GallerySpread from '@/components/edition/GallerySpread'
import { pageArchive, pageB365, pageProverb } from '@/lib/edition/page-modules'
import { pickLeadArt } from '@/lib/edition/lead-art'
import { generateRedLetter } from '@/lib/edition/generators/redletter'
import { generateVerse } from '@/lib/edition/generators/verse'
import { generateQuestion } from '@/lib/edition/generators/question'
import { pickVoiceForDay } from '@/data/voices-bank'
import { getSeasonEssay } from '@/data/season-essays'
import { buildWordSearch } from '@/lib/edition/wordsearch'
import WordSearchClient from '@/components/edition/puzzles/WordSearchClient'
import { pickCatechismForDay } from '@/data/catechism-bank'
import { pickHymnForDay } from '@/data/hymn-bank'
import CrosswordClient from '@/components/edition/puzzles/CrosswordClient'
import ColoringClient from '@/components/edition/puzzles/ColoringClient'
import { pickColoringForDay } from '@/data/coloring-bank'
import UnscrambleClient from '@/components/edition/puzzles/UnscrambleClient'
import QuizClient from '@/components/edition/puzzles/QuizClient'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import TodayReturningBand from '@/components/TodayReturningBand'
import {
  pickTodaySlug,
  findSeriesForSlug,
  fetchTodayDevotional,
  formatEditionDate,
} from '@/lib/today-devotional'
import { DEVOTIONAL_TEASERS } from '@/data/devotional-teasers'
import { getSeriesHero } from '@/lib/series-hero'
import AudioPlayer from '@/components/AudioPlayer'
import { buildModuleSegments, buildPanelSegments } from '@/lib/audio/segments'
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

// ISR: revalidate every hour so the edition date is always correct

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

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

function seriesSlugForHero(slug: string | undefined): string {
  return slug ?? ''
}

/** In preview, wrap a DB-fed piece in verdict chrome; live renders bare. */
function Chromed({
  preview,
  item,
  children,
}: {
  preview: boolean
  item: { id?: string; kind: string; status: string } | undefined
  children: React.ReactNode
}) {
  if (!preview || !item?.id) return <>{children}</>
  return (
    <PreviewChrome id={item.id} kind={item.kind} status={item.status}>
      {children}
    </PreviewChrome>
  )
}

export default async function EditionPage({
  date,
  preview = false,
}: {
  date: Date
  preview?: boolean
}) {
  // The 7am rule: live renders key the WHOLE paper (rotation, puzzles,
  // prayer — everything derived from the date) to the edition that is
  // actually live in New York, so the paper flips at 7am ET like a morning
  // paper, not at midnight UTC. Preview renders the date it was asked for.
  const now = preview
    ? date
    : new Date(`${effectiveEditionDate(date)}T00:00:00Z`)
  const slug = pickTodaySlug(now)
  // Built on the server from the manifest, handed to the client button as a
  // plain object — no second manifest read in the browser.
  const listenItems = [
    itemForSlug(slug, DEVOTIONAL_TEASERS[slug] ?? slug, "Today's reading"),
  ].filter((item): item is NonNullable<typeof item> => item !== null)
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
  const bankGuides = pickManyForDay(GUIDES, dayOfYear, 3)

  // The DB-fed edition (SA-090). A failed read renders a VISIBLE failure band
  // in place of the editorial sections — never a silently thinner paper. The
  // reading itself never depends on this fetch.
  const editionKey = now.toISOString().slice(0, 10)
  let edition: Edition | null = null
  let editionFailed = false
  try {
    // Live reads obey the 7am rule (SA-114): published rows always, and any
    // draft whose edition has reached its 7am ET flip — silence publishes,
    // rejection vetoes.
    edition = preview
      ? ((await getEditionPreview(editionKey)) as Edition)
      : await getLiveEdition(editionKey)
  } catch {
    editionFailed = true
  }

  // SA-114: "How to read should be something new every day" — daily-written
  // guide articles (DB rows, founder-reviewed) replace the bank rotation
  // whenever the day has them; their full reads live at /guides/daily/[date].
  const edGuideRows = (edition?.guide ?? []).map((g) => g.payload)
  const guides =
    edGuideRows.length > 0
      ? edGuideRows.map((g, i) => ({
          ...g,
          slug: `daily/${editionKey}#g${i + 1}`,
        }))
      : bankGuides
  // A published authored lead (the Sunday feature) REPLACES the rotation
  // front page and the reading body. Rotation is the norm, not a fallback.
  const edLeadItem = edition?.lead?.[0]
  const edLead = edLeadItem?.payload
  const authoredLead = edLead?.mode === 'authored' ? edLead : undefined

  const edPracticeItem = edition?.practice?.[0]
  const edPractice = edPracticeItem?.payload
  const edWord = edition?.word?.[0]?.payload
  const edStripItem = edition?.strip?.[0]
  const edStrip = edStripItem?.payload
  const edGalleryPlates = (edition?.gallery ?? []).map((g) => g.payload)
  const edPrayer = edition?.prayer?.[0]?.payload
  const edWitness = edition?.witness?.[0]?.payload
  const edCrossword = edition?.crossword?.[0]?.payload
  const edUnscramble = edition?.unscramble?.[0]?.payload
  const edQuiz = (edition?.quiz ?? []).map((q) => q.payload)
  const edScreening = (edition?.screening ?? []).map((q) => q.payload)
  const edLetters = (edition?.letter ?? []).map((q) => q.payload)
  const edNotices = (edition?.notice ?? []).map((q) => q.payload)
  // SA-092: the paper grows to ~30 modules a day.
  // SA-093: the deterministic daily modules compute PAGE-SIDE from bundled
  // data — no rows, no paste, full paper by construction. The DB keeps what
  // it is for: the review queue and the audited gallery.
  const edProverb = pageProverb(now)
  const edArchive = pageArchive(now, slug)
  const edB365 = pageB365(now)
  // A DB redletter row (post-SQL-paste) wins over the page-side generator so
  // an audited correction can override the computed pick (SA-114 / F-158).
  const edRedletter =
    edition?.redletter?.[0]?.payload ??
    (await generateRedLetter(now))[0]?.payload
  const edVerse = (await generateVerse(now))[0]?.payload
  const edQuestion = (await generateQuestion(now))[0]?.payload
  const edVoices = pickVoiceForDay(now)
  const seasonEssay = getSeasonEssay(liturgical)
  const wordSearch = buildWordSearch(now)
  const catechism = pickCatechismForDay(now)
  const hymn = pickHymnForDay(now)

  // The lead plate — a feature article leads with art (founder: "very image
  // and text as art forward"). Riso series hero; absent for an authored lead
  // until Sunday features carry their own plates.
  const leadHero = authoredLead
    ? undefined
    : getSeriesHero(seriesSlugForHero(meta?.seriesSlug))

  const seriesTitle = authoredLead
    ? 'The Sunday Feature'
    : (meta?.series.title ?? 'Daily Devotional')
  const seriesSlug = meta?.seriesSlug ?? ''
  const dayTitle =
    authoredLead?.title ?? devotional?.title ?? meta?.day.title ?? 'Today'
  const dayNumber = authoredLead ? 1 : (meta?.day.day ?? 1)
  const scriptureRef =
    authoredLead?.scriptureReference ??
    (devotional as (Devotional & { scriptureReference?: string }) | null)
      ?.scriptureReference ??
    meta?.series.framework?.split(' - ')[0] ??
    ''
  const teaser =
    authoredLead?.standfirst ??
    DEVOTIONAL_TEASERS[slug] ??
    meta?.series.question ??
    ''

  // SA-114: "The lead image should change daily — representing the verse of
  // the day." Manifest-first: scored from the Vasari-captioned print pool
  // against the day's own words; series art stays when nothing truly fits.
  const galleryFiles = (edition?.gallery ?? [])
    .map((g) => (g.payload as { image?: string }).image ?? '')
    .map((img) => img.split('/').pop() ?? '')
  const passageText = (
    (devotional as { modules?: unknown[] } | null)?.modules ?? []
  )
    .map((m) =>
      typeof (m as { passage?: unknown }).passage === 'string'
        ? (m as { passage: string }).passage
        : '',
    )
    .join(' ')
  const dailyArt = authoredLead
    ? null
    : pickLeadArt(
        editionKey,
        [
          dayTitle,
          teaser ?? '',
          scriptureRef,
          passageText,
          edVerse?.text ?? '',
          edRedletter?.text ?? '',
          edProverb?.text ?? '',
        ].join(' '),
        galleryFiles,
      )

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

  // Audio Edition (founder 2026-08-19): the day's reading is listenable on
  // this page. Segments are computed server-side; AudioPlayer plays the
  // pre-rendered Voicebox track when one exists (all rotation slugs are
  // rendered), and falls back to on-device speech - never a silent player.
  const audioSegments = authoredLead
    ? []
    : hasModules
      ? buildModuleSegments(dayTitle, modules)
      : hasPanels
        ? buildPanelSegments(dayTitle, panels)
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

  // SA-114: the sheet's rows keyed for the day's arrangement (three
  // anchors: lead above, funnies pinned, reading below; the rest rotate
  // by weekday — src/lib/edition/arrange.ts).
  const sheetRows: Record<SheetRowKey, ReactNode> = {
    desk: (
      <>
        {/* Row 1 — the standing desk: practice beside the word. */}
        {(edPractice || edWord) && (
          <div className="edition-band paper-box paper-box--wide" data-reveal>
            {edPractice && (
              <Chromed preview={preview} item={edPracticeItem}>
                <section
                  className="edition-practice"
                  aria-label="Today's practice"
                >
                  <p className="edition-kicker">
                    <PracticeIcon />
                    The practice
                  </p>
                  <p className="edition-practice-do">
                    {edPractice.instruction}
                  </p>
                  <p className="edition-practice-why">{edPractice.reason}</p>
                  <p className="edition-practice-time">{edPractice.duration}</p>
                </section>
              </Chromed>
            )}
            {edWord && (
              <section
                id="word-of-the-day"
                className="edition-word"
                aria-label="Word of the day"
              >
                <p className="edition-kicker">
                  <WordIcon />
                  {edWord.language} today
                </p>
                <p
                  className="edition-word-original"
                  lang={edWord.language === 'Greek' ? 'el' : 'he'}
                >
                  {edWord.word}
                </p>
                <p className="edition-word-translit">{edWord.translit}</p>
                <p className="edition-word-gloss">{edWord.gloss}</p>
                <p className="edition-word-note">{edWord.source}</p>
                <p className="edition-word-ref">{edWord.reference}</p>
              </section>
            )}
          </div>
        )}
      </>
    ),
    thirds1: (
      <>
        {/* Row 2 — thirds: the first quiz question, the red letters, and
              today in the year-long plan. Games start BREAKING UP here. */}
        {edQuiz[0] && (
          <div className="paper-box paper-box--third" data-reveal>
            <section aria-label="Where is this from?">
              <div className="edition-section-bar">
                <h2 className="edition-section-head">Where is this from?</h2>
                <p className="edition-section-note">Question 1 of 3</p>
              </div>
              <p className="edition-quiz-explainer">
                A verse from Scripture — tap the reference you think it comes
                from.
              </p>
              <QuizClient questions={[edQuiz[0]]} />
            </section>
          </div>
        )}
        {edRedletter && (
          <div className="paper-box paper-box--third" data-reveal>
            <RedLetterColumn saying={edRedletter} />
          </div>
        )}
        {edB365 && (
          <div className="paper-box paper-box--third" data-reveal>
            <B365Box b365={edB365} />
          </div>
        )}
      </>
    ),
    crossword: (
      <>
        {/* Row 3 — the crossword, with real content beside it (founder:
              "a huge blank area next to it that could easily be content"). */}
        {edCrossword && (
          <section
            className="edition-section paper-box paper-box--crossword"
            data-reveal
            aria-label="The crossword"
            id="the-crossword"
          >
            <div className="edition-section-bar">
              <h2 className="edition-section-head">The crossword</h2>
              <p className="edition-section-note">
                Answers from scripture &middot; no timer, no streak
              </p>
            </div>
            <CrosswordClient puzzle={edCrossword} />
          </section>
        )}
        {/* The Catechism Corner — beside the crossword, so the puzzle
              always sits next to prose (founder: the blank was wasted). */}
        <div
          className={`paper-box ${edCrossword ? 'paper-box--wordgames' : 'paper-box--wide'}`}
          data-reveal
        >
          <section aria-label="The catechism corner">
            <div className="edition-section-bar">
              <h2 className="edition-section-head">The catechism corner</h2>
              <p className="edition-section-note">
                Heidelberg, Q{catechism.number}
              </p>
            </div>
            <p className="edition-catechism-q">{catechism.question}</p>
            <p className="edition-catechism-a">{catechism.answer}</p>
            <p className="edition-quote-cite">
              {catechism.source} &middot; {catechism.scriptures.join(' · ')}
            </p>
          </section>
        </div>
      </>
    ),
    funnies: (
      <>
        {/* Row 4 — the funnies' reserved frame beside the season. */}
        <section
          className="edition-section paper-box paper-box--strip"
          data-reveal
          aria-label="The funnies"
        >
          <div className="edition-section-bar">
            <h2 className="edition-section-head">The funnies</h2>
            <p className="edition-section-note">The comic strip</p>
          </div>
          {edStrip ? (
            <Chromed preview={preview} item={edStripItem}>
              <StripPanel strip={edStrip} />
            </Chromed>
          ) : (
            <div className="edition-funnies-frame">
              <p className="edition-funnies-title">The strip is being drawn.</p>
              <p className="edition-funnies-note">
                A daily comic premieres in this space
              </p>
            </div>
          )}
        </section>
        {/* The season, elaborate — founder: "no one will know what it is."
              Color band, plain name, span, a real essay, and the week
              explained through the season's own pattern. */}
        <div className="paper-box paper-box--season" data-reveal>
          <section className="edition-season" aria-label="The season">
            <div
              className="edition-season-band"
              style={{ ['--season-color' as string]: seasonEssay.colorHex }}
              aria-hidden="true"
            />
            <p className="edition-kicker">The season</p>
            <p className="edition-season-plain">{seasonEssay.plainName}</p>
            <p className="edition-season-span">{seasonEssay.span}</p>
            <p className="edition-season-essay">{seasonEssay.essay}</p>
            <p className="edition-season-week">{seasonEssay.weekLine}</p>
            <p className="edition-season-colorline">{seasonEssay.color}</p>
          </section>
        </div>
      </>
    ),
    gallery: (
      <>
        {/* Row 5 — the gallery spread. */}
        {edGalleryPlates.length > 0 && (
          <div
            id="the-gallery"
            className="paper-box paper-box--wide"
            data-reveal
          >
            <GallerySpread plates={edGalleryPlates} />
          </div>
        )}
      </>
    ),
    verse: (
      <>
        {/* Row 6 — the verse rebuilt, beside the archive pull. */}
        {edUnscramble && (
          <div
            id="word-games"
            className="paper-box paper-box--wordgames"
            data-reveal
          >
            <section aria-label="The verse, rebuilt">
              <div className="edition-section-bar">
                <h2 className="edition-section-head">The verse, rebuilt</h2>
              </div>
              <UnscrambleClient puzzle={edUnscramble} />
            </section>
          </div>
        )}
        {edArchive && (
          <div className="paper-box paper-box--panel" data-reveal>
            <ArchiveBox archive={edArchive} />
          </div>
        )}
      </>
    ),
    howtoread: (
      <>
        {/* Row 7 — how to read. */}
        {guides.length > 0 && (
          <section
            className="edition-section paper-box paper-box--wide"
            data-reveal
            aria-label="How to read"
            id="how-to-read"
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
                  <Link
                    href={`/guides/${g.slug}`}
                    className="edition-guide-platelink"
                  >
                    <span className="edition-guide-plate" data-parallax="0.35">
                      <Image
                        src={g.image}
                        alt={g.alt}
                        fill
                        sizes="(max-width: 900px) 100vw, 30vw"
                        className="edition-guide-img"
                      />
                    </span>
                  </Link>
                  <p className="edition-guide-kicker">{g.kicker}</p>
                  <h3 className="edition-guide-head">{g.title}</h3>
                  <p className="edition-guide-stand">{g.standfirst}</p>
                  <ol className="edition-guide-steps">
                    {g.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="edition-guide-time">{g.minutes}</p>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="edition-rail-more"
                  >
                    Read the full guide &rarr;
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* The word search — founder ask, 2026-08-19. */}
      </>
    ),
    wordsearch: (
      <>
        <section
          className="edition-section paper-box paper-box--panel"
          data-reveal
          aria-label="The word search"
        >
          <div className="edition-section-bar">
            <h2 className="edition-section-head">The word search</h2>
            <p className="edition-section-note">{wordSearch.theme}</p>
          </div>
          <WordSearchClient puzzle={wordSearch} />
        </section>
        {edQuiz[1] && (
          <div className="paper-box paper-box--wordgames" data-reveal>
            <section aria-label="Where is this from? Question two">
              <div className="edition-section-bar">
                <h2 className="edition-section-head">Where is this from?</h2>
                <p className="edition-section-note">Question 2 of 3</p>
              </div>
              <p className="edition-quiz-explainer">
                A verse from Scripture — tap the reference you think it comes
                from.
              </p>
              <QuizClient questions={[edQuiz[1]]} />
            </section>
          </div>
        )}
      </>
    ),
    hymnal: (
      <>
        {/* The Hymnal — one hymn a day, received text from the 1890
              Otterbein Hymnal. */}
        <section
          className="edition-section paper-box paper-box--gallery"
          data-reveal
          aria-label="The hymnal"
        >
          <div className="edition-section-bar">
            <h2 className="edition-section-head">The hymnal</h2>
            <p className="edition-section-note">
              {hymn.author}, {hymn.year}
            </p>
          </div>
          <p className="edition-mini-title">{hymn.title}</p>
          {hymn.verses.map((v, i) => (
            <p key={i} className="edition-hymn-verse">
              {v.join('\n')}
            </p>
          ))}
        </section>
        {edProverb && (
          <div className="paper-box paper-box--prayercol" data-reveal>
            <ProverbBox proverb={edProverb} />
          </div>
        )}
      </>
    ),
    memory: (
      <>
        {/* Row 9 — thirds: memory verse, the question, quiz 3. */}
        {edVerse && (
          <div className="paper-box paper-box--third" data-reveal>
            <VerseBox verse={edVerse} />
          </div>
        )}
        {edQuestion && (
          <div className="paper-box paper-box--third" data-reveal>
            <QuestionBox question={edQuestion} />
          </div>
        )}
        {edQuiz[2] && (
          <div className="paper-box paper-box--third" data-reveal>
            <section aria-label="Where is this from? Question three">
              <div className="edition-section-bar">
                <h2 className="edition-section-head">Where is this from?</h2>
                <p className="edition-section-note">Question 3 of 3</p>
              </div>
              <p className="edition-quiz-explainer">
                A verse from Scripture — tap the reference you think it comes
                from.
              </p>
              <QuizClient questions={[edQuiz[2]]} />
            </section>
          </div>
        )}
      </>
    ),
    prayer: (
      <>
        {/* Row 10 — the daily prayer, full measure, beside voices when
              present. SLOT:VOICES */}
        {edPrayer && (
          <div
            className={`paper-box ${edVoices ? 'paper-box--gallery' : 'paper-box--wide'}`}
            data-reveal
          >
            <span
              id="the-daily-prayer"
              className="sr-only"
              aria-hidden="true"
            />
            <PrayerColumn prayer={edPrayer} />
          </div>
        )}
        {edVoices && (
          <div className="paper-box paper-box--prayercol" data-reveal>
            <VoicesColumn voice={edVoices} />
          </div>
        )}

        {/* Reported sections — render only when real entries exist. */}
        {edWitness && (
          <div className="paper-box paper-box--wide" data-reveal>
            <WitnessColumn witness={edWitness} />
          </div>
        )}
        {edScreening.length > 0 && (
          <div className="paper-box paper-box--wide" data-reveal>
            <ScreeningRoom items={edScreening} />
          </div>
        )}
        {edLetters.length > 0 && (
          <div className="paper-box paper-box--wide" data-reveal>
            <LettersColumn letters={edLetters} />
          </div>
        )}
        {edNotices.length > 0 && (
          <div className="paper-box paper-box--wide" data-reveal>
            <NoticesColumn notices={edNotices} />
          </div>
        )}
      </>
    ),
    coloring: (
      <>
        {/* The coloring corner — the back-page art game (SA-114). */}
        <section
          className="edition-section paper-box paper-box--wide"
          data-reveal
          aria-label="The coloring corner"
        >
          <div className="edition-section-bar">
            <h2 className="edition-section-head">The coloring corner</h2>
            <p className="edition-section-note">
              {pickColoringForDay(now).title} · crayons or the dropper — no
              grades
            </p>
          </div>
          <ColoringClient art={pickColoringForDay(now)} />
        </section>
      </>
    ),
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

        {/* The reading spine — a cobalt hairline that fills as you read.
            Pure CSS scroll timeline (design-system/edition-scroll-motion.css);
            renders as a static invisible sliver where unsupported. */}
        <div className="edition-spine" aria-hidden="true" />

        {/* In this edition — the contents line. The whole paper before the
            first story, and a jump to any section. */}
        <nav className="edition-contents" aria-label="In this edition">
          <a href="#the-reading">The reading</a>
          {edPrayer && <a href="#the-daily-prayer">The prayer</a>}
          {edWord && <a href="#word-of-the-day">The word</a>}
          {edCrossword && <a href="#the-crossword">Crossword</a>}
          {(edUnscramble || edQuiz.length > 0) && (
            <a href="#word-games">Word games</a>
          )}
          {edGalleryPlates.length > 0 && <a href="#the-gallery">The gallery</a>}
          {guides.length > 0 && <a href="#how-to-read">How to read</a>}
        </nav>

        {/* Front page: the lead story, and a rail of what else is in the
            edition. The rail is real catalog data chosen deterministically by
            day — not a recommendation engine pretending to be one. */}
        <div className="edition-front">
          <Chromed preview={preview} item={edLeadItem}>
            <section className="edition-lead" aria-label="Today's reading">
              {(dailyArt || leadHero) && (
                <span className="edition-lead-plate">
                  <Image
                    src={dailyArt?.image ?? leadHero!.src}
                    alt={dailyArt ? dailyArt.shown.slice(0, 140) : ''}
                    fill
                    sizes="(max-width: 900px) 100vw, 60vw"
                    className="edition-lead-img"
                    priority
                  />
                </span>
              )}
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
              {seriesSlug && !authoredLead && (
                <Link
                  href={`/series/${seriesSlug}`}
                  className="edition-lead-series"
                >
                  The full series: {seriesTitle} &rarr;
                </Link>
              )}
            </section>
          </Chromed>

          <aside className="edition-rail" aria-label="Also in this edition">
            {/* Returning-reader card (F-069 → SA-093): a SIDE PANEL now, at
                the top of the rail — founder: the full-width band "destroys
                the flow of the page." Same client island, renders nothing
                for new readers or without JS. */}
            <div className="edition-return-card">
              <TodayReturningBand />
            </div>
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
        {editionFailed && <EditionUnavailable />}

        <div className="paper-sheet">
          {arrangeSheetRows(now).map((rowKey) => (
            <Fragment key={rowKey}>{sheetRows[rowKey]}</Fragment>
          ))}
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

        {/* Listen to the reading */}
        {audioSegments.length > 0 && (
          <AudioPlayer
            slug={slug}
            title={dayTitle}
            segments={audioSegments}
            artworkSrc={leadHero?.src}
          />
        )}

        {/* Reading body — server-rendered, full text in initial HTML */}
        <article
          className="today-reading-body"
          aria-label={`${dayTitle} reading`}
        >
          {authoredLead &&
            authoredLead.body &&
            authoredLead.body
              .split(/\n\n+/)
              .map((para, i) => (
                <p
                  key={i}
                  className="today-body"
                  dangerouslySetInnerHTML={{ __html: inlineMd(para) }}
                />
              ))}

          {!authoredLead && devotional === null && (
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
          {!authoredLead &&
            hasModules &&
            modules.map((mod, i) => <ModuleBlock key={i} mod={mod} />)}

          {/* Panels format (Wake-Up / legacy devotionals) */}
          {!authoredLead &&
            hasPanels &&
            panels
              .filter((p) => p.type !== 'cover')
              .map((panel, i) => <PanelContent key={i} panel={panel} />)}
        </article>

        {/* Navigation footer */}
        <nav className="today-nav-footer" aria-label="Reading navigation">
          {/* SA-101: the day's paper, listenable. Listening is a peer of
              reading here rather than something you find inside the reader —
              this is the surface a person opens with their hands full. Renders
              nothing on a day whose reading has no track. */}
          {listenItems.length > 0 && (
            <ListenButton
              items={listenItems}
              source="daily"
              label="Today's reading"
            >
              Listen
            </ListenButton>
          )}
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
          {/* SA-114: every past paper stays readable. */}
          <Link
            href="/daily-bread/archive"
            className="text-label today-series-link"
          >
            The archive &rarr;
          </Link>
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
