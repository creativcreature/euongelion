'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

type Recovery = {
  kicker: string
  heading: string
  body: string
  secondaryHref: string
  secondaryLabel: string
}

/**
 * Route-specific recovery copy (F-038: Help/recovery states). The root
 * error boundary catches failures from routes that have no nearer
 * `error.tsx`. A single generic "go home" dead-ends the user, so we
 * branch on the current path to offer an action that keeps them inside
 * the flow they were already in. The "Try Again" reset button is shown
 * everywhere; only the secondary, route-aware escape hatch changes.
 */
function recoveryFor(pathname: string | null): Recovery {
  const path = pathname || '/'

  if (path.startsWith('/series') || path.startsWith('/library')) {
    return {
      kicker: 'SERIES UNAVAILABLE',
      heading: "We couldn't open this series.",
      body: 'The reading library is still here. Try again, or browse the full collection.',
      secondaryHref: '/series',
      secondaryLabel: 'Browse Series',
    }
  }

  if (
    path.startsWith('/daily-bread') ||
    path.startsWith('/today') ||
    path.startsWith('/my-devotional')
  ) {
    // The canonical resolver reports `unavailable` when it could not READ the
    // reader's current devotional. That is not the same as having none, and the
    // copy must not imply anything was lost or changed (founder, 2026-07-28).
    return {
      kicker: 'NOT CONFIRMED',
      heading: "We couldn't confirm your current devotional.",
      body: 'Your selection has not been changed. Try again, or open your saved readings.',
      secondaryHref: '/library?tab=bookmarks',
      secondaryLabel: 'Open Saved',
    }
  }

  if (path.startsWith('/settings') || path.startsWith('/privacy')) {
    return {
      kicker: 'SETTINGS UNAVAILABLE',
      heading: "We couldn't load this page.",
      body: 'Your preferences are unchanged. Try again, or return home.',
      secondaryHref: '/',
      secondaryLabel: 'Go Home',
    }
  }

  return {
    kicker: 'SOMETHING BROKE',
    heading: "This wasn't supposed to happen.",
    body: "We hit an unexpected error. It's not you, we're working on it.",
    secondaryHref: '/',
    secondaryLabel: 'Go Home',
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const recovery = useMemo(() => recoveryFor(pathname), [pathname])

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mock-home min-h-screen">
      <main className="mock-paper min-h-screen">
        <EuangelionShellHeader />
        <section className="mock-panel shell-content-pad">
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
            <p className="text-label vw-small mb-6 text-gold">
              {recovery.kicker}
            </p>
            <h1 className="text-serif-italic vw-heading-md mb-6">
              {recovery.heading}
            </h1>
            <p
              className="vw-body mb-10 text-secondary"
              style={{ maxWidth: '40ch' }}
            >
              {recovery.body}
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={reset}
                className="bg-[var(--color-fg)] px-8 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
              >
                Try Again
              </button>
              <Link
                href={recovery.secondaryHref}
                className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                {recovery.secondaryLabel}
              </Link>
            </div>
            {error.digest && (
              <p className="vw-small mt-8 text-muted">
                Reference: {error.digest}
              </p>
            )}
          </div>
        </section>
        <SiteFooter />
      </main>
    </div>
  )
}
