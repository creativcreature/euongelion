'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function DevotionalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader />
        <section className="mock-section-center" style={{ minHeight: '320px' }}>
          <p className="text-label mock-kicker">DEVOTIONAL UNAVAILABLE</p>
          <h1 className="mock-title-center">
            We couldn&apos;t load this reading.
          </h1>
          <p className="mock-subcopy-center">
            Try again, or open another series.
          </p>
          <div className="mock-devotional-error-actions">
            <button
              type="button"
              onClick={reset}
              className="mock-btn text-label"
            >
              TRY AGAIN
            </button>
            <Link href="/series" className="mock-reset-btn text-label">
              BROWSE SERIES
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
