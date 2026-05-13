'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { SERIES_DATA } from '@/data/series'

interface DevotionalActionsProps {
  devotionalSlug: string
  seriesSlug: string | null
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

export default function DevotionalActions({
  devotionalSlug,
  seriesSlug,
  redirectPath,
}: DevotionalActionsProps) {
  const router = useRouter()
  const hydrate = useDevotionalLibraryStore((s) => s.hydrate)
  const hydrated = useDevotionalLibraryStore((s) => s.hydrated)
  const active = useDevotionalLibraryStore((s) => s.active)
  const scheduledSwap = useDevotionalLibraryStore((s) => s.scheduledSwap)
  const saved = useDevotionalLibraryStore((s) => s.saved)
  const save = useDevotionalLibraryStore((s) => s.save)
  const unsave = useDevotionalLibraryStore((s) => s.unsave)
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

  const isSaved = useMemo(
    () => saved.some((s) => s.devotionalSlug === devotionalSlug),
    [saved, devotionalSlug],
  )

  const newSeriesTitle = seriesSlug
    ? (SERIES_DATA[seriesSlug]?.title ?? seriesSlug)
    : 'this devotional'

  const isActiveSameSeries =
    active !== null && seriesSlug !== null && active.seriesSlug === seriesSlug

  const isQueuedSameSeries =
    scheduledSwap !== null &&
    seriesSlug !== null &&
    scheduledSwap.seriesSlug === seriesSlug

  const handleSave = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      if (isSaved) {
        const result = await unsave(devotionalSlug)
        if (result.ok) setToast('Removed from your library.')
      } else {
        const result = await save(devotionalSlug)
        if (result.ok) setToast('Saved to your library.')
      }
    } finally {
      setBusy(false)
    }
  }, [busy, isSaved, save, unsave, devotionalSlug])

  const performStart = useCallback(
    async (mode: 'replace_now' | 'queue_monday', confirm: boolean) => {
      if (!seriesSlug) return
      setBusy(true)
      try {
        const result = await start(seriesSlug, mode, { confirm })
        if (result.ok) {
          setSwitchModalOpen(false)
          if (mode === 'queue_monday') {
            setToast(`Queued — ${newSeriesTitle} begins Monday.`)
          } else {
            setToast(`Switched to ${newSeriesTitle}.`)
            router.push('/daily-bread')
          }
          return
        }
        if ('needsConfirm' in result && result.needsConfirm) {
          setSwitchModalOpen(true)
        }
      } finally {
        setBusy(false)
      }
    },
    [seriesSlug, start, newSeriesTitle, router],
  )

  const handleStartClick = useCallback(async () => {
    if (!seriesSlug) return
    if (isActiveSameSeries) {
      router.push('/daily-bread')
      return
    }
    // First attempt without confirm — server tells us if we need to ask.
    await performStart('replace_now', false)
  }, [seriesSlug, isActiveSameSeries, performStart, router])

  const handleSignInClose = useCallback(() => {
    setSignInOpen(false)
    setPendingIntent(null)
  }, [])

  if (!seriesSlug) {
    // No parent series mapping (shouldn't normally happen — but guard).
    return null
  }

  const saveLabel = isSaved ? 'SAVED' : 'SAVE THIS DEVOTIONAL'
  const startLabel = isActiveSameSeries
    ? 'OPEN IN DAILY BREAD'
    : isQueuedSameSeries
      ? `QUEUED FOR ${scheduledSwap ? formatStartsAt(scheduledSwap.startsAt).toUpperCase() : 'MONDAY'}`
      : 'START THIS DEVOTIONAL'

  return (
    <section
      className="devotional-actions-bar mb-6 border px-5 py-4"
      style={{ borderColor: 'var(--color-border)' }}
      aria-label="Devotional library actions"
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
        <button
          type="button"
          className="text-label vw-small link-highlight px-2 py-1"
          onClick={handleSave}
          disabled={busy}
          aria-pressed={isSaved}
        >
          {saveLabel}
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
        newSeriesTitle={newSeriesTitle}
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
