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

function seriesSlugFromDevotionalSlug(slug: string): string | null {
  const match = slug.match(/^(.+)-day-\d+$/)
  if (!match) return null
  return match[1] === 'identity-crisis' ? 'identity' : match[1]
}

export default function LibraryView() {
  const router = useRouter()
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
            router.push('/daily-bread')
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
          router.push('/daily-bread')
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
            <p className="vw-body">
              <strong>{active.seriesTitle ?? active.seriesSlug}</strong> — Day{' '}
              {active.currentDay}
            </p>
            <p className="vw-small text-secondary">
              Source: {active.source.replace(/_/g, ' ')}
            </p>
            <div className="library-card-actions">
              <Link
                href="/daily-bread"
                className="cta-major text-label vw-small px-5 py-2"
              >
                OPEN DAILY BREAD
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
            Nothing saved yet &mdash; keep any devotional here with{' '}
            <em>Save this Devotional</em> as you read.
          </p>
        ) : (
          <div className="library-grid">
            {saved.map((item) => {
              const seriesSlug = seriesSlugFromDevotionalSlug(
                item.devotionalSlug,
              )
              const series = seriesSlug ? SERIES_DATA[seriesSlug] : null
              return (
                <div className="library-card" key={item.devotionalSlug}>
                  <p className="vw-small text-secondary">
                    {series?.title ?? 'Devotional'}
                  </p>
                  <p className="vw-body">
                    <Link
                      href={`/devotional/${item.devotionalSlug}`}
                      className="link-highlight"
                    >
                      {item.note ?? item.devotionalSlug.replace(/-/g, ' ')}
                    </Link>
                  </p>
                  <div className="library-card-actions">
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
