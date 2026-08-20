'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import PastoralSwitchModal from '@/components/devotional/PastoralSwitchModal'
import SignInIntentModal from '@/components/devotional/SignInIntentModal'
import StateUnavailable from '@/components/StateUnavailable'
import {
  onAuthRequired,
  useDevotionalLibraryStore,
  type LibraryIntent,
} from '@/stores/devotionalLibraryStore'
import { SERIES_DATA } from '@/data/series'
import { isSeriesSlug, seriesSlugOf } from '@/lib/library/series-save'
import { resolveDevotionalHref } from '@/components/DevotionalLibraryRail'
import {
  activeDayHref,
  activeDayLabel,
  daySlugFor,
  nextUnreadDay,
} from '@/lib/reading/active-day'
import { useProgress } from '@/hooks/useProgress'

/**
 * How far a reader is through a series, and what they would open next.
 *
 * Every series card used to read the same whether you had finished six days or
 * never opened it — a saved series said "Whole series · 7 days" and stopped.
 * That is the difference between a shelf and a library: a shelf lists what you
 * own, a library knows where you are in it.
 *
 * Read state comes from the local completion log, so this is a pure derivation
 * with no new plumbing. It re-derives on every render, which is what makes it
 * correct the moment a day is marked read — `useProgress` re-renders the tab on
 * `progressUpdated`.
 */
function seriesStanding(
  seriesSlug: string | null | undefined,
  isRead: (slug: string) => boolean,
) {
  const series = seriesSlug ? SERIES_DATA[seriesSlug] : null
  if (!series || series.days.length === 0) return null
  const done = new Set(
    series.days.filter((d) => isRead(d.slug)).map((d) => d.slug),
  )
  return {
    completed: done.size,
    total: series.days.length,
    percentage: Math.round((done.size / series.days.length) * 100),
    /** The first unread day — what CONTINUE should open. Null when finished. */
    next: nextUnreadDay(seriesSlug!, done),
  }
}

/**
 * "3 of 7 read" over a thin rule.
 *
 * Rendered with inline tokens rather than a new class because globals.css is
 * being actively worked in another session; the tokens are the same ones the
 * surrounding cards already use.
 */
function SeriesProgress({
  completed,
  total,
  percentage,
}: {
  completed: number
  total: number
  percentage: number
}) {
  return (
    <div className="mt-2" aria-label={`${completed} of ${total} days read`}>
      <p className="vw-small text-secondary mb-1">
        {completed} of {total} read
      </p>
      <div
        style={{
          height: '2px',
          background: 'var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: 'var(--color-gold, currentColor)',
            transition: 'width 200ms ease-out',
          }}
        />
      </div>
    </div>
  )
}

/** The title of the day the reader is on, for the ACTIVE card's second line. */
function activeDayTitle(
  seriesSlug: string,
  currentDay: number | null | undefined,
): string | null {
  if (typeof currentDay !== 'number') return null
  const slug = daySlugFor(seriesSlug, Math.floor(currentDay))
  if (!slug) return null
  return (
    SERIES_DATA[seriesSlug]?.days.find((d) => d.slug === slug)?.title ?? null
  )
}

/**
 * SA-039: a saved row may now name a SERIES rather than one of its days, so
 * this has to resolve both. Without the first branch a saved series resolved
 * to null here, which hid ACTIVATE SERIES, labelled the card "Devotional" and
 * linked it at /devotional/<series-slug> — a 404.
 */
function seriesSlugFromDevotionalSlug(slug: string): string | null {
  if (isSeriesSlug(slug)) return slug
  return seriesSlugOf(slug)
}

export default function LibraryView() {
  const router = useRouter()
  const { isRead } = useProgress()
  const hydrate = useDevotionalLibraryStore((s) => s.hydrate)
  const refresh = useDevotionalLibraryStore((s) => s.refresh)
  const hydrated = useDevotionalLibraryStore((s) => s.hydrated)
  const active = useDevotionalLibraryStore((s) => s.active)
  const saved = useDevotionalLibraryStore((s) => s.saved)
  const archived = useDevotionalLibraryStore((s) => s.archived)
  const lastError = useDevotionalLibraryStore((s) => s.lastError)
  const start = useDevotionalLibraryStore((s) => s.start)
  const unsave = useDevotionalLibraryStore((s) => s.unsave)
  const restartFromArchive = useDevotionalLibraryStore(
    (s) => s.restartFromArchive,
  )

  const [pendingSeriesSlug, setPendingSeriesSlug] = useState<string | null>(
    null,
  )
  const [switchModalOpen, setSwitchModalOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [pendingIntent, setPendingIntent] = useState<LibraryIntent | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    return onAuthRequired((intent) => {
      setPendingIntent(intent)
      setSignInOpen(true)
    })
  }, [])

  /**
   * Saved series the reader has started come first.
   *
   * Moonly leads its library with In Progress and files everything else below,
   * because a shelf sorted by when you saved things answers a question nobody
   * asks. Within each group the incoming order is preserved — this reorders the
   * list once, by whether it is live, and never shuffles beneath the reader.
   */
  const savedOrdered = useMemo(() => {
    const started = (slug: string) => {
      const st = seriesStanding(seriesSlugFromDevotionalSlug(slug), isRead)
      return st && st.completed > 0 ? 0 : 1
    }
    return [...saved].sort(
      (a, b) => started(a.devotionalSlug) - started(b.devotionalSlug),
    )
  }, [saved, isRead])

  const paused = useMemo(
    () => archived.filter((row) => row.state === 'paused'),
    [archived],
  )
  const completed = useMemo(
    () => archived.filter((row) => row.state === 'completed'),
    [archived],
  )

  const performStart = useCallback(
    async (
      seriesSlug: string,
      mode: 'replace_now' | 'queue_monday',
      confirm: boolean,
    ) => {
      setBusy(true)
      try {
        const result = await start(seriesSlug, mode, { confirm })
        if (result.ok) {
          setSwitchModalOpen(false)
          setPendingSeriesSlug(null)
          if (mode === 'queue_monday') {
            setToast(
              `Queued — ${SERIES_DATA[seriesSlug]?.title ?? seriesSlug} begins Monday.`,
            )
          } else {
            setToast(
              `Switched to ${SERIES_DATA[seriesSlug]?.title ?? seriesSlug}.`,
            )
            router.push('/today')
          }
          await refresh()
          return
        }
        if ('needsConfirm' in result && result.needsConfirm) {
          setPendingSeriesSlug(seriesSlug)
          setSwitchModalOpen(true)
        } else if ('needsAuth' in result && result.needsAuth) {
          setToast('Sign in to start a series and keep your progress.')
        } else {
          // F-083: a failed start must never be a silent no-op — the
          // reader walks away believing they activated something.
          setToast('Couldn’t start this series — please try again.')
        }
      } finally {
        setBusy(false)
      }
    },
    [start, refresh, router],
  )

  const activateFromSave = useCallback(
    async (devotionalSlug: string) => {
      const seriesSlug = seriesSlugFromDevotionalSlug(devotionalSlug)
      if (!seriesSlug) {
        setToast('Could not resolve this devotional to a series.')
        return
      }
      await performStart(seriesSlug, 'replace_now', false)
    },
    [performStart],
  )

  const handleRestart = useCallback(
    async (seriesSlug: string, from: 'day_1' | 'resume') => {
      setBusy(true)
      try {
        const result = await restartFromArchive(seriesSlug, from)
        if (result.ok) {
          setToast(`Restarted ${SERIES_DATA[seriesSlug]?.title ?? seriesSlug}.`)
          router.push('/today')
        }
      } finally {
        setBusy(false)
      }
    },
    [restartFromArchive, router],
  )

  const handleUnsave = useCallback(
    async (devotionalSlug: string) => {
      setBusy(true)
      try {
        const result = await unsave(devotionalSlug)
        if (result.ok) setToast('Removed from your library.')
      } finally {
        setBusy(false)
      }
    },
    [unsave],
  )

  if (!hydrated) {
    return (
      <p className="vw-body text-secondary" role="status" aria-live="polite">
        Loading your library…
      </p>
    )
  }

  return (
    <>
      {/* A failed read is not an empty library. The store keeps the last
          confirmed state on a 5xx/network failure and records lastError; without
          this the reader sees blank shelves and concludes their work was lost. */}
      {lastError && (
        <StateUnavailable
          subject="your library"
          onRetry={() => {
            void refresh()
          }}
          retrying={busy}
          className="mb-8"
        />
      )}

      <section className="library-section" aria-labelledby="library-active">
        <h2 id="library-active" className="text-label vw-small text-gold mb-2">
          ACTIVE
        </h2>
        {active ? (
          <div className="library-card">
            {/* Speak badges the course you are actually on. With four sections
                of series cards, the one that is live should not have to be
                inferred from which heading it sits under. */}
            <p
              className="text-label vw-small mb-1"
              style={{ color: 'var(--color-gold, currentColor)' }}
            >
              CURRENT
            </p>
            <p className="vw-body">
              <strong>{active.seriesTitle ?? active.seriesSlug}</strong>
              {activeDayLabel(active.seriesSlug, active.currentDay)
                ? ` — ${activeDayLabel(active.seriesSlug, active.currentDay)}`
                : ''}
            </p>
            <p className="vw-small text-secondary">
              {activeDayTitle(active.seriesSlug, active.currentDay) ??
                `Source: ${active.source.replace(/_/g, ' ')}`}
            </p>
            {(() => {
              const st = seriesStanding(active.seriesSlug, isRead)
              return st ? <SeriesProgress {...st} /> : null
            })()}
            <div className="library-card-actions">
              {/* Founder 2026-08-14: the card said "Day 3" and then sent the
                  reader to a bare /daily-bread. It now opens the day it names.
                  activeDayHref falls back to the series page, never to day 1. */}
              {/* One rule for the whole view.
                  The SAVED cards resolve their next day from actual
                  completions; this card used the server's
                  `active_series.current_day`. Those agree until they do not —
                  a completion whose server write failed, or days finished out
                  of order — and then two cards in ONE view point at different
                  days for the SAME series, which is worse than either answer
                  alone. Completions are the reader's own record and the thing
                  they can see, so they win; the server day remains the
                  fallback for a series with nothing marked yet. */}
              <Link
                href={activeDayHref(
                  active.seriesSlug,
                  seriesStanding(active.seriesSlug, isRead)?.next?.day ??
                    active.currentDay,
                )}
                className="cta-major text-label vw-small px-5 py-2"
              >
                CONTINUE
              </Link>
              <Link
                href="/daily-bread"
                className="text-label vw-small link-highlight"
              >
                DAILY BREAD
              </Link>
            </div>
          </div>
        ) : (
          <div className="library-empty vw-small">
            {/* D-18: the ACTIVE section carries this tab's one CTA — the
                other three sections stay one quiet sentence each so an
                all-empty tab never stacks four buttons. */}
            <p className="mb-3">
              Nothing is active yet &mdash; a series becomes your daily reading
              when you start it.
            </p>
            <Link
              href="/series"
              className="cta-major text-label vw-small inline-block px-5 py-2"
            >
              BROWSE SERIES
            </Link>
          </div>
        )}
      </section>

      <section className="library-section" aria-labelledby="library-saved">
        <h2 id="library-saved" className="text-label vw-small text-gold mb-2">
          SAVED ({saved.length})
        </h2>
        {saved.length === 0 ? (
          <p className="library-empty vw-small">
            Nothing saved yet &mdash; keep a series here with{' '}
            <em>Save series</em> as you read.
          </p>
        ) : (
          <div className="library-grid">
            {savedOrdered.map((item) => {
              const seriesSlug = seriesSlugFromDevotionalSlug(
                item.devotionalSlug,
              )
              const series = seriesSlug ? SERIES_DATA[seriesSlug] : null
              const savedWholeSeries = isSeriesSlug(item.devotionalSlug)
              // Founder, 2026-08-16: saved items led to "page not found". The
              // raw `/devotional/<slug>` was a GUESS — saved rows can name a
              // reading that has since been unpublished (Wake-Up was retired in
              // SA-033/F-084, and the catalog has been rewritten since), and a
              // recorded slug is not a promise that a page still exists.
              // resolveDevotionalHref checks SERIES_DATA and returns null when
              // there is genuinely nothing to open.
              const href = resolveDevotionalHref(item.devotionalSlug)
              const label = savedWholeSeries
                ? (series?.title ?? item.devotionalSlug.replace(/-/g, ' '))
                : (item.note ?? item.devotionalSlug.replace(/-/g, ' '))
              return (
                <div className="library-card" key={item.devotionalSlug}>
                  <p className="vw-small text-secondary">
                    {savedWholeSeries
                      ? `Whole series · ${series?.days.length ?? 0} days`
                      : (series?.title ?? 'Devotional')}
                  </p>
                  <p className="vw-body">
                    {href ? (
                      <Link href={href} className="link-highlight">
                        {label}
                      </Link>
                    ) : (
                      // Their save is still theirs; the reading is what went
                      // away. Say that, rather than offering a link that 404s.
                      <span title="This reading is no longer published">
                        {label} &middot; <em>no longer published</em>
                      </span>
                    )}
                  </p>
                  {savedWholeSeries &&
                    (() => {
                      const st = seriesStanding(seriesSlug, isRead)
                      return st && st.completed > 0 ? (
                        <SeriesProgress {...st} />
                      ) : null
                    })()}
                  <div className="library-card-actions">
                    {/* Coursera names the next item on the card and links
                        straight to it, so resuming never means landing at the
                        top of a course and hunting. A saved series the reader
                        has started should do the same — ACTIVATE is the right
                        verb for one never opened, and the wrong one for a
                        series they are six days into. */}
                    {savedWholeSeries &&
                      (() => {
                        const st = seriesStanding(seriesSlug, isRead)
                        if (!st || st.completed === 0 || !st.next) return null
                        return (
                          <Link
                            href={activeDayHref(seriesSlug!, st.next.day)}
                            className="cta-major text-label vw-small px-4 py-2"
                          >
                            CONTINUE &middot; DAY {st.next.day}
                          </Link>
                        )
                      })()}
                    {seriesSlug && (
                      <button
                        type="button"
                        className="cta-major text-label vw-small px-4 py-2"
                        disabled={busy}
                        onClick={() =>
                          void activateFromSave(item.devotionalSlug)
                        }
                      >
                        ACTIVATE SERIES
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-label vw-small link-highlight"
                      disabled={busy}
                      onClick={() => void handleUnsave(item.devotionalSlug)}
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="library-section" aria-labelledby="library-paused">
        <h2 id="library-paused" className="text-label vw-small text-gold mb-2">
          PAUSED ({paused.length})
        </h2>
        {paused.length === 0 ? (
          <p className="library-empty vw-small">
            When you switch devotionals, the one you leave waits for you here.
          </p>
        ) : (
          <div className="library-grid">
            {paused.map((row) => (
              <div className="library-card" key={row.seriesSlug}>
                <p className="vw-body">
                  <strong>{row.seriesTitle ?? row.seriesSlug}</strong>
                </p>
                <p className="vw-small text-secondary">
                  You reached Day {row.furthestDayReached}
                  {row.totalDays ? ` of ${row.totalDays}` : ''}.
                </p>
                {(() => {
                  const st = seriesStanding(row.seriesSlug, isRead)
                  return st ? <SeriesProgress {...st} /> : null
                })()}
                <div className="library-card-actions">
                  <button
                    type="button"
                    className="cta-major text-label vw-small px-4 py-2"
                    disabled={busy}
                    onClick={() => void handleRestart(row.seriesSlug, 'resume')}
                  >
                    RESUME AT DAY {row.furthestDayReached}
                  </button>
                  <button
                    type="button"
                    className="text-label vw-small link-highlight"
                    disabled={busy}
                    onClick={() => void handleRestart(row.seriesSlug, 'day_1')}
                  >
                    RESTART FROM DAY 1
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="library-section" aria-labelledby="library-completed">
        <h2
          id="library-completed"
          className="text-label vw-small text-gold mb-2"
        >
          COMPLETED ({completed.length})
        </h2>
        {completed.length === 0 ? (
          <p className="library-empty vw-small">
            Finished series will rest here.
          </p>
        ) : (
          <div className="library-grid">
            {completed.map((row) => (
              <div className="library-card" key={row.seriesSlug}>
                <p className="vw-body">
                  <strong>{row.seriesTitle ?? row.seriesSlug}</strong>
                </p>
                <p className="vw-small text-secondary">
                  Completed {new Date(row.archivedAt).toLocaleDateString()}
                </p>
                <div className="library-card-actions">
                  <button
                    type="button"
                    className="cta-major text-label vw-small px-4 py-2"
                    disabled={busy}
                    onClick={() => void handleRestart(row.seriesSlug, 'day_1')}
                  >
                    READ AGAIN
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <PastoralSwitchModal
        open={switchModalOpen}
        currentSeriesTitle={active?.seriesTitle ?? null}
        currentDayNumber={active?.currentDay}
        newSeriesTitle={
          (pendingSeriesSlug &&
            (SERIES_DATA[pendingSeriesSlug]?.title ?? pendingSeriesSlug)) ||
          ''
        }
        onQueueMonday={() =>
          pendingSeriesSlug &&
          void performStart(pendingSeriesSlug, 'queue_monday', true)
        }
        onReplaceToday={() =>
          pendingSeriesSlug &&
          void performStart(pendingSeriesSlug, 'replace_now', true)
        }
        onCancel={() => {
          setSwitchModalOpen(false)
          setPendingSeriesSlug(null)
        }}
        busy={busy}
      />

      <SignInIntentModal
        open={signInOpen}
        intent={pendingIntent}
        redirectPath="/library"
        onClose={() => {
          setSignInOpen(false)
          setPendingIntent(null)
        }}
      />

      <Toast
        message={toast ?? ''}
        visible={Boolean(toast)}
        onClose={() => setToast(null)}
      />
    </>
  )
}
