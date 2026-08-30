'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import Skeleton from '@/components/ui/Skeleton'
import DevotionalActions from '@/components/devotional/DevotionalActions'
import DevotionalHeadline from '@/components/devotional/DevotionalHeadline'
import DevotionalRhythm, {
  type RhythmImage,
} from '@/components/devotional/DevotionalRhythm'
import AuthorColophon from '@/components/devotional/AuthorColophon'
import ScrollProgress from '@/components/ScrollProgress'
import ReaderThemeControl from '@/components/ReaderThemeControl'
import ModuleRenderer from '@/components/ModuleRenderer'
import ShareButton from '@/components/ShareButton'
import AudioPlayer from '@/components/AudioPlayer'
import ClipButton from '@/components/ClipButton'
import PushOptIn from '@/components/PushOptIn'
import CompletionBeat from '@/components/CompletionBeat'
import { buildModuleSegments, buildPanelSegments } from '@/lib/audio/segments'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'
import { ReaderProvider } from '@/components/reader/ReaderContext'
import JournalField from '@/components/reader/JournalField'
import PendingIntentReplay from '@/components/reader/PendingIntentReplay'
import DevotionalStickiesLayer from '@/components/DevotionalStickiesLayer'
import DrawingNearAtmosphere from '@/components/devotional/DrawingNearAtmosphere'
import DevotionalArtwork from '@/components/DevotionalArtwork'
import ArtworkLightbox from '@/components/ArtworkLightbox'
import SiteBottom from '@/components/SiteBottom'
import { typographer } from '@/lib/typographer'
import { startSeries } from '@/lib/progress'
import { isDayUnlocked } from '@/lib/day-gating'
import { calculateInsertionPoints } from '@/lib/artwork-placement'
import { useProgress } from '@/hooks/useProgress'
import { useLightbox } from '@/hooks/useLightbox'
import { useProgressStore } from '@/stores/progressStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { SERIES_DATA } from '@/data/series'
import { DEVOTIONAL_ARTWORKS } from '@/data/artwork-manifest'
import { SITE_DEVOTIONAL_ART } from '@/data/site-devotional-art'
import { getSeriesHero } from '@/lib/series-hero'
import { SUBSTACK_SOURCES } from '@/data/substack-sources'
import type { Devotional, Module, Panel } from '@/types'

const DevotionalChat = dynamic(() => import('@/components/DevotionalChat'), {
  ssr: false,
  loading: () => null,
})

function getSeriesSlugFromDevotional(slug: string): string | null {
  const match = slug.match(/^(.+)-day-\d+$/)
  if (!match) return null
  return match[1] === 'identity-crisis' ? 'identity' : match[1]
}

function getDayIndexFromSlug(slug: string): number {
  const match = slug.match(/-day-(\d+)$/)
  return match ? Number.parseInt(match[1], 10) - 1 : 0
}

// A series long enough that a flat day list becomes an unscrollable
// wall (Bible-365 is 365 days). Above this threshold the reader's
// "IN THIS SERIES" index switches to a grouped, jump-able accordion.
// Normal 5-7 day series (and anything <= 31) keep the flat list.
const LONG_SERIES_DAY_THRESHOLD = 31

// Day-of-year -> calendar month index (0-11) for a 365-day plan keyed
// to a non-leap year (2026). Mirrors the math on the /series/bible-365
// browse page so the two surfaces group identically.
const SERIES_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const SERIES_MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function dayOfYearToMonthIndex(dayOfYear: number): number {
  let remaining = dayOfYear
  for (let m = 0; m < 12; m++) {
    if (remaining <= SERIES_MONTH_LENGTHS[m]) return m
    remaining -= SERIES_MONTH_LENGTHS[m]
  }
  return 11
}

export default function DevotionalPageClient({
  slug,
  initialDevotional = null,
}: {
  slug: string
  // Audit C1 (HOMEPAGE-AUDIT-2026-05-11) → resolved. Both server
  // wrappers (/wake-up/devotional/[slug] and /devotional/[slug]) now
  // pass initialDevotional, so the reading body is server-rendered and
  // the LOADING state only appears on a true client-side navigation
  // miss. The prerender crash that originally blocked this
  // (too-busy-for-god-day-6, "b.replace is not a function") was fixed
  // at the root in 0b873c86: typographer() no-ops on non-strings and
  // ResourceModule renders both structured and flat field shapes.
  initialDevotional?: Devotional | null
}) {
  const [devotional, setDevotional] = useState<Devotional | null>(
    initialDevotional,
  )
  const [loading, setLoading] = useState(initialDevotional === null)
  const [isCompleted, setIsCompleted] = useState(false)
  // Audit C2 (HOMEPAGE-AUDIT-2026-05-11): on mobile, the day-nav + library
  // sidebar pushed content ~500-1300px below the fold. Collapse it behind
  // a single pill. Desktop ignores this state (CSS forces it visible).
  const [isDayNavOpenMobile, setIsDayNavOpenMobile] = useState(false)

  const router = useRouter()
  const { isRead, markComplete, unmarkComplete, canRead } = useProgress()

  const seriesSlug = getSeriesSlugFromDevotional(slug)
  const dayIndex = getDayIndexFromSlug(slug)

  const sabbathDay = useSettingsStore((s) => s.sabbathDay)
  const dayLockingEnabled = useSettingsStore((s) => s.dayLockingEnabled)
  const seriesStartDate = useProgressStore((s) =>
    seriesSlug ? s.seriesStartDates[seriesSlug] || null : null,
  )
  const zustandStartSeries = useProgressStore((s) => s.startSeries)

  const dayGate = isDayUnlocked(
    dayIndex,
    seriesStartDate,
    sabbathDay,
    dayLockingEnabled,
  )

  const seriesDays = seriesSlug ? SERIES_DATA[seriesSlug]?.days : null
  // F-084 (SA-033): the legacy Wake-Up silo is retired — canonical only.
  const brandWord = 'EUANGELION'
  const headerTone = 'default'
  const parentRoute = '/series'
  const seriesRoutePrefix = '/series'
  const devotionalRoutePrefix = '/devotional'
  const parentLabel = 'SERIES'
  const modules = (devotional as (Devotional & { modules?: Module[] }) | null)
    ?.modules
  // Last module of the Two-Minute Open (the DEEP DIVE cta that closes it), or
  // -1 on days that have no short read. Used to band and label the open so the
  // reader can see it is a précis rather than the devotional starting twice.
  const twoMinuteOpenEnd =
    modules?.findIndex(
      (m) =>
        m.type === 'cta' &&
        String((m as { ctaLabel?: string }).ctaLabel ?? '')
          .toUpperCase()
          .includes('DEEP DIVE'),
    ) ?? -1
  const panels = devotional?.panels
  const currentDayIdx = seriesDays?.findIndex((d) => d.slug === slug) ?? -1
  const prevDay =
    currentDayIdx > 0 && seriesDays ? seriesDays[currentDayIdx - 1] : null
  const nextDay =
    currentDayIdx >= 0 && seriesDays && currentDayIdx < seriesDays.length - 1
      ? seriesDays[currentDayIdx + 1]
      : null
  const totalDays = seriesDays?.length || 0
  const currentDayNum = currentDayIdx >= 0 ? currentDayIdx + 1 : 0

  // Artwork images for this devotional. Resolution order:
  // 1. SITE_DEVOTIONAL_ART[slug] — Stage-3 generated library (175 slugs)
  // 2. DEVOTIONAL_ARTWORKS[slug] — legacy artist-print mapping
  // 3. Series hero — guarantees every devotional has at least one image
  //    (founder direction 2026-05-12: "all devotionals should have
  //    images"). Critical for the 365 Bible-365 days that have no
  //    per-day curated artwork yet.
  const artworks = useMemo(() => {
    const explicit =
      SITE_DEVOTIONAL_ART[slug] ?? DEVOTIONAL_ARTWORKS[slug] ?? []
    if (explicit.length > 0) return explicit
    // F-083 page-cleanup 2026-07-27: a day whose modules carry their own
    // inline-image artwork must NOT fall back to the series hero — that
    // rendered the hero a second time right under the headline (founder:
    // "same image twice"). The fallback stays for days with no art at
    // all (e.g. Bible-365).
    if (modules?.some((m) => m.type === 'inline-image')) return []
    if (seriesSlug) {
      const seriesHero = getSeriesHero(seriesSlug)
      if (seriesHero) return [seriesHero]
    }
    return []
  }, [slug, seriesSlug, modules])
  const lightbox = useLightbox(artworks)

  // Calculate where to insert artwork between content sections
  const contentCount = modules ? modules.length : (panels?.slice(1).length ?? 0)
  const insertionPoints = useMemo(
    () => calculateInsertionPoints(contentCount, artworks.length),
    [contentCount, artworks.length],
  )

  // Build a map: afterIndex -> artwork to show
  const artworkByPosition = useMemo(() => {
    const map = new Map<number, (typeof artworks)[0]>()
    insertionPoints.forEach((pos, i) => {
      if (i < artworks.length) {
        map.set(pos, artworks[i])
      }
    })
    return map
  }, [insertionPoints, artworks])

  // Audit batch 2026-05-13: NYT-style sticky-image rhythm. The rail
  // cycles through the same `artworks` array the inline breaks use,
  // so a devotional with one curated image still gets one sticky
  // image on desktop. Captioned with the artwork title when present.
  //
  // R37: substack-sourced devotionals MUST use every image attached
  // to the original substack post (founder direction). Override
  // `rhythmImages` for substack slugs to include all
  // substackImagesLocal / substackImages entries. Captions are
  // intentionally specific to the substack post so each illustration
  // reads as "from the Substack original," matching the founder's
  // "specifically referential to the surrounding text" standard.
  const rhythmImages = useMemo<RhythmImage[]>(() => {
    const substackSrc = SUBSTACK_SOURCES[slug]
    if (substackSrc) {
      const urls = (substackSrc.substackImagesLocal ?? [])
        .map((local, idx) => local || substackSrc.substackImages?.[idx] || '')
        .filter(Boolean)
      const sourceUrls =
        urls.length > 0
          ? urls
          : substackSrc.substackImageLocal
            ? [substackSrc.substackImageLocal]
            : substackSrc.substackImage
              ? [substackSrc.substackImage]
              : []
      if (sourceUrls.length > 0) {
        const seriesTitle = (seriesSlug && SERIES_DATA[seriesSlug]?.title) || ''
        return sourceUrls.map((src, i) => ({
          src,
          alt:
            i === 0
              ? `${devotional?.title ?? 'Devotional'} — original cover image`
              : `${devotional?.title ?? 'Devotional'} — illustration ${i + 1} from the original Substack post`,
          caption:
            i === 0
              ? `Original cover · ${seriesTitle || 'from the Substack post'}`
              : `From the original Substack post · ${seriesTitle || ''}`.trim(),
        }))
      }
    }
    return artworks.map((a) => ({
      src: a.src,
      alt: a.title || 'Devotional artwork',
      caption: a.title || undefined,
    }))
  }, [slug, artworks, seriesSlug, devotional?.title])

  // Audio Edition segments: read the REAL devotional text aloud, one
  // section at a time. Prefer modules; fall back to the Wake-Up panel
  // format. Built from the same data the page already renders.
  const audioSegments = useMemo(() => {
    if (!devotional) return []
    if (modules && modules.length > 0) {
      return buildModuleSegments(devotional.title, modules, devotional.subtitle)
    }
    if (panels && panels.length > 0) {
      return buildPanelSegments(devotional.title, panels, devotional.subtitle)
    }
    return []
  }, [devotional, modules, panels])

  useEffect(() => {
    setIsCompleted(isRead(slug))
  }, [isRead, slug])

  // Audit batch 2026-05-13: enable the rhythm CSS layer on <body>
  // while a devotional is open. Removing this class is the single-
  // line scale-back path for the entire NYT-style reading rhythm.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('rhythm-enabled')
    return () => {
      document.body.classList.remove('rhythm-enabled')
    }
  }, [])

  useEffect(() => {
    // Audit C1: skip the client fetch when SSR already gave us the data.
    // Still kick off the seriesStarted lifecycle so progress tracking works.
    if (devotional !== null) {
      if (seriesSlug) {
        startSeries(seriesSlug)
        zustandStartSeries(seriesSlug)
      }
      return
    }

    let cancelled = false
    async function loadDevotional() {
      try {
        const response = await fetch(`/devotionals/${slug}.json`)
        if (!response.ok) throw new Error('Devotional not found')
        const data = (await response.json()) as Devotional
        if (cancelled) return
        setDevotional(data)

        if (seriesSlug) {
          startSeries(seriesSlug)
          zustandStartSeries(seriesSlug)
        }
      } catch {
        if (cancelled) return
        setDevotional(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDevotional()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, seriesSlug, zustandStartSeries])

  async function saveBookmark(title: string) {
    await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devotionalSlug: slug,
        note: title,
      }),
    })
    window.dispatchEvent(new CustomEvent('libraryUpdated'))
  }

  if (loading) {
    return (
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          <EuangelionShellHeader brandWord={brandWord} tone={headerTone} />
          <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
            <Breadcrumbs
              className="mb-7"
              items={[
                { label: 'HOME', href: '/' },
                { label: parentLabel, href: parentRoute },
                { label: 'DEVOTIONAL' },
              ]}
            />
            {/* D-24 (F-074): layout-accurate skeleton matching the loaded
                reader (header panel + actions + day-nav pill + copy) — no
                centered text card that reflows on arrival. */}
            <p className="sr-only" role="status" aria-live="polite">
              Preparing your devotional.
            </p>
            <header
              className="mb-8 border px-6 py-6"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="mb-3 h-9 w-4/5" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            </header>
            <div className="mb-6 flex flex-wrap gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mb-8 h-11 w-full" />
            <div className="mx-auto max-w-2xl">
              <Skeleton className="mb-3 h-4 w-full" />
              <Skeleton className="mb-3 h-4 w-full" />
              <Skeleton className="mb-3 h-4 w-11/12" />
              <Skeleton className="mb-8 h-4 w-3/4" />
              <Skeleton className="mb-8 h-28 w-full" />
              <Skeleton className="mb-3 h-4 w-full" />
              <Skeleton className="mb-3 h-4 w-10/12" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </section>
          <SiteBottom />
        </main>
      </div>
    )
  }

  if (!devotional) {
    return (
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          <EuangelionShellHeader brandWord={brandWord} tone={headerTone} />
          <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
            <Breadcrumbs
              className="mb-7"
              items={[
                { label: 'HOME', href: '/' },
                { label: parentLabel, href: parentRoute },
                { label: 'DEVOTIONAL' },
              ]}
            />
            <section
              className="devotional-shell-panel border px-6 py-10 text-center"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="text-label vw-small mb-3 text-gold">NOT FOUND</p>
              <h1 className="vw-heading-md">
                We couldn&apos;t load this reading.
              </h1>
              <p className="vw-small mt-3 text-secondary">
                Try a different devotional from your series.
              </p>
              <Link
                href={parentRoute}
                className="cta-major text-label vw-small mt-6 inline-block px-5 py-2"
              >
                BROWSE SERIES
              </Link>
            </section>
          </section>
          <SiteBottom />
          <section className="mock-bottom-brand">
            <h2 className="text-masthead mock-masthead-word">
              <span className="js-shell-masthead-fit mock-masthead-text">
                {brandWord}
              </span>
            </h2>
          </section>
        </main>
      </div>
    )
  }

  return (
    <ReaderProvider devotionalSlug={slug}>
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          {/* SA-133 / F-177 — scrolling halftone atmosphere, DRAWING NEAR ONLY.
              Deliberately gated on the slug: this is an experiment on one
              series, and no other reading's look changes by a pixel. */}
          {slug.startsWith('drawing-near-') && (
            <DrawingNearAtmosphere
              heroSrc={seriesSlug ? getSeriesHero(seriesSlug)?.src : undefined}
            />
          )}
          <ScrollProgress />
          {/* F-067: in-reader "Aa" sheet — named reading themes + text size.
            Reader chrome only (this is the reading surface); the fixed
            trigger sits bottom-left, mirroring the chat FAB bottom-right. */}
          <ReaderThemeControl />
          <EuangelionShellHeader brandWord={brandWord} tone={headerTone} />

          <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
            {/* Founder direction 2026-08-14: nothing appears above the
              devotional's title. Removed from here — breadcrumbs (the title
              repeated its own last crumb), and the Substack cover banner
              (imported article headers are being replaced by library
              artwork). The action rows below moved to the end of the reading;
              the folio, which carried the church-year line, is gone. */}

            {/* Audit 2026-05-14: the day-nav pill now runs at every
              breakpoint. The 260px sidebar that used to occupy the
              left column on desktop competes with reading content
              (founder feedback). Now the sidebar is hidden by default
              on every viewport and reveals as a drawer when the
              reader taps the pill. */}
            {/* F-083 page-cleanup 2026-07-27 (founder): the series
              day-index reads as a table of contents on short series —
              removed there (the series page lists the days; prev/next
              handles flow). Long plans (Bible-365) keep it: 365 days
              genuinely need an index. */}
            {seriesDays && seriesDays.length > LONG_SERIES_DAY_THRESHOLD && (
              <button
                type="button"
                className="devotional-day-nav-pill"
                aria-expanded={isDayNavOpenMobile}
                aria-controls="devotional-day-nav-mobile"
                onClick={() => setIsDayNavOpenMobile((v) => !v)}
              >
                <span className="text-label vw-small text-gold">
                  DAY {currentDayNum} OF {totalDays}
                </span>
                <span className="vw-small text-secondary">
                  {isDayNavOpenMobile
                    ? 'Hide series index ▴'
                    : 'See all days ▾'}
                </span>
              </button>
            )}

            <section
              className={`devotional-shell-grid ${
                isDayNavOpenMobile
                  ? 'is-sidebar-open md:grid md:grid-cols-[260px_minmax(0,1fr)] md:gap-8'
                  : 'is-sidebar-closed'
              }`}
            >
              <aside
                id="devotional-day-nav-mobile"
                className={`devotional-shell-sidebar-wrap mb-6 md:mb-0 ${isDayNavOpenMobile ? '' : 'devotional-shell-sidebar-mobile-closed'}`}
              >
                <div
                  className="devotional-shell-sidebar shell-sticky-panel border-subtle bg-surface-raised p-4 md:h-fit"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {seriesDays &&
                    seriesDays.length > LONG_SERIES_DAY_THRESHOLD && (
                      <>
                        <p className="text-label vw-small mb-3 text-gold">
                          IN THIS SERIES
                        </p>
                        {seriesDays.length > LONG_SERIES_DAY_THRESHOLD ? (
                          // Long plan (e.g. Bible-365): a flat list would be a
                          // 365-item wall. Render a grouped, jump-able month
                          // accordion instead. Locking behavior is preserved
                          // per-day inside the component.
                          <LongSeriesDayIndex
                            days={seriesDays}
                            currentSlug={slug}
                            routePrefix={devotionalRoutePrefix}
                            canRead={canRead}
                          />
                        ) : (
                          <div className="mb-5 grid gap-2">
                            {seriesDays.map((day) => {
                              const check = canRead(day.slug)
                              const isLocked =
                                !check.canRead && day.slug !== slug
                              const isCurrent = day.slug === slug

                              if (isLocked) {
                                return (
                                  <div
                                    key={day.slug}
                                    className="border px-3 py-2"
                                    style={{
                                      borderColor: 'var(--color-border)',
                                      opacity: 0.58,
                                    }}
                                  >
                                    <p className="text-label vw-small text-gold">
                                      DAY {day.day} • LOCKED
                                    </p>
                                    <p className="vw-small text-secondary">
                                      {day.title}
                                    </p>
                                  </div>
                                )
                              }

                              return (
                                <Link
                                  key={day.slug}
                                  href={`${devotionalRoutePrefix}/${day.slug}`}
                                  className="block border px-3 py-2"
                                  style={{
                                    borderColor: isCurrent
                                      ? 'var(--color-border-strong)'
                                      : 'var(--color-border)',
                                    background: isCurrent
                                      ? 'var(--color-active)'
                                      : 'transparent',
                                  }}
                                >
                                  <p className="text-label vw-small text-gold">
                                    DAY {day.day}
                                  </p>
                                  <p className="vw-small text-secondary">
                                    {day.title}
                                  </p>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}

                  {/* Audit C2: LIBRARY is app-wide nav, not reading chrome.
                    Hide on mobile entirely (it pushed content well below
                    the fold). Keep visible on desktop. */}
                  <div
                    className="hidden border-t pt-4 md:block"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-label vw-small mb-3 text-gold">
                      LIBRARY
                    </p>
                    {/* F-030: every item now resolves to a real, deep-linked
                      section of the unified retrieval rail (`/library?tab=`).
                      No more dead `?tab=` links that silently landed on the
                      default view — these target the live tablist. */}
                    <div className="grid gap-2">
                      <Link
                        href="/today"
                        className="block border px-3 py-2 text-secondary affordance"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        Today’s Reading
                      </Link>
                      <Link
                        href="/library?tab=bookmarks"
                        className="block border px-3 py-2 text-secondary affordance"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        Bookmarks
                      </Link>
                      <Link
                        href="/library?tab=highlights"
                        className="block border px-3 py-2 text-secondary affordance"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        Highlights
                      </Link>
                      <Link
                        href="/library?tab=notes"
                        className="block border px-3 py-2 text-secondary affordance"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        Notes
                      </Link>
                      <Link
                        href="/library?tab=archive"
                        className="block border px-3 py-2 text-secondary affordance"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        Archive
                      </Link>
                      <Link
                        href="/library"
                        className="block border px-3 py-2 text-secondary affordance"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        Full Library
                      </Link>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="devotional-reader-stage">
                {!dayGate.unlocked ? (
                  <section
                    className="devotional-shell-panel border px-6 py-8"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="vw-body text-secondary">
                      {typographer(dayGate.message)}
                    </p>
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="cta-major text-label vw-small mt-6 px-5 py-2"
                    >
                      BACK TO SERIES
                    </button>
                  </section>
                ) : (
                  <>
                    <DevotionalStickiesLayer devotionalSlug={slug} />

                    {/* Founder direction 2026-08-14: the folio strip that sat
                      here is gone. It was the last thing standing above the
                      title, and it carried <ChurchYearOverline> onto every
                      devotional — which belongs on the home page, not in a
                      reading. Day position now rides the meta line below. */}

                    {/* Audit 2026-05-13: homepage-style headline hero. Mirrors
                      the featured-devotional 2/3-image + 1/3-text layout
                      at the top of every devotional page. Scale back:
                      delete this block. */}
                    {/* F-083 page-cleanup 2026-07-27 (founder): THE single
                      hero + title render. */}
                    {/* 2026-08-14: the day's teaser now runs under the title as
                      the dek, and the scripture reference points at what the
                      reading is anchored in. Both render after the title. */}
                    {devotional && (
                      <DevotionalHeadline
                        imageSrc={
                          seriesSlug
                            ? getSeriesHero(seriesSlug)?.src
                            : undefined
                        }
                        imageAlt={`Illustration accompanying ${devotional.title}`}
                        title={devotional.title}
                        dek={devotional.teaser ?? undefined}
                        scripture={devotional.scriptureReference ?? undefined}
                      />
                    )}

                    {/* Founder direction 2026-08-14: quick links to every day of
                      the series, so moving between days does not mean going
                      back out to the series page. Placed directly under the
                      headline rather than above it — the title stays the first
                      thing on the page (SA-037). Long plans keep the existing
                      day-nav pill instead; 365 links is not a quick link. */}
                    {seriesDays &&
                      seriesDays.length > 1 &&
                      seriesDays.length <= LONG_SERIES_DAY_THRESHOLD && (
                        <nav
                          className="devotional-day-quicklinks mb-6 flex flex-wrap items-center gap-2"
                          aria-label="Days in this series"
                        >
                          {seriesDays.map((day, i) => {
                            const isCurrent = day.slug === slug
                            return (
                              <Link
                                key={day.slug}
                                href={`${devotionalRoutePrefix}/${day.slug}`}
                                className="text-label vw-small link-highlight border px-3 py-1"
                                style={{
                                  borderColor: isCurrent
                                    ? 'var(--color-accent, var(--color-border))'
                                    : 'var(--color-border)',
                                  color: isCurrent
                                    ? 'var(--color-accent, inherit)'
                                    : undefined,
                                }}
                                aria-current={isCurrent ? 'page' : undefined}
                                title={day.title}
                              >
                                DAY {i + 1}
                              </Link>
                            )
                          })}
                        </nav>
                      )}

                    {/* Phase 2.1: Audio Edition — free, on-device read-aloud of
                      this devotional's real text, one section at a time.
                      Founder direction 2026-07-28: it sits BELOW the folio and
                      headline. Opening the page on a player (and formerly its
                      section index) buried the headline and read like an app
                      chrome panel; a magazine gives you the title first and
                      offers the audio edition underneath it. */}
                    {audioSegments.length > 0 && (
                      <AudioPlayer
                        title={devotional.title}
                        segments={audioSegments}
                        artworkSrc="/icons/icon-512.png"
                        slug={slug}
                        className="devotional-shell-panel mb-6"
                      />
                    )}

                    {/* Audit 2026-05-13: NYT-magazine-style sticky-image
                      reading rhythm. Wraps the existing module flow with
                      a sticky-image rail (desktop) + observer that swaps
                      the active image as the reader scrolls. Mobile falls
                      back to the legacy single-column flow with inline
                      artwork breaks. Scale back: pass `enabled={false}`. */}
                    {/* SA-013 2026-07-12 (founder): desktop no longer uses the
                      two-column sticky-image rail / boxed modules. The reading
                      is one continuous piece (see continuous-flow CSS). */}
                    <DevotionalRhythm images={rhythmImages} enabled={false}>
                      {modules
                        ? modules.map((module, index) => {
                            // Founder direction 2026-07-28: the Two-Minute Open is
                            // the right idea (quick start, then deep dive) but it
                            // was built out of the same parts as the devotional
                            // itself — scripture, word study, reflection, prayer —
                            // so nothing told the reader it was a précis. It read
                            // as the devotional, which then inexplicably restarted.
                            //
                            // Every real-world version of this pattern makes the
                            // short read a visibly different object: Digg's tinted
                            // "TL;DR" card, ChatGPT's "Executive Summary", HYPE's
                            // bulleted "Summary", Finimize's labelled brief. We do
                            // the same — the open is banded and labelled, and its
                            // end is marked, so the restart is intentional.
                            const inOpen =
                              twoMinuteOpenEnd >= 0 && index <= twoMinuteOpenEnd
                            return (
                              <Fragment key={index}>
                                <article
                                  id={`devotional-section-${index + 1}`}
                                  className={`devotional-shell-panel devotional-flow-article${
                                    inOpen ? ' is-two-minute' : ''
                                  }`}
                                  data-two-minute={
                                    inOpen
                                      ? index === 0
                                        ? 'start'
                                        : index === twoMinuteOpenEnd
                                          ? 'end'
                                          : 'mid'
                                      : undefined
                                  }
                                >
                                  <ModuleRenderer
                                    module={module}
                                    moduleIndex={index}
                                  />
                                </article>
                                {artworkByPosition.has(index) && (
                                  <div className="devotional-artwork-inline">
                                    <DevotionalArtwork
                                      artwork={artworkByPosition.get(index)!}
                                      onOpenLightbox={() =>
                                        lightbox.open(
                                          artworkByPosition.get(index)!.slug,
                                        )
                                      }
                                    />
                                  </div>
                                )}
                              </Fragment>
                            )
                          })
                        : panels?.slice(1).map((panel, index) => (
                            <Fragment key={panel.number}>
                              <article
                                id={`devotional-section-${index + 1}`}
                                className="devotional-shell-panel devotional-flow-article"
                              >
                                {index > 0 && (
                                  <div
                                    className="mb-6 border-t"
                                    style={{
                                      borderColor: 'var(--color-border)',
                                    }}
                                    aria-hidden="true"
                                  />
                                )}
                                <PanelComponent panel={panel} />
                              </article>
                              {artworkByPosition.has(index) && (
                                <div className="devotional-artwork-inline">
                                  <DevotionalArtwork
                                    artwork={artworkByPosition.get(index)!}
                                    onOpenLightbox={() =>
                                      lightbox.open(
                                        artworkByPosition.get(index)!.slug,
                                      )
                                    }
                                  />
                                </div>
                              )}
                            </Fragment>
                          ))}
                    </DevotionalRhythm>

                    {/* Audit 2026-05-14: 4-line author colophon caps the reading. */}
                    <AuthorColophon
                      slug={slug}
                      translation={
                        modules?.find((m) => m.type === 'scripture')
                          ?.translation ?? undefined
                      }
                    />

                    {/* Founder direction 2026-08-14: these are the action rows
                      that used to stack above the title. They are still
                      needed — they just belong after the reading, where a
                      reader who has finished looks for what to do next. */}
                    <div className="devotional-action-row mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                      <Link
                        href={
                          seriesSlug
                            ? `${seriesRoutePrefix}/${seriesSlug}`
                            : parentRoute
                        }
                        className="text-label vw-small link-highlight leading-none"
                      >
                        BACK TO SERIES
                      </Link>
                      <ShareButton
                        title={devotional.title}
                        text={`${devotional.title} — Euangelion`}
                        className="leading-none"
                      />
                      {SUBSTACK_SOURCES[slug]?.substackUrl && (
                        <a
                          href={SUBSTACK_SOURCES[slug]!.substackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-label vw-small link-highlight leading-none"
                        >
                          READ ON SUBSTACK ↗
                        </a>
                      )}
                    </div>

                    <DevotionalActions
                      devotionalSlug={slug}
                      seriesSlug={seriesSlug}
                      redirectPath={`${devotionalRoutePrefix}/${slug}`}
                    />

                    <section
                      className="devotional-shell-panel mt-6 border px-6 py-5"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <p className="vw-small text-secondary">
                        {isCompleted
                          ? 'Finished. Return anytime to re-read.'
                          : 'Finished reading? Mark this day read.'}
                      </p>
                      {/* Marking a day read writes to three places and, until
                          now, none of them had a way back — an accidental tap
                          on a one-handed surface was permanent. Offered quietly
                          rather than as a second CTA: undo should be findable,
                          not competing with the thing it undoes. */}
                      {isCompleted && (
                        <button
                          type="button"
                          className="text-label vw-small link-highlight mt-3"
                          onClick={() => {
                            unmarkComplete(slug)
                            setIsCompleted(false)
                            window.dispatchEvent(
                              new CustomEvent('libraryUpdated'),
                            )
                          }}
                        >
                          MARK AS UNREAD
                        </button>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {!isCompleted && (
                          <button
                            type="button"
                            className="cta-major text-label vw-small px-5 py-2"
                            onClick={() => {
                              markComplete(slug)
                              setIsCompleted(true)
                              window.dispatchEvent(
                                new CustomEvent('libraryUpdated'),
                              )
                              // Signal the post-read push opt-in (it stays inert
                              // until VAPID is configured — see PushOptIn).
                              try {
                                window.localStorage.setItem(
                                  'euangelion:just-finished-reading',
                                  '1',
                                )
                              } catch {
                                // Storage unavailable (private mode) — no opt-in.
                              }
                            }}
                          >
                            MARK READ
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-label vw-small link-highlight"
                          onClick={() => void saveBookmark(devotional.title)}
                        >
                          BOOKMARK
                        </button>
                        {/* Phase 2.4: clip the reader's current text selection
                          to their local commonplace book (device-only). */}
                        <ClipButton
                          sourceTitle={devotional.title}
                          sourceSlug={slug}
                          sourceHref={`${devotionalRoutePrefix}/${slug}`}
                        />
                        <Link
                          href="/library?tab=clippings"
                          className="text-label vw-small link-highlight leading-none"
                        >
                          CLIPPINGS
                        </Link>
                      </div>
                      {/* F-066 (SA-025): the quiet completion beat. Renders
                        nothing until the progressUpdated event fired by
                        markComplete() above arrives — one benediction line
                        paired with this day's scripture reference, right at
                        the completion point. Not a modal; auto-dismisses. */}
                      <CompletionBeat
                        scriptureReference={devotional.scriptureReference}
                      />
                      {/* Phase 2.2: one calm daily-reading opt-in, post-read only.
                        Renders nothing until VAPID is configured + the reader
                        has finished a day. */}
                      <PushOptIn />
                    </section>
                  </>
                )}
              </div>
            </section>

            {(prevDay || nextDay) && (
              <nav
                className="devotional-shell-nav mt-8 grid gap-4 md:grid-cols-2"
                aria-label="Devotional navigation"
              >
                {prevDay ? (
                  <Link
                    href={`${devotionalRoutePrefix}/${prevDay.slug}`}
                    className="devotional-shell-panel block border px-5 py-4"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-label vw-small text-gold">
                      &larr; PREVIOUS
                    </p>
                    <p className="vw-body text-secondary">{prevDay.title}</p>
                  </Link>
                ) : (
                  <div
                    className="devotional-shell-panel border px-5 py-4"
                    style={{ borderColor: 'var(--color-border)', opacity: 0.5 }}
                  />
                )}

                {nextDay ? (
                  <Link
                    href={`${devotionalRoutePrefix}/${nextDay.slug}`}
                    className="devotional-shell-panel block border px-5 py-4 text-right"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-label vw-small text-gold">NEXT &rarr;</p>
                    <p className="vw-body text-secondary">{nextDay.title}</p>
                  </Link>
                ) : (
                  <div
                    className="devotional-shell-panel border px-5 py-4"
                    style={{ borderColor: 'var(--color-border)', opacity: 0.5 }}
                  />
                )}
              </nav>
            )}
          </section>
          {/* SA-061: one unanchored entry per reading, for what does not
              belong to any single line. The close of the reading, before the
              site furniture — not an appendix after it. */}
          <section
            className="mock-section"
            aria-labelledby="devotional-journal"
          >
            <p
              id="devotional-journal"
              className="text-label vw-small mb-3 text-gold"
            >
              BEFORE YOU GO
            </p>
            <p className="text-serif-italic vw-body-lg leading-relaxed mb-1">
              Anything you want to keep from today?
            </p>
            <JournalField
              kind="entry"
              anchorKey="entry"
              label="Your entry for this reading"
              placeholder="Whatever you want to remember…"
              signedOutLabel="Sign in to keep an entry"
              rows={4}
              showNote
            />
          </section>

          <SiteBottom />
          <section className="mock-bottom-brand">
            <h2 className="text-masthead mock-masthead-word">
              <span className="js-shell-masthead-fit mock-masthead-text">
                {brandWord}
              </span>
            </h2>
          </section>
        </main>

        {dayGate.unlocked && (
          <>
            <TextHighlightTrigger devotionalSlug={slug} />
            <PendingIntentReplay />
            <DevotionalChat
              devotionalSlug={slug}
              devotionalTitle={devotional.title}
            />
          </>
        )}

        {/* Artwork lightbox gallery */}
        <ArtworkLightbox
          artwork={lightbox.current}
          isOpen={lightbox.isOpen}
          currentIndex={lightbox.currentIndex}
          total={lightbox.total}
          onClose={lightbox.close}
          onNext={lightbox.next}
          onPrev={lightbox.prev}
        />
      </div>
    </ReaderProvider>
  )
}

function PanelComponent({ panel }: { panel: Panel }) {
  return (
    <article>
      {panel.heading && (
        <p className="text-label vw-small mb-3 text-gold">{panel.heading}</p>
      )}

      {panel.content.split('\n\n').map((paragraph, i) => {
        const isScripture =
          paragraph.trim().startsWith('\u201c') &&
          paragraph.trim().endsWith('\u201d')

        return (
          <p
            key={i}
            className={`vw-body mb-4 ${isScripture ? 'text-serif-italic' : 'text-secondary'} type-prose`}
            style={{ whiteSpace: 'pre-line' }}
          >
            {paragraph
              .split('**')
              .map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
              )}
          </p>
        )
      })}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Long-series ("IN THIS SERIES") grouped day index.
//
// A flat 365-item list is unusable inside the reader's slide-out drawer.
// This renders a month accordion plus a "jump to day" control: a returning
// reader reaches any day in a tap or two, mobile-first (375px), with every
// interactive target >= 44px. Day-locking is preserved exactly — each day
// is run through `canRead` and locked days render as non-interactive rows,
// identical in semantics to the flat short-series list.
// ---------------------------------------------------------------------------
function LongSeriesDayIndex({
  days,
  currentSlug,
  routePrefix,
  canRead,
}: {
  days: Array<{ day: number; title: string; slug: string }>
  currentSlug: string
  routePrefix: string
  canRead: (slug: string) => { canRead: boolean }
}) {
  // Group days into the 12 calendar months by day-of-year.
  const months = useMemo(() => {
    const buckets: Array<{
      idx: number
      name: string
      days: Array<{ day: number; title: string; slug: string }>
    }> = SERIES_MONTH_NAMES.map((name, idx) => ({ idx, name, days: [] }))
    for (const d of days) {
      buckets[dayOfYearToMonthIndex(d.day)].days.push(d)
    }
    return buckets.filter((m) => m.days.length > 0)
  }, [days])

  // The month containing the day the reader is currently on — expanded by
  // default so the drawer opens *short* (on the current month), never as a
  // 365-row wall.
  const currentMonthIdx = useMemo(() => {
    const cur = days.find((d) => d.slug === currentSlug)
    return cur ? dayOfYearToMonthIndex(cur.day) : (months[0]?.idx ?? 0)
  }, [days, currentSlug, months])

  const [openMonth, setOpenMonth] = useState<number>(currentMonthIdx)

  const handleJump = (value: string) => {
    if (!value) return
    const monthIdx = Number.parseInt(value, 10)
    if (Number.isNaN(monthIdx)) return
    setOpenMonth(monthIdx)
    // Defer scroll until the accordion has expanded the target month.
    requestAnimationFrame(() => {
      document
        .getElementById(`b365idx-month-${monthIdx}`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  return (
    <div className="b365idx mb-5">
      <style>{`
        .b365idx { font-size: 0.85rem; }
        .b365idx-jump-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .b365idx-jump-label {
          letter-spacing: 0.08em;
          white-space: nowrap;
        }
        .b365idx-jump-select {
          flex: 1 1 auto;
          min-height: 44px;
          padding: 0 0.6rem;
          border: 1.5px solid var(--color-border, currentColor);
          background: var(--color-surface-raised, transparent);
          color: inherit;
          font: inherit;
          border-radius: 0;
        }
        .b365idx-jump-select:focus-visible {
          outline: 2px solid var(--color-border-strong, currentColor);
          outline-offset: 1px;
        }
        .b365idx-month { margin-bottom: 0.4rem; }
        .b365idx-month-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          width: 100%;
          min-height: 44px;
          padding: 0.5rem 0.75rem;
          border: 1.5px solid var(--color-border, currentColor);
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }
        .b365idx-month-toggle:focus-visible {
          outline: 2px solid var(--color-border-strong, currentColor);
          outline-offset: 1px;
        }
        .b365idx-month-toggle[aria-expanded='true'] {
          background: var(--color-active, transparent);
          border-color: var(--color-border-strong, currentColor);
        }
        .b365idx-month-name {
          font-family: var(--font-family-serif);
          font-size: 1.05rem;
          line-height: 1.1;
        }
        .b365idx-month-meta {
          letter-spacing: 0.08em;
          opacity: 0.7;
          white-space: nowrap;
        }
        .b365idx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
          gap: 0.35rem;
          padding: 0.5rem 0;
        }
        .b365idx-day {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          min-width: 44px;
          padding: 0.25rem;
          border: 1.5px solid var(--color-border, currentColor);
          color: inherit;
          text-decoration: none;
          font-variant-numeric: tabular-nums;
          font-size: 0.8rem;
          letter-spacing: 0.02em;
        }
        .b365idx-day:focus-visible {
          outline: 2px solid var(--color-border-strong, currentColor);
          outline-offset: 1px;
        }
        .b365idx-day[data-current='true'] {
          background: var(--color-active, currentColor);
          border-color: var(--color-border-strong, currentColor);
          font-weight: 600;
        }
        .b365idx-day[data-locked='true'] {
          opacity: 0.45;
          cursor: not-allowed;
        }
        @media (prefers-reduced-motion: reduce) {
          .b365idx-day, .b365idx-month-toggle { transition: none; }
        }
      `}</style>

      <div className="b365idx-jump-row">
        <label
          htmlFor="b365idx-jump"
          className="text-label vw-small b365idx-jump-label"
        >
          JUMP TO
        </label>
        <select
          id="b365idx-jump"
          className="b365idx-jump-select vw-small"
          value={openMonth}
          onChange={(e) => handleJump(e.target.value)}
          aria-label="Jump to a month in this plan"
        >
          {months.map((m) => (
            <option key={m.idx} value={m.idx}>
              {m.name} — Day {m.days[0].day}
              {m.days.length > 1 ? `–${m.days[m.days.length - 1].day}` : ''}
            </option>
          ))}
        </select>
      </div>

      {months.map((m) => {
        const isOpen = openMonth === m.idx
        const hasCurrent = m.days.some((d) => d.slug === currentSlug)
        return (
          <div
            key={m.idx}
            id={`b365idx-month-${m.idx}`}
            className="b365idx-month"
          >
            <button
              type="button"
              className="b365idx-month-toggle"
              aria-expanded={isOpen}
              aria-controls={`b365idx-panel-${m.idx}`}
              onClick={() => setOpenMonth(isOpen ? -1 : m.idx)}
            >
              <span className="b365idx-month-name">
                {m.name}
                {hasCurrent ? (
                  <span className="text-label vw-small text-gold">
                    {' '}
                    · YOU’RE HERE
                  </span>
                ) : null}
              </span>
              <span className="text-label vw-small b365idx-month-meta">
                {m.days.length} {isOpen ? '▴' : '▾'}
              </span>
            </button>
            {isOpen && (
              <div id={`b365idx-panel-${m.idx}`} className="b365idx-grid">
                {m.days.map((day) => {
                  const isCurrent = day.slug === currentSlug
                  const isLocked = !canRead(day.slug).canRead && !isCurrent
                  if (isLocked) {
                    return (
                      <span
                        key={day.slug}
                        className="b365idx-day"
                        data-locked="true"
                        aria-disabled="true"
                        title={`Day ${day.day} (locked): ${day.title}`}
                      >
                        {day.day}
                      </span>
                    )
                  }
                  return (
                    <Link
                      key={day.slug}
                      href={`${routePrefix}/${day.slug}`}
                      className="b365idx-day"
                      data-current={isCurrent ? 'true' : undefined}
                      aria-current={isCurrent ? 'true' : undefined}
                      title={`Day ${day.day}: ${day.title}`}
                    >
                      {day.day}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
