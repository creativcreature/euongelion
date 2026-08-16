'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import PastoralSwitchModal from './PastoralSwitchModal'
import SignInIntentModal from './SignInIntentModal'
import {
  onAuthRequired,
  useDevotionalLibraryStore,
  type LibraryIntent,
} from '@/stores/devotionalLibraryStore'

/**
 * Series-level start action.
 *
 * Mirrors DevotionalActions but operates on the series as a whole.
 * Founder direction 2026-05-14: "I should be able to start a series
 * just like starting a devotional." Renders at the top of the
 * /series/[slug] page so the start CTA isn't buried behind clicking
 * into Day 1 first.
 *
 * Differences from DevotionalActions:
 *   - No "save this devotional" button — saves are per-day, not
 *     per-series. Save lives inside the reader.
 *   - currentDay always 1 (the series page starts the whole arc).
 *   - On success, navigates to /daily-bread (same as the devotional
 *     bar's replace_now path).
 */

interface SeriesActionsProps {
  seriesSlug: string
  seriesTitle: string
  /** Used by the sign-in flow to bring the user back here after auth. */
  redirectPath: string
}

function formatStartsAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export default function SeriesActions({
  seriesSlug,
  seriesTitle,
  redirectPath,
}: SeriesActionsProps) {
  const router = useRouter()
  const hydrate = useDevotionalLibraryStore((s) => s.hydrate)
  const hydrated = useDevotionalLibraryStore((s) => s.hydrated)
  const active = useDevotionalLibraryStore((s) => s.active)
  const scheduledSwap = useDevotionalLibraryStore((s) => s.scheduledSwap)
  const start = useDevotionalLibraryStore((s) => s.start)

  const [switchModalOpen, setSwitchModalOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [pendingIntent, setPendingIntent] = useState<LibraryIntent | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    const off = onAuthRequired((intent) => {
      setPendingIntent(intent)
      setSignInOpen(true)
    })
    return off
  }, [])

  const isActiveSameSeries = active !== null && active.seriesSlug === seriesSlug
  const isQueuedSameSeries =
    scheduledSwap !== null && scheduledSwap.seriesSlug === seriesSlug

  const performStart = useCallback(
    async (mode: 'replace_now' | 'queue_monday', confirm: boolean) => {
      setBusy(true)
      try {
        const result = await start(seriesSlug, mode, {
          confirm,
          currentDay: 1,
        })
        if (result.ok) {
          setSwitchModalOpen(false)
          if (mode === 'queue_monday') {
            setToast(`Queued — ${seriesTitle} begins Monday.`)
          } else {
            setToast(`Started ${seriesTitle}.`)
            router.push('/today')
          }
          return
        }
        if ('needsConfirm' in result && result.needsConfirm) {
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
    [seriesSlug, seriesTitle, start, router],
  )

  const handleStartClick = useCallback(async () => {
    if (isActiveSameSeries) {
      router.push('/today')
      return
    }
    await performStart('replace_now', false)
  }, [isActiveSameSeries, performStart, router])

  const handleSignInClose = useCallback(() => {
    setSignInOpen(false)
    setPendingIntent(null)
  }, [])

  const startLabel = isActiveSameSeries
    ? 'OPEN IN DAILY BREAD'
    : isQueuedSameSeries
      ? `QUEUED FOR ${scheduledSwap ? formatStartsAt(scheduledSwap.startsAt).toUpperCase() : 'MONDAY'}`
      : 'START THIS SERIES'

  return (
    <section
      className="series-actions-bar mb-6 border px-5 py-4"
      style={{ borderColor: 'var(--color-border)' }}
      aria-label="Series library actions"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="cta-major text-label vw-small px-5 py-2"
          onClick={handleStartClick}
          disabled={busy || isQueuedSameSeries}
          data-state={
            isActiveSameSeries
              ? 'active'
              : isQueuedSameSeries
                ? 'queued'
                : 'idle'
          }
        >
          {startLabel}
        </button>
        {hydrated && active && active.seriesSlug !== seriesSlug && (
          <p className="vw-small text-secondary">
            Currently active:{' '}
            <Link href="/daily-bread" className="link-highlight">
              {active.seriesTitle ?? active.seriesSlug}
            </Link>{' '}
            (Day {active.currentDay})
          </p>
        )}
      </div>

      <PastoralSwitchModal
        open={switchModalOpen}
        currentSeriesTitle={active?.seriesTitle ?? null}
        currentDayNumber={active?.currentDay}
        newSeriesTitle={seriesTitle}
        onQueueMonday={() => void performStart('queue_monday', true)}
        onReplaceToday={() => void performStart('replace_now', true)}
        onCancel={() => setSwitchModalOpen(false)}
        busy={busy}
      />

      <SignInIntentModal
        open={signInOpen}
        intent={pendingIntent}
        redirectPath={redirectPath}
        onClose={handleSignInClose}
      />

      <Toast
        message={toast ?? ''}
        visible={Boolean(toast)}
        onClose={() => setToast(null)}
      />
    </section>
  )
}
