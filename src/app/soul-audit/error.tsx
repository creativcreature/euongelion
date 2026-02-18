'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'

export default function SoulAuditError({
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
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="mock-panel">
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-10 text-center">
            <p className="text-label vw-small mb-6 text-gold">SOUL AUDIT</p>
            <h1 className="text-serif-italic vw-heading-md mb-6">
              Something went wrong.
            </h1>
            <p
              className="vw-body mb-10 text-secondary"
              style={{ maxWidth: '40ch' }}
            >
              We couldn&apos;t process your audit. Try again — the questions
              aren&apos;t going anywhere.
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={reset}
                className="bg-[var(--color-fg)] px-8 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                Go Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
