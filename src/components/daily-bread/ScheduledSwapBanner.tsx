'use client'

import { useDevotionalLibraryStore } from '@/stores/devotionalLibraryStore'
import { useState } from 'react'

function formatStartsAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export default function ScheduledSwapBanner() {
  const scheduledSwap = useDevotionalLibraryStore((s) => s.scheduledSwap)
  const clearScheduledSwap = useDevotionalLibraryStore(
    (s) => s.clearScheduledSwap,
  )
  const [busy, setBusy] = useState(false)

  if (!scheduledSwap) return null

  return (
    <aside className="daily-bread-swap-banner" aria-live="polite">
      <div>
        <p className="text-label vw-small text-gold">QUEUED FOR MONDAY</p>
        <p className="vw-small text-secondary">
          <strong>
            {scheduledSwap.seriesTitle ?? scheduledSwap.seriesSlug}
          </strong>{' '}
          begins {formatStartsAt(scheduledSwap.startsAt)}.
        </p>
      </div>
      <button
        type="button"
        className="text-label vw-small link-highlight"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void clearScheduledSwap().finally(() => setBusy(false))
        }}
      >
        CANCEL
      </button>
    </aside>
  )
}
