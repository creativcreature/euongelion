'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
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
    <div className="min-h-screen bg-page">
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-label vw-small mb-6 text-gold">SOMETHING BROKE</p>
        <h1 className="text-serif-italic vw-heading-md mb-6">
          This wasn&apos;t supposed to happen.
        </h1>
        <p
          className="vw-body mb-10 text-secondary"
          style={{ maxWidth: '40ch' }}
        >
          We hit an unexpected error. It&apos;s not you — we&apos;re working on
          it.
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
    </div>
  )
}
