'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AddToQueue from '@/components/audio/AddToQueue'
import { buildSeriesQueue } from '@/lib/audio/queue-builder'
import { useSearchParams } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import ShareButton from '@/components/ShareButton'
import SiteBottom from '@/components/SiteBottom'
import ResumeSeriesPill from '@/components/ResumeSeriesPill'
import SeriesActions from '@/components/devotional/SeriesActions'
import { typographer } from '@/lib/typographer'
import { readingTimeLabel } from '@/lib/reading-time'
import { SUBSTACK_SOURCES } from '@/data/substack-sources'
import { useProgress } from '@/hooks/useProgress'
import { nextUnreadDay } from '@/lib/reading/active-day'
import { SERIES_HERO } from '@/data/artwork-manifest'
import type { SeriesInfo } from '@/data/series'
import type { DayScriptureByDayNumber } from '@/lib/soul-audit/series-day-scripture'
import type { SeriesVoice, SeriesArtworkItem } from '@/lib/series-detail-tabs'

/**
 * F-074 series detail tabs (Waking Up model: Sessions · About ·
 * Voices · Artwork). Tabs render adaptively — VOICES and ARTWORK only
 * appear when the series actually carries that data. DAYS is the
 * default; ?tab= deep-links the rest.
 */
type SeriesTabKey = 'days' | 'about' | 'voices' | 'artwork'

const TAB_LABELS: Record<SeriesTabKey, string> = {
  days: 'DAYS',
  about: 'ABOUT',
  voices: 'VOICES',
  artwork: 'ARTWORK',
}

/**
 * Reads ?tab= inside its own Suspense boundary so the page itself
 * stays fully static (useSearchParams outside Suspense would bail the
 * whole route into client-side rendering). Renders nothing.
 */
function SeriesTabParamSync({
  onTabParam,
}: {
  onTabParam: (value: string | null) => void
}) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  useEffect(() => {
    onTabParam(tabParam)
  }, [tabParam, onTabParam])
  return null
}

export default function SeriesPageClient({
  slug,
  series,
  dayScriptureByDayNumber = {},
  voices = [],
  artwork = [],
}: {
  slug: string
  series: SeriesInfo
  dayScriptureByDayNumber?: DayScriptureByDayNumber
  voices?: SeriesVoice[]
  artwork?: SeriesArtworkItem[]
}) {
  const { isRead, getSeriesProgress, canRead } = useProgress()

  /**
   * The one day the reader is actually on.
   *
   * Every unread day said READ NOW, so day 1 and day 7 of an untouched series
   * were typographically identical and the card wall answered "what is in this
   * series" but never "where am I". Alan rings the current step and leaves the
   * rest quiet; that is the whole difference between a contents page and a
   * plan. Resolved through the same primitive the Library and /today use, so
   * the three surfaces cannot disagree about where the reader stands.
   */
  const currentDaySlug = useMemo(() => {
    const done = new Set(
      series.days.filter((d) => isRead(d.slug)).map((d) => d.slug),
    )
    return nextUnreadDay(slug, done)?.slug ?? null
  }, [slug, series, isRead])
  // Only days with a delivered track; a queue that hits a silent item reads as
  // a broken player rather than a partial catalogue.
  const seriesQueue = useMemo(() => buildSeriesQueue(slug), [slug])
  const seriesProgress = getSeriesProgress(slug)
  const dayCount = series.days.length
  // Prefer the new generated hero from series.heroImage (populated by Stage 2
  // of the 2026-05-07 image migration). Fall back to the legacy artist-print
  // entry from SERIES_HERO if no heroImage is set on the series.
  const generatedHero = series.heroImage
    ? {
        src: series.heroImage,
        rawSrc: series.heroImage,
        title: series.title,
        artist: 'Generated',
      }
    : null
  const manifestHero = SERIES_HERO[slug]
  const hero = generatedHero ?? manifestHero
  // F-084 (SA-033): the legacy Wake-Up silo is retired — canonical only.
  const brandWord = 'EUANGELION'
  const headerTone = 'default'
  const parentHref = '/series'
  const dayHrefPrefix = '/devotional'
  const parentLabel = 'SERIES'
  const browseLabel = 'ALL SERIES'

  // R32: substack series get a CTA back to the original (in ABOUT).
  const firstDay = series.days[0]
  const substackSource = firstDay ? SUBSTACK_SOURCES[firstDay.slug] : null

  // Adaptive tab roster — VOICES/ARTWORK only exist with real content.
  const availableTabs = useMemo<SeriesTabKey[]>(() => {
    const tabs: SeriesTabKey[] = ['days', 'about']
    if (voices.length > 0) tabs.push('voices')
    if (artwork.length > 0) tabs.push('artwork')
    return tabs
  }, [voices.length, artwork.length])

  const [activeTab, setActiveTab] = useState<SeriesTabKey>('days')
  // ARTWORK panel content mounts on first activation only, so its
  // images never load behind an unopened tab.
  const [visitedTabs, setVisitedTabs] = useState<Set<SeriesTabKey>>(
    () => new Set(['days']),
  )
  const tabRefs = useRef<Partial<Record<SeriesTabKey, HTMLButtonElement>>>({})

  const selectTab = useCallback(
    (key: SeriesTabKey, options?: { focus?: boolean }) => {
      setActiveTab(key)
      setVisitedTabs((prev) => {
        if (prev.has(key)) return prev
        const next = new Set(prev)
        next.add(key)
        return next
      })
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        if (key === 'days') url.searchParams.delete('tab')
        else url.searchParams.set('tab', key)
        window.history.replaceState(window.history.state, '', url)
      }
      if (options?.focus) tabRefs.current[key]?.focus()
    },
    [],
  )

  // Deep link: adopt a valid ?tab= value; unknown or unavailable tabs
  // (e.g. ?tab=voices on a series with no voices) stay on DAYS.
  const handleTabParam = useCallback(
    (value: string | null) => {
      if (!value) return
      const key = value.toLowerCase() as SeriesTabKey
      if (!availableTabs.includes(key)) return
      setActiveTab(key)
      setVisitedTabs((prev) => {
        if (prev.has(key)) return prev
        const next = new Set(prev)
        next.add(key)
        return next
      })
    },
    [availableTabs],
  )

  const onTabKeyDown = useCallback(
    (event: React.KeyboardEvent, key: SeriesTabKey) => {
      const index = availableTabs.indexOf(key)
      let nextIndex: number | null = null
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (index + 1) % availableTabs.length
          break
        case 'ArrowLeft':
          nextIndex = (index - 1 + availableTabs.length) % availableTabs.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = availableTabs.length - 1
          break
        default:
          return
      }
      event.preventDefault()
      selectTab(availableTabs[nextIndex], { focus: true })
    },
    [availableTabs, selectTab],
  )

  const tabCounts: Partial<Record<SeriesTabKey, number>> = {
    days: dayCount,
    voices: voices.length,
    artwork: artwork.length,
  }

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader brandWord={brandWord} tone={headerTone} />
        <Breadcrumbs
          className="mock-breadcrumb-row"
          items={[
            { label: 'HOME', href: '/' },
            { label: parentLabel, href: parentHref },
            { label: series.title.toUpperCase() },
          ]}
        />

        {/* Audit H7: surface the resume cue for returning users. */}
        <div className="mock-breadcrumb-row">
          <ResumeSeriesPill seriesSlug={slug} />
        </div>

        {/* R27: start the series from the series page itself. Routes
            through the same active-series API as DevotionalActions;
            reaches the sign-in modal on auth gate. */}
        <div className="mock-breadcrumb-row">
          <SeriesActions
            seriesSlug={slug}
            seriesTitle={series.title}
            redirectPath={`/series/${slug}`}
          />
        </div>

        {/* Scripture-lead header — the page's identity, above the tabs. */}
        <section className="mock-series-hero-grid">
          <article className="mock-panel mock-series-copy">
            <p className="text-label mock-kicker">SERIES</p>
            <p className="mock-series-scripture-lead">
              {typographer(series.framework)}
            </p>
            <h1 className="mock-title">{typographer(series.question)}</h1>
            <div className="mock-rule" />
          </article>

          <aside className="mock-panel mock-series-meta">
            {hero && (
              <div className="mock-series-meta-hero">
                <Image
                  src={hero.rawSrc}
                  alt={`${hero.title} by ${hero.artist}`}
                  width={600}
                  height={450}
                  className="series-card-thumbnail-img"
                  loading="eager"
                  sizes="(max-width: 767px) 100vw, 38vw"
                />
              </div>
            )}
            <p className="text-label mock-kicker">
              {series.title.toUpperCase()}
            </p>

            <div className="mock-series-progress-head">
              <p className="text-label">{dayCount} DAY JOURNEY</p>
              <p className="text-label">
                {seriesProgress.completed}/{seriesProgress.total} COMPLETE
              </p>
            </div>
            <div className="mock-series-progress" aria-hidden="true">
              <div
                className="mock-series-progress-fill"
                style={{ width: `${seriesProgress.percentage}%` }}
              />
            </div>

            <div className="mock-series-meta-actions">
              <Link href={parentHref} className="mock-btn text-label">
                {browseLabel}
              </Link>
              <ShareButton
                title={series.title}
                text={`${series.title} — ${series.question}`}
                className="mock-series-share"
              />
            </div>
          </aside>
        </section>

        {/* ?tab= deep-link reader — Suspense-scoped so the route stays
            static; the page prerenders with DAYS active either way. */}
        <Suspense fallback={null}>
          <SeriesTabParamSync onTabParam={handleTabParam} />
        </Suspense>

        <div
          className="series-detail-tablist"
          role="tablist"
          aria-label={`${series.title} sections`}
          aria-orientation="horizontal"
        >
          {availableTabs.map((key) => (
            <button
              key={key}
              type="button"
              ref={(node) => {
                if (node) tabRefs.current[key] = node
              }}
              role="tab"
              id={`series-tab-${key}`}
              aria-selected={activeTab === key}
              aria-controls={`series-tabpanel-${key}`}
              tabIndex={activeTab === key ? 0 : -1}
              className="text-label series-detail-tab"
              onClick={() => selectTab(key)}
              onKeyDown={(event) => onTabKeyDown(event, key)}
            >
              {TAB_LABELS[key]}
              {tabCounts[key] !== undefined && (
                <span
                  className="oldstyle-nums series-detail-tab-count"
                  aria-hidden="true"
                >
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── DAYS (default) — the existing day list, untouched ───── */}
        <div
          role="tabpanel"
          id="series-tabpanel-days"
          aria-labelledby="series-tab-days"
          hidden={activeTab !== 'days'}
        >
          <section className="mock-section-center">
            <p className="text-label mock-kicker">DAILY READINGS</p>
            <h2 className="mock-title-center">{dayCount} Day Path</h2>
            <p className="mock-subcopy-center">
              Read in order. Return daily. Keep your rhythm.
            </p>
          </section>

          <section className="mock-series-days-grid">
            {series.days.map((day) => {
              const readingCheck = canRead(day.slug)
              const isLocked = !readingCheck.canRead
              const dayIsRead = isRead(day.slug)
              const dayScripture = dayScriptureByDayNumber[day.day] ?? {
                reference: 'Scripture',
                snippet: '',
              }
              const lockMessage =
                (readingCheck as { message?: string }).message ||
                'Unlocks in sequence as you continue.'

              const card = (
                <article
                  className={`mock-series-day-card ${isLocked ? 'is-locked' : ''}`}
                >
                  <p className="text-label mock-series-day-number">
                    DAY {day.day}
                    {/* Backlog #26 — "do I have time for this right now" is the
                        question at 6am, and the card answered only in days.
                        Rendered only when the corpus actually has a word count
                        for this reading; a missing estimate beats a made-up
                        one. */}
                    {readingTimeLabel(day.slug) && (
                      <span className="mock-series-day-time">
                        {' · '}
                        {readingTimeLabel(day.slug)}
                      </span>
                    )}
                  </p>
                  <p className="mock-series-day-scripture-reference">
                    {typographer(dayScripture.reference || 'Scripture')}
                  </p>
                  {dayScripture.snippet && (
                    <p className="mock-series-day-scripture-snippet">
                      {typographer(dayScripture.snippet)}
                    </p>
                  )}
                  <h3>{day.title}</h3>
                  <p className="mock-series-day-status">
                    {isLocked
                      ? 'LOCKED'
                      : dayIsRead
                        ? '\u2713 READ'
                        : day.slug === currentDaySlug
                          ? 'START HERE'
                          : 'READ'}
                  </p>
                  {isLocked && (
                    <p className="mock-series-day-lock">
                      {typographer(lockMessage)}
                    </p>
                  )}
                </article>
              )

              if (isLocked) {
                return <div key={day.slug}>{card}</div>
              }

              // SA-107: the add control is a SIBLING of the link, never inside
              // it — a button nested in an anchor is invalid markup and cannot
              // be reached by keyboard. Adding is quiet: it does not navigate
              // and does not interrupt whatever is already playing.
              return (
                <div key={day.slug} className="mock-series-day-cell">
                  <Link
                    href={`${dayHrefPrefix}/${day.slug}`}
                    className="mock-series-day-link"
                  >
                    {card}
                  </Link>
                  <AddToQueue
                    item={seriesQueue.find((q) => q.slug === day.slug) ?? null}
                    className="mock-series-day-add"
                  />
                </div>
              )
            })}
          </section>
        </div>

        {/* ─── ABOUT — the series' descriptive copy ─────────────────── */}
        <div
          role="tabpanel"
          id="series-tabpanel-about"
          aria-labelledby="series-tab-about"
          hidden={activeTab !== 'about'}
        >
          <section className="series-tab-section series-tab-about">
            <p className="text-label mock-kicker">ABOUT THIS SERIES</p>
            <p className="mock-body">{typographer(series.introduction)}</p>
            <p className="mock-subcopy">{typographer(series.context)}</p>

            <div className="series-tab-anchor">
              <p className="text-label">SCRIPTURE ANCHOR</p>
              <p className="series-tab-anchor-text">
                {typographer(series.framework)}
              </p>
            </div>

            {substackSource && (
              <p className="series-tab-source">
                <a
                  href={substackSource.substackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-label vw-small link-highlight"
                >
                  READ THE ORIGINAL ON SUBSTACK ↗
                </a>
              </p>
            )}
          </section>
        </div>

        {/* ─── VOICES — figures the series draws on (profile modules) ─ */}
        {voices.length > 0 && (
          <div
            role="tabpanel"
            id="series-tabpanel-voices"
            aria-labelledby="series-tab-voices"
            hidden={activeTab !== 'voices'}
          >
            <section className="series-tab-section">
              <p className="text-label mock-kicker">VOICES IN THIS SERIES</p>
              <div className="series-voices-grid">
                {voices.map((voice) => (
                  <article key={voice.name} className="series-voice-card">
                    <h3 className="series-voice-name">
                      {typographer(voice.name)}
                    </h3>
                    {voice.title && (
                      <p className="text-label series-voice-role">
                        {voice.title.toUpperCase()}
                      </p>
                    )}
                    {voice.keyQuote && (
                      <blockquote className="series-voice-quote">
                        {typographer(`“${voice.keyQuote}”`)}
                      </blockquote>
                    )}
                    {voice.description && (
                      <p className="series-voice-description">
                        {typographer(voice.description)}
                      </p>
                    )}
                    <p className="text-label series-voice-days">
                      {voice.days.map((d) => `DAY ${d}`).join(' · ')}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ─── ARTWORK — the series' per-day art assignments ────────── */}
        {artwork.length > 0 && (
          <div
            role="tabpanel"
            id="series-tabpanel-artwork"
            aria-labelledby="series-tab-artwork"
            hidden={activeTab !== 'artwork'}
          >
            <section className="series-tab-section">
              <p className="text-label mock-kicker">SERIES ARTWORK</p>
              {/* Images mount on first tab activation so an unopened
                  ARTWORK tab costs zero image bytes. */}
              {visitedTabs.has('artwork') && (
                <div className="series-artwork-grid">
                  {artwork.map((item) => (
                    <figure key={item.slug} className="series-artwork-item">
                      <div className="series-artwork-frame">
                        <Image
                          src={item.src}
                          alt={item.title}
                          fill
                          sizes="(max-width: 767px) 50vw, 33vw"
                          loading="lazy"
                        />
                      </div>
                      <figcaption className="text-label series-artwork-caption">
                        {item.days.map((d) => `DAY ${d}`).join(' · ')}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <SiteBottom />
      </main>
    </div>
  )
}
