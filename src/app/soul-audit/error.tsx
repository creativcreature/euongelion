'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

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
    <div className="min-h-screen bg-page">
      <Navigation />

      <main
        id="main-content"
        className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-6 text-center"
      >
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
      </main>
    </div>
  )
}
