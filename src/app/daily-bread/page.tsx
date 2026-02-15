'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import DevotionalLibraryRail from '@/components/DevotionalLibraryRail'
import SiteFooter from '@/components/SiteFooter'
import WalkthroughModal from '@/components/WalkthroughModal'

type CurrentPayload = {
  hasCurrent?: boolean
  route?: string
}

const WALKTHROUGH_STORAGE_KEY = 'euangelion-walkthrough-complete-v1'

const WALKTHROUGH_STEPS = [
  {
    title: 'Continue Your Day',
    body: 'Use the top panel to jump back into your current devotional day instantly.',
  },
  {
    title: 'Use The Left Rail',
    body: 'Open bookmarks, highlights, notes, chat history, and archive from the library rail.',
  },
  {
    title: 'Keep Your Rhythm',
    body: 'Return daily and pick up where you left off. Your active path stays ready.',
  },
]

export default function DailyBreadPage() {
  const searchParams = useSearchParams()
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [currentRoute, setCurrentRoute] = useState<string | null>(null)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const tab = searchParams.get('tab')
  const tutorialRequested = searchParams.get('tutorial') === '1'
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (tutorialRequested) {
      setShowWalkthrough(true)
      return
    }
    const completed = window.localStorage.getItem(WALKTHROUGH_STORAGE_KEY)
    if (!completed) {
      setShowWalkthrough(true)
    }
  }, [tutorialRequested])

  return (
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader />

        <section
          className="mock-panel border-b"
          style={{ borderColor: 'var(--mock-line, var(--color-border))' }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-label vw-small text-gold">DAILY BREAD</p>
            <button
              type="button"
              className="text-label vw-small link-highlight"
              onClick={() => setShowWalkthrough(true)}
            >
              Replay Tutorial
            </button>
          </div>
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
      <WalkthroughModal
        open={showWalkthrough}
        steps={WALKTHROUGH_STEPS}
        onClose={(completed) => {
          if (completed && typeof window !== 'undefined') {
            window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, '1')
          }
          setShowWalkthrough(false)
        }}
      />
    </div>
  )
}
