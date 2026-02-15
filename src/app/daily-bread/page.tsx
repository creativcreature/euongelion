'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import DevotionalLibraryRail from '@/components/DevotionalLibraryRail'
import SiteFooter from '@/components/SiteFooter'

type CurrentPayload = {
  hasCurrent?: boolean
  route?: string
}

export default function DailyBreadPage() {
  const searchParams = useSearchParams()
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [currentRoute, setCurrentRoute] = useState<string | null>(null)
  const tab = searchParams.get('tab')
  const initialTab =
    tab === 'bookmarks' ||
    tab === 'chat-notes' ||
    tab === 'favorite-verses' ||
    tab === 'archive'
      ? tab
      : 'archive'

  useEffect(() => {
    let cancelled = false
    async function loadCurrent() {
      try {
        const response = await fetch('/api/soul-audit/current', {
          cache: 'no-store',
        })
        const payload = (await response.json()) as CurrentPayload
        if (
          !cancelled &&
          payload.hasCurrent &&
          typeof payload.route === 'string'
        ) {
          setCurrentRoute(payload.route)
        }
      } catch {
        // no-op
      } finally {
        if (!cancelled) setLoadingCurrent(false)
      }
    }
    void loadCurrent()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader />

        <section
          className="mock-panel border-b"
          style={{ borderColor: 'var(--mock-line, var(--color-border))' }}
        >
          <p className="text-label vw-small mb-2 text-gold">DAILY BREAD</p>
          {loadingCurrent ? (
            <p className="vw-small text-muted">Loading your current path...</p>
          ) : currentRoute ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={currentRoute}
                className="cta-major text-label vw-small px-5 py-2"
              >
                Continue Current Devotional
              </Link>
              <Link
                href="/soul-audit"
                className="text-label vw-small link-highlight"
              >
                Start New Soul Audit
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="vw-small text-muted">
                You do not have an active path yet.
              </p>
              <Link
                href="/soul-audit"
                className="cta-major text-label vw-small px-5 py-2"
              >
                Start Soul Audit
              </Link>
            </div>
          )}
        </section>

        <section className="mock-panel">
          <DevotionalLibraryRail initialTab={initialTab} />
        </section>
        <SiteFooter />
      </main>
    </div>
  )
}
