'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ModuleRenderer from '@/components/ModuleRenderer'
import { ReaderProvider } from '@/components/reader/ReaderContext'
import Toast from '@/components/Toast'
import { useDevotionalLibraryStore } from '@/stores/devotionalLibraryStore'
import { SERIES_DATA } from '@/data/series'
import { isSeriesSaved, savedSlugsForSeries } from '@/lib/library/series-save'
import { getSeriesHero } from '@/lib/series-hero'
import { SITE_DEVOTIONAL_ART } from '@/data/site-devotional-art'
import { DEVOTIONAL_ARTWORKS } from '@/data/artwork-manifest'
import DevotionalHeadline from '@/components/devotional/DevotionalHeadline'
import DevotionalRhythm, {
  type RhythmImage,
} from '@/components/devotional/DevotionalRhythm'
import AuthorColophon from '@/components/devotional/AuthorColophon'
import AudioPlayer from '@/components/AudioPlayer'
import { buildModuleSegments, buildPanelSegments } from '@/lib/audio/segments'
import { loadSelectedAuditReason } from '@/components/soul-audit/helpers'
import type { Devotional, Module, Panel } from '@/types'

interface CuratedActiveViewProps {
  seriesSlug: string
  currentDay: number
  source: string
  startedAt: string
}

/**
 * Daily Bread surface for a manually-started (or archive-restarted)
 * curated series. Renders today's reading inline using the same
 * modules / panels pipeline as the dedicated reader, plus prev/next
 * navigation and pause-this-devotional controls.
 *
 * The Soul Audit pipeline isn't involved here — we read the day's
 * JSON straight from /public/devotionals/<slug>.json.
 */
export default function CuratedActiveView({
  seriesSlug,
  currentDay,
  source,
  startedAt,
}: CuratedActiveViewProps) {
  const router = useRouter()
  const series = SERIES_DATA[seriesSlug]
  const clearActive = useDevotionalLibraryStore((s) => s.clearActive)
  const save = useDevotionalLibraryStore((s) => s.save)
  const unsave = useDevotionalLibraryStore((s) => s.unsave)
  const saved = useDevotionalLibraryStore((s) => s.saved)
  const refresh = useDevotionalLibraryStore((s) => s.refresh)
  const hydrate = useDevotionalLibraryStore((s) => s.hydrate)

  const [devotional, setDevotional] = useState<Devotional | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(currentDay)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // D-22 (F-074): why-row for a soul_audit-sourced active series ONLY — a
  // manual start or archive restart was the reader's own choice, so there is
  // no recommendation to explain. Read in an effect (sessionStorage is
  // client-only); null renders nothing rather than a fabricated reason.
  const [whyThis, setWhyThis] = useState<string | null>(null)
  useEffect(() => {
    if (source !== 'soul_audit') {
      setWhyThis(null)
      return
    }
    setWhyThis(loadSelectedAuditReason({ seriesSlug }))
  }, [source, seriesSlug])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    setActiveDay(currentDay)
  }, [currentDay, seriesSlug])

  // Daily Bread style parity 2026-05-14: surface the same folio +
  // headline + rhythm reader the dedicated /devotional route uses,
  // so today's reading reads as a publication, not a card. Mount-only
  // flag for the CSS layer that enables the 2-col rhythm grid.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('rhythm-enabled')
    return () => {
      document.body.classList.remove('rhythm-enabled')
    }
  }, [])

  const totalDays = series?.days.length ?? 0
  const safeDay = useMemo(
    () => Math.max(1, Math.min(activeDay, totalDays || activeDay)),
    [activeDay, totalDays],
  )
  const day = series?.days[safeDay - 1] ?? series?.days[0] ?? null
  const prevDay = safeDay > 1 ? series?.days[safeDay - 2] : null
  const nextDay =
    safeDay < (series?.days.length ?? 0) ? series?.days[safeDay] : null

  // Headline / rhythm imagery — same resolution order as the
  // dedicated reader. Curated artwork for this day → series hero
  // fallback. Hoisted above the early-return guard so React's
  // rules-of-hooks aren't violated. Memos read from `day?.slug`
  // safely; when day is null they yield empty arrays / nulls and
  // the JSX below renders the loading/error path.
  const daySlugForImages = day?.slug ?? ''
  const computedDayArtworks = useMemo(() => {
    const explicit =
      SITE_DEVOTIONAL_ART[daySlugForImages] ??
      DEVOTIONAL_ARTWORKS[daySlugForImages] ??
      []
    if (explicit.length > 0) return explicit
    const seriesHero = getSeriesHero(seriesSlug)
    return seriesHero ? [seriesHero] : []
  }, [daySlugForImages, seriesSlug])
  const computedRhythmImages = useMemo<RhythmImage[]>(
    () =>
      computedDayArtworks.map((a) => ({
        src: a.src,
        alt: a.title || 'Devotional artwork',
        caption: a.title || undefined,
      })),
    [computedDayArtworks],
  )
  const computedModules = (
    devotional as (Devotional & { modules?: Module[] }) | null
  )?.modules

  // Founder direction 2026-08-14: the Audio Edition belongs on every
  // devotional in every state. Daily Bread was the one reading surface that
  // never had it, which is why audio looked like a feature of the "other"
  // reader. Same segment builders the dedicated route uses.
  const audioSegments = useMemo(() => {
    if (!devotional) return []
    if (computedModules?.length) {
      return buildModuleSegments(devotional.title, computedModules)
    }
    if (devotional.panels?.length) {
      return buildPanelSegments(devotional.title, devotional.panels)
    }
    return []
  }, [devotional, computedModules])

  useEffect(() => {
    if (!day) return
    let cancelled = false
    setLoading(true)
    fetch(`/devotionals/${day.slug}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json() as Promise<Devotional>
      })
      .then((data) => {
        if (cancelled) return
        setDevotional(data)
      })
      .catch(() => {
        if (cancelled) return
        setDevotional(null)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [day])

  // SA-039: saving is series-level here too; legacy per-day rows still count.
  const savedSlugs = useMemo(() => saved.map((s) => s.devotionalSlug), [saved])
  const isSaved = isSeriesSaved(savedSlugs, seriesSlug)

  const handleSave = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      if (isSaved) {
        const targets = savedSlugsForSeries(savedSlugs, seriesSlug)
        const results = await Promise.all(targets.map((slug) => unsave(slug)))
        if (results.every((r) => r.ok)) setToast('Removed from your library.')
        else setToast('Couldn’t update your library — please try again.')
      } else {
        const result = await save(seriesSlug)
        if (result.ok) setToast('Saved this series to your library.')
        else setToast('Couldn’t save — please try again.')
      }
    } finally {
      setBusy(false)
    }
  }, [isSaved, save, unsave, busy, seriesSlug, savedSlugs])

  const handlePause = useCallback(async () => {
    setBusy(true)
    try {
      const result = await clearActive()
      if (result.ok) {
        setToast('Paused. You can resume it from your library.')
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }, [clearActive, router])

  const handleAdvance = useCallback(async () => {
    if (!nextDay) return
    setActiveDay(safeDay + 1)
    await refresh()
  }, [nextDay, safeDay, refresh])

  if (!series || !day) {
    return (
      <section
        className="devotional-shell-panel border px-6 py-8"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-label vw-small text-gold mb-2">UNKNOWN SERIES</p>
        <h1 className="vw-heading-md mb-3">
          We couldn&rsquo;t find the series in your active slot.
        </h1>
        <Link
          href="/library"
          className="cta-major text-label vw-small mt-4 inline-block px-5 py-2"
        >
          OPEN LIBRARY
        </Link>
      </section>
    )
  }

  const startedDate = new Date(startedAt).toLocaleDateString()
  const modules = (devotional as (Devotional & { modules?: Module[] }) | null)
    ?.modules
  const panels = devotional?.panels
  const rhythmImages = computedRhythmImages

  return (
    <section className="curated-active-view" aria-label="Today's devotional">
      <header
        className="devotional-shell-panel border px-6 py-5 mb-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-label vw-small text-gold mb-1">
          YOUR ACTIVE DEVOTIONAL
        </p>
        <h1 className="vw-heading-md mb-1">{series.title}</h1>
        <p className="vw-small text-secondary">
          Day {safeDay} of {totalDays} ·{' '}
          {source === 'manual_start' ? 'started' : 'restarted'} {startedDate}
        </p>
        {/* D-22 (Headspace why-row): the audit's real stored reason this
            series was matched — rendered only with real reason data. */}
        {whyThis && (
          <p
            className="vw-small mt-2 text-secondary"
            data-testid="curated-why-this"
          >
            <span className="text-label text-gold">WHY THIS</span>
            <span aria-hidden="true"> · </span>
            {whyThis}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="text-label vw-small link-highlight"
            onClick={() => void handleSave()}
            disabled={busy}
            aria-pressed={isSaved}
          >
            {isSaved ? 'SAVED' : 'SAVE SERIES'}
          </button>
          {/* Founder direction 2026-08-14: "OPEN FULL READER" is gone. You are
              already reading the devotional — offering to open the real one
              was the redundant extra step, and it implied this was a lesser
              copy. There is no second reader to go to. SA-037 / F-088. */}
          <Link
            href={`/series/${seriesSlug}`}
            className="text-label vw-small link-highlight"
          >
            VIEW WHOLE SERIES
          </Link>
          <button
            type="button"
            className="text-label vw-small link-highlight"
            onClick={() => void handlePause()}
            disabled={busy}
          >
            PAUSE THIS DEVOTIONAL
          </button>
        </div>
      </header>

      {series.days.length > 1 && (
        <nav
          className="curated-active-day-strip mb-5"
          aria-label="Day navigation"
        >
          <div className="flex flex-wrap items-center gap-2">
            {series.days.map((d) => (
              <button
                key={d.slug}
                type="button"
                className={`text-label vw-small px-3 py-1 border ${d.day === safeDay ? 'is-active' : ''}`}
                style={{
                  borderColor:
                    d.day === safeDay
                      ? 'var(--color-border-strong, var(--color-border))'
                      : 'var(--color-border)',
                  background:
                    d.day === safeDay
                      ? 'var(--color-active, transparent)'
                      : 'transparent',
                }}
                onClick={() => setActiveDay(d.day)}
                aria-current={d.day === safeDay ? 'true' : undefined}
              >
                DAY {d.day}
              </button>
            ))}
          </div>
        </nav>
      )}

      {loading ? (
        <article
          className="devotional-shell-panel border px-6 py-6 mb-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small text-gold mb-2">DAY {day.day}</p>
          <p className="vw-body text-secondary">
            Loading today&rsquo;s reading…
          </p>
        </article>
      ) : !devotional ? (
        <article
          className="devotional-shell-panel border px-6 py-6 mb-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small text-gold mb-2">DAY {day.day}</p>
          <p className="vw-body text-secondary mb-3">
            We couldn&rsquo;t load this day&rsquo;s reading. It may not have
            been published yet.
          </p>
          <Link
            href={`/devotional/${day.slug}`}
            className="cta-major text-label vw-small inline-block px-5 py-2"
          >
            OPEN THIS READING
          </Link>
        </article>
      ) : (
        <>
          {/* Founder direction 2026-08-14: the church-year card is gone from
              the reading. It lives on the home page now, as one quiet line.
              SA-037 / F-088. */}

          {/* Folio strip — same page furniture the dedicated reader uses. */}
          {/* Founder direction 2026-08-14: the folio strip is gone here too.
              It carried <ChurchYearOverline> and sat above the title; day
              position rides the panel above the reading instead.
              SA-037 / F-088. */}

          {/* F-083 page-cleanup 2026-07-27 (founder): title-only —
              the active-series panel above already names the series and
              the day's own inline artwork carries the visual. */}
          {/* Founder direction 2026-08-15: the Daily Bread reading must look
              like a devotional, not a stripped copy of one. It was passing no
              imageSrc, so the headline fell back to its text-only variant and
              the plate never appeared. Same source the reader uses. */}
          <DevotionalHeadline
            imageSrc={getSeriesHero(seriesSlug)?.src}
            imageAlt={`Illustration accompanying ${devotional.title}`}
            title={devotional.title}
            dek={devotional.teaser ?? undefined}
            scripture={devotional.scriptureReference ?? undefined}
          />

          {audioSegments.length > 0 && day && (
            <AudioPlayer
              title={devotional.title}
              segments={audioSegments}
              artworkSrc="/icons/icon-512.png"
              slug={day.slug}
              className="devotional-shell-panel mb-6"
            />
          )}

          {/* Founder 2026-08-15: "The daily bread reader should look exactly
              the same as the normal reader (ie centered column, no image on
              the right on scroll etc." The dedicated reader passes
              enabled={false}; this passed enabled={rhythmImages.length > 0},
              which is the whole difference — it turned on the alternating
              text-left / sticky-image-right rhythm here and nowhere else.
              Now both readers are one centred column. */}
          <DevotionalRhythm images={rhythmImages} enabled={false}>
            {/* SA-059: the writing surfaces need the day's slug, and this view
                resolves it at render time rather than from a route param. */}
            <ReaderProvider devotionalSlug={daySlugForImages}>
              {modules
                ? modules.map((module, index) => (
                    <article
                      key={index}
                      className="devotional-shell-panel border px-5 py-5"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <ModuleRenderer module={module} moduleIndex={index} />
                    </article>
                  ))
                : panels?.slice(1).map((panel) => (
                    <Fragment key={panel.number}>
                      <article
                        className="devotional-shell-panel border px-5 py-5"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <PanelInline panel={panel} />
                      </article>
                    </Fragment>
                  ))}
            </ReaderProvider>
          </DevotionalRhythm>

          {/* Author colophon — 4-line credit at the close of the reading. */}
          <AuthorColophon
            translation={
              modules?.find((m) => m.type === 'scripture')?.translation ??
              undefined
            }
          />
        </>
      )}

      <nav
        className="curated-active-prevnext grid gap-4 md:grid-cols-2"
        aria-label="Day navigation"
      >
        {prevDay ? (
          <button
            type="button"
            className="devotional-shell-panel block border px-5 py-4 text-left"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={() => setActiveDay(prevDay.day)}
          >
            <p className="text-label vw-small text-gold">&larr; PREVIOUS</p>
            <p className="vw-body text-secondary">{prevDay.title}</p>
          </button>
        ) : (
          <div
            className="devotional-shell-panel border px-5 py-4"
            style={{ borderColor: 'var(--color-border)', opacity: 0.5 }}
          />
        )}

        {nextDay ? (
          <button
            type="button"
            className="devotional-shell-panel block border px-5 py-4 text-right"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={() => void handleAdvance()}
          >
            <p className="text-label vw-small text-gold">NEXT &rarr;</p>
            <p className="vw-body text-secondary">{nextDay.title}</p>
          </button>
        ) : (
          <div
            className="devotional-shell-panel border px-5 py-4"
            style={{ borderColor: 'var(--color-border)', opacity: 0.5 }}
          />
        )}
      </nav>

      <Toast
        message={toast ?? ''}
        visible={Boolean(toast)}
        onClose={() => setToast(null)}
      />
    </section>
  )
}

function PanelInline({ panel }: { panel: Panel }) {
  return (
    <article>
      {panel.heading && (
        <p className="text-label vw-small mb-3 text-gold">{panel.heading}</p>
      )}
      {panel.content.split('\n\n').map((paragraph, i) => {
        const trimmed = paragraph.trim()
        const isScripture = trimmed.startsWith('“') && trimmed.endsWith('”')
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
