'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import ShareButton from '@/components/ShareButton'
import ModuleRenderer from '@/components/ModuleRenderer'
import Toast from '@/components/Toast'
import { useDevotionalLibraryStore } from '@/stores/devotionalLibraryStore'
import { SERIES_DATA } from '@/data/series'
import { typographer } from '@/lib/typographer'
import type { Devotional, Module, Panel } from '@/types'

interface CuratedActiveViewProps {
  seriesSlug: string
  currentDay: number
  source: string
  startedAt: string
}

/**
 * Daily Bread surface for a manually-started (or archive-restarted)
 * curated series. Renders today's reading in the SAME visual style
 * as the dedicated /devotional/[slug] reader (same outer container,
 * width, header chrome, and module-panel styling). The only
 * Daily-Bread-specific chrome is the actions row (Save / Open Full
 * Reader / View Series / Pause) and the horizontal day-strip.
 *
 * The Soul Audit pipeline isn't involved here — we read the day's
 * JSON straight from /public/devotionals/<slug>.json.
 */
export default function CuratedActiveView({
  seriesSlug,
  currentDay,
}: CuratedActiveViewProps) {
  const router = useRouter()
  const series = SERIES_DATA[seriesSlug]
  const clearActive = useDevotionalLibraryStore((s) => s.clearActive)
  const save = useDevotionalLibraryStore((s) => s.save)
  const unsave = useDevotionalLibraryStore((s) => s.unsave)
  const saved = useDevotionalLibraryStore((s) => s.saved)
  const refresh = useDevotionalLibraryStore((s) => s.refresh)
  const hydrate = useDevotionalLibraryStore((s) => s.hydrate)
  const bumpActiveDay = useDevotionalLibraryStore((s) => s.bumpActiveDay)

  const [devotional, setDevotional] = useState<Devotional | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(currentDay)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    setActiveDay(currentDay)
  }, [currentDay, seriesSlug])

  // Persist activeDay back to active_series whenever the reader
  // navigates day-to-day. Without this, server-side current_day
  // stays at the value set when the series was started, so reload
  // jumps back. Fire-and-forget — the store handles optimistic
  // update + rollback.
  useEffect(() => {
    if (activeDay === currentDay) return
    void bumpActiveDay(activeDay)
  }, [activeDay, currentDay, bumpActiveDay])

  // Surface the same rhythm reader CSS the dedicated /devotional
  // route uses, so the reading body reads as a publication, not a
  // card.
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

  const isSaved = day ? saved.some((s) => s.devotionalSlug === day.slug) : false

  const handleSave = useCallback(async () => {
    if (!day || busy) return
    setBusy(true)
    try {
      if (isSaved) {
        const result = await unsave(day.slug)
        if (result.ok) setToast('Removed from your library.')
      } else {
        const result = await save(day.slug)
        if (result.ok) setToast('Saved to your library.')
      }
    } finally {
      setBusy(false)
    }
  }, [day, isSaved, save, unsave, busy])

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
      <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
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
      </section>
    )
  }

  const modules = (devotional as (Devotional & { modules?: Module[] }) | null)
    ?.modules
  const panels = devotional?.panels

  const dayHeadline = devotional?.title ?? day.title
  const dayTeaser = devotional?.teaser
  const dayScriptureRef = devotional?.scriptureReference

  return (
    <section className="devotional-shell-main shell-content-pad mx-auto max-w-6xl">
      <Breadcrumbs
        className="devotional-shell-breadcrumb mb-7"
        items={[
          { label: 'HOME', href: '/' },
          { label: 'DAILY BREAD', href: '/daily-bread' },
          {
            label: (series.title || 'SERIES').toUpperCase(),
            href: `/series/${seriesSlug}`,
          },
          { label: (dayHeadline || 'TODAY').toUpperCase() },
        ]}
      />

      <header
        className="devotional-shell-panel devotional-shell-block mb-8 border px-6 py-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {dayScriptureRef && (
            <p className="text-label vw-small text-gold">{dayScriptureRef}</p>
          )}
          {totalDays > 0 && (
            <p className="text-label vw-small text-muted oldstyle-nums">
              DAY {safeDay} OF {totalDays}
            </p>
          )}
        </div>
        <h1 className="vw-heading-md mb-3">{typographer(dayHeadline)}</h1>
        {dayTeaser && (
          <p className="vw-body text-secondary">{typographer(dayTeaser)}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={`/series/${seriesSlug}`}
            className="text-label vw-small link-highlight"
          >
            BACK TO SERIES
          </Link>
          <ShareButton
            title={dayHeadline}
            text={`${dayHeadline} — Euangelion`}
          />
          <button
            type="button"
            className="text-label vw-small link-highlight"
            onClick={() => void handleSave()}
            disabled={busy}
            aria-pressed={isSaved}
          >
            {isSaved ? 'SAVED' : 'SAVE'}
          </button>
          <Link
            href={`/devotional/${day.slug}`}
            className="text-label vw-small link-highlight"
          >
            OPEN FULL READER
          </Link>
          <button
            type="button"
            className="text-label vw-small link-highlight"
            onClick={() => void handlePause()}
            disabled={busy}
          >
            PAUSE
          </button>
        </div>
      </header>

      {series.days.length > 1 && (
        <nav
          className="curated-active-day-strip mb-8"
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
        <section
          className="devotional-shell-panel border px-6 py-8"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="vw-body text-secondary">
            Loading today&rsquo;s reading…
          </p>
        </section>
      ) : !devotional ? (
        <section
          className="devotional-shell-panel border px-6 py-8"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="vw-body text-secondary mb-3">
            We couldn&rsquo;t load this day&rsquo;s reading. It may not have
            been published yet.
          </p>
          <Link
            href={`/devotional/${day.slug}`}
            className="cta-major text-label vw-small inline-block px-5 py-2"
          >
            TRY THE FULL READER
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {modules
            ? modules.map((module, index) => (
                <article
                  key={index}
                  className="devotional-shell-panel border px-6 py-6"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <ModuleRenderer module={module} />
                </article>
              ))
            : panels?.slice(1).map((panel, index) => (
                <Fragment key={panel.number}>
                  <article
                    className="devotional-shell-panel border px-6 py-6"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {index > 0 && (
                      <div
                        className="mb-6 border-t"
                        style={{ borderColor: 'var(--color-border)' }}
                        aria-hidden="true"
                      />
                    )}
                    <PanelInline panel={panel} />
                  </article>
                </Fragment>
              ))}
        </div>
      )}

      <nav
        className="curated-active-prevnext mt-8 grid gap-4 md:grid-cols-2"
        aria-label="Day navigation"
      >
        {prevDay ? (
          <button
            type="button"
            className="devotional-shell-panel block border px-6 py-5 text-left"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={() => setActiveDay(prevDay.day)}
          >
            <p className="text-label vw-small text-gold">&larr; PREVIOUS</p>
            <p className="vw-body text-secondary">{prevDay.title}</p>
          </button>
        ) : (
          <div
            className="devotional-shell-panel border px-6 py-5"
            style={{ borderColor: 'var(--color-border)', opacity: 0.5 }}
          />
        )}

        {nextDay ? (
          <button
            type="button"
            className="devotional-shell-panel block border px-6 py-5 text-right"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={() => void handleAdvance()}
          >
            <p className="text-label vw-small text-gold">NEXT &rarr;</p>
            <p className="vw-body text-secondary">{nextDay.title}</p>
          </button>
        ) : (
          <div
            className="devotional-shell-panel border px-6 py-5"
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
